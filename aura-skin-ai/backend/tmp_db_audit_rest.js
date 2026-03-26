require("dotenv/config");
const { createClient } = require("@supabase/supabase-js");

async function main() {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
    process.exit(1);
  }

  const supabase = createClient(url, serviceRoleKey, { auth: { persistSession: false } });

  const tablesToScan = [
    "profiles",
    "store_profiles",
    "dermatologist_profiles",
    "products",
    "inventory",
    "orders",
    "order_items",
    "consultations",
    "patients",
    "reports",
    "earnings",
    "availability_slots",
    "sessions",
    "notifications",
    "feature_flags",
    "audit_logs"
  ];

  const dbState = {};

  console.log("=== SCHEMA & METADATA EXTRACTION ===");
  for (const table of tablesToScan) {
    try {
      const { data, count, error } = await supabase.from(table).select("*");
      if (error) {
        console.log(`[${table}] Error or missing table: ${error.message}`);
      } else {
        dbState[table] = data || [];
        console.log(`[${table}] Count: ${data.length}`);
      }
    } catch (e) {
      console.log(`[${table}] Exception fetching: ${e.message}`);
    }
  }

  console.log("\n=== CROSS-ENTITY RELATIONAL ANOMALY SCAN ===");
  const anomalies = [];

  // 1. Users <-> Profiles (Wait, roles usually in profiles, but let's check store_profiles -> profiles map)
  if (dbState.store_profiles && dbState.profiles) {
    dbState.store_profiles.forEach(sp => {
      const parentUser = dbState.profiles.find(p => p.id === sp.user_id || p.id === sp.id); // checking common PKs
      if (!parentUser) anomalies.push(`ORPHAN STORE: store_profile ${sp.id} has no valid auth/profile match.`);
    });
  }

  // 2. Inventory -> Products
  if (dbState.inventory && dbState.products) {
    dbState.inventory.forEach(inv => {
      if (!dbState.products.find(p => p.id === inv.product_id)) {
        anomalies.push(`ORPHAN INVENTORY: inv ${inv.id} references missing product_id ${inv.product_id}`);
      }
      if (!dbState.store_profiles?.find(s => s.id === inv.store_id)) {
        anomalies.push(`ORPHAN INVENTORY: inv ${inv.id} references missing store_id ${inv.store_id}`);
      }
    });
  }

  // 3. Products -> Stores
  if (dbState.products && dbState.store_profiles) {
    dbState.products.forEach(prod => {
      if (!dbState.store_profiles.find(s => s.id === prod.store_id)) {
        anomalies.push(`ORPHAN PRODUCT: product ${prod.id} references missing store_id ${prod.store_id}`);
      }
    });
  }

  // 4. Orders -> Users / Stores
  if (dbState.orders) {
    dbState.orders.forEach(order => {
      if (dbState.profiles && !dbState.profiles.find(u => u.id === order.user_id)) {
        anomalies.push(`ORPHAN ORDER: order ${order.id} belongs to missing user ${order.user_id}`);
      }
      if (dbState.store_profiles && !dbState.store_profiles.find(s => s.id === order.store_id)) {
        anomalies.push(`ORPHAN ORDER: order ${order.id} belongs to missing store ${order.store_id}`);
      }
    });
  }

  // 5. Consultations -> Doctor / Patient
  if (dbState.consultations) {
    dbState.consultations.forEach(cons => {
      if (dbState.profiles && !dbState.profiles.find(u => u.id === cons.user_id)) {
        anomalies.push(`ORPHAN CONSULTATION: consultation ${cons.id} assigned to missing user ${cons.user_id}`);
      }
      // Assuming doctor_id maps to profiles table if dermatologist_profiles is missing
      if (dbState.profiles && !dbState.profiles.find(u => u.id === cons.doctor_id)) {
        if (!dbState.dermatologist_profiles?.find(d => d.id === cons.doctor_id)) {
          anomalies.push(`ORPHAN CONSULTATION: consultation ${cons.id} assigned to missing doctor ${cons.doctor_id}`);
        }
      }
    });
  }

  // 6. Reports -> Consultations
  if (dbState.reports) {
    dbState.reports.forEach(rep => {
      if (dbState.consultations && !dbState.consultations.find(c => c.id === rep.consultation_id)) {
        anomalies.push(`ORPHAN REPORT: report ${rep.id} linked to missing consultation ${rep.consultation_id}`);
      }
    });
  }

  // 7. Audit Logs -> Users
  if (dbState.audit_logs && dbState.profiles) {
    let unmappedLogs = 0;
    dbState.audit_logs.forEach(log => {
        // Log usually tracks user_id
        if (log.user_id && !dbState.profiles.find(p => p.id === log.user_id)) unmappedLogs++;
    });
    if (unmappedLogs > 0) anomalies.push(`AUDIT LOGS: ${unmappedLogs} logs reference non-existent users (Potential Null-Cascade loss).`);
  }

  // Deduplication check
  if (dbState.profiles) {
    const emails = dbState.profiles.map(p => p.email).filter(Boolean);
    const uniqueEmails = [...new Set(emails)];
    if (emails.length !== uniqueEmails.length) anomalies.push(`DUPLICATE PROFILES: Found duplicate email addresses in profiles table.`);
  }

  if (anomalies.length === 0) {
    console.log("SUCCESS: 0 cross-entity relational anomalies or orphan records found.");
  } else {
    console.log("ANOMALIES DETECTED:");
    anomalies.forEach(a => console.log(" - " + a));
  }

  console.log("\n=== SUMMARY DATA PUMP ===");
  // Print some columns for schema understanding.
  Object.keys(dbState).forEach(tableName => {
      if (dbState[tableName] && dbState[tableName].length > 0) {
          const sample = dbState[tableName][0];
          console.log(`\nTable [${tableName}] schema columns:`);
          console.log(Object.keys(sample).join(", "));
          // Check for enum values constraints manually
          if (sample.status !== undefined || sample.approval_status !== undefined) {
             const statuses = [...new Set(dbState[tableName].map(r => r.status || r.approval_status))];
             console.log(`   -> Enum distinct states: [${statuses.join(", ")}]`);
          }
      }
  });

}

main().catch(err => {
  console.error("Fatal error:", err);
});
