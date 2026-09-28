import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { env } from "../env";
import * as schema from "./schema";

declare global {
  var __shrinkSql: ReturnType<typeof postgres> | undefined;
}

const sql =
  globalThis.__shrinkSql ??
  postgres(env.DATABASE_URL, {
    max: process.env.NODE_ENV === "production" ? 5 : 10,
    // Pooled connections (pgbouncer, Neon) don't support prepared statements.
    prepare: false,
    idle_timeout: 20,
    connect_timeout: 10,
  });
if (process.env.NODE_ENV !== "production") globalThis.__shrinkSql = sql;

export const db = drizzle(sql, { schema });
export type Db = typeof db;
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
