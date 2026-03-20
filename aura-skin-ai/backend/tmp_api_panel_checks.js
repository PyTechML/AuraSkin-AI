require("dotenv/config");
const { spawn } = require("node:child_process");

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchJson(url, opts = {}) {
  const res = await fetch(url, {
    ...opts,
    headers: { Accept: "application/json", ...(opts.headers || {}) },
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {}
  return { status: res.status, text, json };
}

async function login(baseUrl, email, password, requested_role) {
  const resp = await fetchJson(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, requested_role }),
  });
  console.log("\n== login ==", { email, requested_role, status: resp.status });
  console.log(resp.json ?? resp.text);
  const token =
    resp.json?.data?.accessToken ??
    resp.json?.data?.access_token ??
    resp.json?.data?.session?.access_token;
  return { token, resp };
}

async function main() {
  const port = process.env.PORT || "3001";
  const baseUrl = `http://127.0.0.1:${port}`;

  console.log("Starting backend (dist/main.js) for panel checks...");
  const child = spawn(process.execPath, ["dist/main.js"], {
    stdio: ["ignore", "pipe", "pipe"],
    env: process.env,
  });

  let out = "";
  const onData = (buf) => {
    const s = buf.toString("utf8");
    out += s;
    process.stdout.write(s);
  };
  child.stdout.on("data", onData);
  child.stderr.on("data", onData);

  const startedAt = Date.now();
  while (Date.now() - startedAt < 15000) {
    if (out.includes("Backend listening on port") || out.includes("Nest application successfully started")) break;
    await sleep(250);
  }

  // Public products (user panel)
  console.log("\n== GET /api/products ==");
  const products = await fetchJson(`${baseUrl}/api/products`);
  console.log("status=", products.status);
  console.log(products.json ?? products.text);

  // Store panel: login and fetch store inventory
  const storeLogin = await login(baseUrl, "store@auraskin.ai", process.env.SEED_STORE_PASSWORD, "store");
  if (storeLogin.token) {
    console.log("\n== GET /api/partner/store/inventory ==");
    const inv = await fetchJson(`${baseUrl}/api/partner/store/inventory`, {
      headers: { Authorization: `Bearer ${storeLogin.token}` },
    });
    console.log("status=", inv.status);
    console.log(inv.json ?? inv.text);
  } else {
    console.log("\nStore login failed; cannot call /api/partner/store/inventory with auth.");
  }

  // Admin panel: login and fetch admin products
  const adminLogin = await login(baseUrl, "admin@auraskin.ai", process.env.SEED_MASTER_ADMIN_PASSWORD, "admin");
  if (adminLogin.token) {
    console.log("\n== GET /api/admin/products ==");
    const adminProducts = await fetchJson(`${baseUrl}/api/admin/products`, {
      headers: { Authorization: `Bearer ${adminLogin.token}` },
    });
    console.log("status=", adminProducts.status);
    console.log(adminProducts.json ?? adminProducts.text);
  } else {
    console.log("\nAdmin login failed; cannot call /api/admin/products with auth.");
  }

  child.kill();
  await sleep(300);
}

main().catch((e) => {
  console.error(e && e.message ? e.message : e);
  process.exit(1);
});

