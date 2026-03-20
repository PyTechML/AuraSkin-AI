require("dotenv/config");
const { createClient } = require("@supabase/supabase-js");

async function main() {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env");
    process.exit(1);
  }

  const supabase = createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const run = async (label, query) => {
    const { data, error } = await query;
    console.log("\n==", label, "==");
    if (error) {
      console.error("error:", error.message);
      if (error.details) console.error("details:", error.details);
      if (error.hint) console.error("hint:", error.hint);
      process.exitCode = 1;
      return null;
    }
    console.log("rows=", Array.isArray(data) ? data.length : 0);
    console.log(data);
    return data || [];
  };

  const productsSample = await run(
    "products sample (select *, limit 5)",
    supabase.from("products").select("*").limit(5),
  );
  const inventorySample = await run(
    "inventory sample (select *, limit 5)",
    supabase.from("inventory").select("*").limit(5),
  );

  const { count: productsCount, error: productsCountErr } = await supabase
    .from("products")
    .select("*", { count: "exact", head: true });
  console.log("\n== products count ==");
  if (productsCountErr) console.error("error:", productsCountErr.message);
  else console.log("count=", productsCount);

  const { count: inventoryCount, error: inventoryCountErr } = await supabase
    .from("inventory")
    .select("*", { count: "exact", head: true });
  console.log("\n== inventory count ==");
  if (inventoryCountErr) console.error("error:", inventoryCountErr.message);
  else console.log("count=", inventoryCount);

  // Try the exact columns required by the pipeline; if missing, we’ll see it explicitly.
  const products = await run(
    "products required cols (id, name, approval_status, store_id)",
    supabase.from("products").select("id,name,approval_status,store_id").order("id"),
  );
  const inventory = await run(
    "inventory required cols (product_id, status, store_id)",
    supabase.from("inventory").select("product_id,status,store_id").order("product_id"),
  );

  if (!products || !inventory) return;

  // In-memory verification to mirror join checks (proof output).
  const invByProductId = new Map(inventory.map((r) => [r.product_id, r]));
  const mismatches = [];
  for (const p of products) {
    const i = invByProductId.get(p.id);
    if (!i) {
      mismatches.push({ product_id: p.id, issue: "missing_inventory_row", product_store_id: p.store_id });
      continue;
    }
    if (i.store_id !== p.store_id) {
      mismatches.push({
        product_id: p.id,
        issue: "store_id_mismatch",
        product_store_id: p.store_id,
        inventory_store_id: i.store_id,
      });
    }
  }

  console.log("\n== integrity_check (products LEFT JOIN inventory) ==");
  console.log("products=", products.length, "inventory=", inventory.length);
  console.log("mismatches=", mismatches.length);
  if (mismatches.length) console.log(mismatches);

  console.log("\n== approval_alignment (products JOIN inventory) ==");
  const align = [];
  for (const p of products) {
    const i = invByProductId.get(p.id);
    if (!i) continue;
    align.push({
      id: p.id,
      name: p.name,
      approval_status: p.approval_status,
      inventory_status: i.status,
    });
  }
  console.log("rows=", align.length);
  console.log(align);
}

main().catch((e) => {
  console.error(e && e.message ? e.message : e);
  process.exit(1);
});

