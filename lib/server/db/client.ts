import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { env } from "../env";
import * as schema from "./schema";
import { connection } from "./url";

declare global {
  var __shrinkSql: ReturnType<typeof postgres> | undefined;
}

const MAX = process.env.NODE_ENV === "production" ? 5 : 10;
const IDLE_TIMEOUT = 20;

const { url, ...tls } = connection(env.DATABASE_URL);
const connect = () =>
  postgres(url, {
    ...tls,
    max: MAX,
    // Pooled connections (pgbouncer, Neon) don't support prepared statements.
    prepare: false,
    idle_timeout: IDLE_TIMEOUT,
    max_lifetime: 60 * 5,
    connect_timeout: 10,
  });

let sql = globalThis.__shrinkSql ?? connect();
if (process.env.NODE_ENV !== "production") globalThis.__shrinkSql = sql;

// Vercel freezes the function between requests, so idle_timeout never fires
// and the server (or pooler) drops sockets underneath us; the next query on one
// dies with ECONNRESET. If the pool has sat idle longer than idle_timeout, every
// connection in it should already be gone, so swap in a fresh pool rather than
// gamble on the old sockets.
let inFlight = 0;
let lastSettled = Date.now();

function pool() {
  if (inFlight === 0 && Date.now() - lastSettled > IDLE_TIMEOUT * 1000) {
    const stale = sql;
    sql = connect();
    // drizzle() patched these on the first pool; carry them over.
    Object.assign(sql.options.parsers, stale.options.parsers);
    Object.assign(sql.options.serializers, stale.options.serializers);
    if (process.env.NODE_ENV !== "production") globalThis.__shrinkSql = sql;
    void stale.end({ timeout: 0 }).catch(() => {});
  }
  return sql;
}

async function track<T>(run: () => Promise<T>): Promise<T> {
  inFlight++;
  try {
    return await run();
  } finally {
    inFlight--;
    lastSettled = Date.now();
  }
}

// A socket can still die mid-request (pooler restart, network blip). Retry only
// where it can't double-apply anything: plain SELECTs, and transactions whose
// callback never ran. Every pooled socket may be dead, hence MAX + 1 attempts.
const STALE = new Set(["ECONNRESET", "EPIPE", "ETIMEDOUT", "CONNECTION_CLOSED", "CONNECTION_ENDED", "CONNECTION_DESTROYED"]);
const isStale = (e: unknown) => STALE.has((e as { code?: string } | null)?.code ?? "");
const isRead = (query: string) => /^\s*select\b/i.test(query);

async function withRetry<T>(run: (sql: Sql) => Promise<T>, canRetry: () => boolean): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    const sql = pool();
    try {
      return await track(() => run(sql));
    } catch (e) {
      if (attempt > MAX || !isStale(e) || !canRetry()) throw e;
    }
  }
}

type Sql = typeof sql;
type Unsafe = Sql["unsafe"];
type Begin = (...args: unknown[]) => Promise<unknown>;

const client = new Proxy(sql, {
  get(_, prop) {
    if (prop === "unsafe") {
      // Drizzle either awaits the query or calls .values() on it; postgres-js
      // queries are lazy, so each attempt builds a new one.
      return (...args: Parameters<Unsafe>) => {
        const make = (sql: Sql) => sql.unsafe(...args);
        const canRetry = () => isRead(args[0]);
        return {
          then: (ok: (v: unknown) => unknown, fail: (e: unknown) => unknown) =>
            withRetry(make, canRetry).then(ok, fail),
          values: () => withRetry((sql) => make(sql).values(), canRetry),
        };
      };
    }
    if (prop === "begin") {
      return (...args: unknown[]) => {
        const fn = args.at(-1) as (tx: unknown) => unknown;
        let started = false;
        const wrapped = [...args.slice(0, -1), (tx: unknown) => ((started = true), fn(tx))];
        return withRetry(
          (sql) => (sql.begin as unknown as Begin)(...wrapped),
          () => !started,
        );
      };
    }
    return Reflect.get(pool(), prop);
  },
});

export const db = drizzle(client, { schema });
export type Db = typeof db;
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
