import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

import { connection } from "./url";

const raw = process.env.DATABASE_URL;
if (!raw) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const { url, ...tls } = connection(raw);
const sql = postgres(url, { ...tls, max: 1, prepare: false, onnotice: () => {} });
try {
  await migrate(drizzle(sql), { migrationsFolder: "./drizzle" });
  console.log("migrations applied");
} finally {
  await sql.end();
}
