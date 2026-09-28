// postgres-js sends unknown URL params to the server as settings, which
// rejects libpq-only ones like sslrootcert=system.
const LIBPQ_ONLY = ["sslrootcert", "sslcert", "sslkey", "sslcrl", "sslpassword", "channel_binding", "gssencmode", "target_session_attrs"];

export function connection(raw: string): { url: string; ssl?: "verify-full" } {
  const u = new URL(raw);
  const verify = u.searchParams.get("sslrootcert") === "system" || u.searchParams.get("sslmode") === "verify-full";
  for (const k of LIBPQ_ONLY) u.searchParams.delete(k);
  return verify ? { url: u.toString(), ssl: "verify-full" } : { url: u.toString() };
}
