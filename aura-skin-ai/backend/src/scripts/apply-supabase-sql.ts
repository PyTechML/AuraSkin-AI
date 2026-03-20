import * as fs from "node:fs";
import * as path from "node:path";
import "dotenv/config";
import { Client } from "pg";

function usage(): never {
  // Intentionally minimal; script is for internal use.
  // eslint-disable-next-line no-console
  console.error("Usage: ts-node src/scripts/apply-supabase-sql.ts <path-to-sql-file>");
  process.exit(1);
}

function normalizeConnString(raw: string): string {
  // Some env files store the password wrapped in square brackets to avoid dotenv parsing issues:
  // postgresql://postgres:[p@ss(w)rd]@db.<ref>.supabase.co:5432/postgres
  // Convert to a proper URL-encoded password form.
  const m = raw.match(/^postgresql:\/\/([^:]+):\[(.+)\]@(.+)$/);
  if (!m) return raw;
  const user = m[1];
  const password = m[2];
  const rest = m[3];
  return `postgresql://${user}:${encodeURIComponent(password)}@${rest}`;
}

async function main() {
  const fileArg = process.argv[2];
  if (!fileArg) usage();
  const filePath = path.isAbsolute(fileArg) ? fileArg : path.join(process.cwd(), fileArg);
  if (!fs.existsSync(filePath)) {
    // eslint-disable-next-line no-console
    console.error(`SQL file not found: ${filePath}`);
    process.exit(1);
  }
  const sql = fs.readFileSync(filePath, "utf8");
  if (!sql.trim()) {
    // eslint-disable-next-line no-console
    console.error("SQL file is empty.");
    process.exit(1);
  }

  const rawConn = process.env.SUPABASE_STORAGE_CONNECTION_STRING;
  if (!rawConn) {
    // eslint-disable-next-line no-console
    console.error("Missing env: SUPABASE_STORAGE_CONNECTION_STRING");
    process.exit(1);
  }
  const conn = normalizeConnString(rawConn);
  const client = new Client({ connectionString: conn, ssl: { rejectUnauthorized: false } });

  await client.connect();
  try {
    await client.query("begin");
    await client.query(sql);
    await client.query("commit");
  } catch (e) {
    await client.query("rollback").catch(() => {});
    throw e;
  } finally {
    await client.end().catch(() => {});
  }
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});

