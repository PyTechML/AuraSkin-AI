require("dotenv/config");
const { Client } = require("pg");
const dns = require("node:dns").promises;
const { URL } = require("node:url");

function normalizeConnString(raw) {
  const m = raw.match(/^postgresql:\/\/([^:]+):\[(.+)\]@(.+)$/);
  if (!m) return raw;
  const user = m[1];
  const password = m[2];
  const rest = m[3];
  return `postgresql://${user}:${encodeURIComponent(password)}@${rest}`;
}

async function main() {
  const raw = process.env.SUPABASE_STORAGE_CONNECTION_STRING;
  if (!raw) {
    console.error("Missing SUPABASE_STORAGE_CONNECTION_STRING");
    process.exit(1);
  }

  const normalized = normalizeConnString(raw);
  const u = new URL(normalized);

  // Supabase DB host may resolve only to IPv6 in some networks.
  // Resolve explicitly and connect via literal address, but keep TLS SNI as hostname.
  let hostForConnect = u.hostname;
  if (!/^\d+\.\d+\.\d+\.\d+$/.test(u.hostname) && !u.hostname.includes(":")) {
    const aaaa = await dns.resolve6(u.hostname);
    if (Array.isArray(aaaa) && aaaa.length > 0) {
      hostForConnect = aaaa[0];
      console.log("Resolved IPv6:", u.hostname, "->", hostForConnect);
    }
  }

  const client = new Client({
    host: hostForConnect,
    port: u.port ? Number(u.port) : 5432,
    database: u.pathname.replace(/^\//, "") || "postgres",
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    ssl: { rejectUnauthorized: false, servername: u.hostname },
  });

  await client.connect();
  try {
    const run = async (sql) => {
      const res = await client.query(sql);
      console.log("\nSQL:", sql.replace(/\s+/g, " ").trim());
      console.log("rows=", res.rowCount);
      console.log(res.rows);
    };

    await run("SELECT id, name, approval_status, store_id FROM products ORDER BY id");
    await run("SELECT product_id, status, store_id FROM inventory ORDER BY product_id");
    await run(
      "SELECT p.id AS product_id, p.store_id AS product_store_id, i.product_id, i.store_id AS inventory_store_id FROM products p LEFT JOIN inventory i ON p.id = i.product_id ORDER BY p.id",
    );
  } finally {
    await client.end().catch(() => {});
  }
}

main().catch((e) => {
  console.error(e && e.message ? e.message : e);
  process.exit(1);
});

