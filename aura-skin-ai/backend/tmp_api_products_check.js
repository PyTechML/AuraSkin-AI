require("dotenv/config");
const { spawn } = require("node:child_process");

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {}
  return { status: res.status, text, json };
}

async function main() {
  const port = process.env.PORT || "3001";
  const url = `http://127.0.0.1:${port}/api/products`;

  console.log("Starting backend (dist/main.js) for one-shot check...");
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

  // Wait for server to be ready (best-effort)
  const startedAt = Date.now();
  while (Date.now() - startedAt < 15000) {
    if (out.includes("Backend listening on port") || out.includes("Nest application successfully started")) break;
    await sleep(250);
  }

  console.log("\nRequesting:", url);
  const resp = await fetchJson(url);
  console.log("HTTP", resp.status);
  if (!resp.json) {
    console.log("Non-JSON response:");
    console.log(resp.text);
  } else {
    const payload = resp.json;
    const data = payload?.data;
    const products = Array.isArray(data) ? data : Array.isArray(payload?.products) ? payload.products : data?.products;
    console.log("Parsed products array?", Array.isArray(products));
    console.log("products.length=", Array.isArray(products) ? products.length : "N/A");
    if (Array.isArray(products)) console.log("ids=", products.map((p) => p?.id));
    console.log("raw_response=", payload);
  }

  child.kill();
  await sleep(300);
}

main().catch((e) => {
  console.error(e && e.message ? e.message : e);
  process.exit(1);
});

