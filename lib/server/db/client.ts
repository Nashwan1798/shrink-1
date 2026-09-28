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

const { url, ...tls } = connection(env.DATABASE_URL);
const sql =
  globalThis.__shrinkSql ??
  postgres(url, {
    ...tls,
    max: MAX,
    // Pooled connections (pgbouncer, Neon) don't support prepared statements.
    prepare: false,
    idle_timeout: 20,
    max_lifetime: 60 * 5,
    connect_timeout: 10,
  });
if (process.env.NODE_ENV !== "production") globalThis.__shrinkSql = sql;

// Vercel freezes the function between requests, so idle_timeout never fires
// and the server (or pooler) drops the socket underneath us. The next query on
// that socket dies with ECONNRESET before it reaches Postgres. Retry on a fresh
// connection; every pooled socket may be stale, hence up to MAX + 1 attempts.
const STALE = new Set(["ECONNRESET", "EPIPE", "ETIMEDOUT", "CONNECTION_CLOSED", "CONNECTION_ENDED", "CONNECTION_DESTROYED"]);
const isStale = (e: unknown) => STALE.has((e as { code?: string } | null)?.code ?? "");

async function withRetry<T>(run: () => Promise<T>, canRetry: () => boolean = () => true): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await run();
    } catch (e) {
      if (attempt > MAX || !isStale(e) || !canRetry()) throw e;
    }
  }
}

type Unsafe = typeof sql.unsafe;
type Begin = (...args: unknown[]) => Promise<unknown>;

const client = new Proxy(sql, {
  get(target, prop, receiver) {
    if (prop === "unsafe") {
      // Drizzle either awaits the query or calls .values() on it; postgres-js
      // queries are lazy, so each attempt builds a new one.
      return (...args: Parameters<Unsafe>) => {
        const make = () => target.unsafe(...args);
        return {
          then: (ok: (v: unknown) => unknown, fail: (e: unknown) => unknown) => withRetry(() => make()).then(ok, fail),
          values: () => withRetry(() => make().values()),
        };
      };
    }
    if (prop === "begin") {
      // Only retry if the callback never ran, i.e. BEGIN itself hit the dead
      // socket; a failure mid-transaction may follow side effects.
      return (...args: unknown[]) => {
        const fn = args.at(-1) as (tx: unknown) => unknown;
        let started = false;
        const wrapped = [...args.slice(0, -1), (tx: unknown) => ((started = true), fn(tx))];
        return withRetry(
          () => (target.begin as unknown as Begin)(...wrapped),
          () => !started,
        );
      };
    }
    return Reflect.get(target, prop, receiver);
  },
});

export const db = drizzle(client, { schema });
export type Db = typeof db;
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
