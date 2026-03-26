require("dotenv/config");
const { createClient } = require("@supabase/supabase-js");
const fs = require('fs');

async function main() {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = createClient(url, serviceRoleKey, { auth: { persistSession: false } });

  const tablesToScan = [
    "profiles", "store_profiles", "dermatologist_profiles", "products", "inventory",
    "orders", "order_items", "consultations", "patients", "reports", "earnings",
    "availability_slots", "sessions", "notifications", "feature_flags", "audit_logs"
  ];

  const dbState = {};
  const counts = {};
  const errors = [];
  const anomalies = [];
  const schemas = {};

  for (const table of tablesToScan) {
    try {
      const { data, error } = await supabase.from(table).select("*");
      if (error) {
        errors.push(`[${table}] Error: ${error.message}`);
      } else {
        dbState[table] = data || [];
        counts[table] = data.length;
        if (data.length > 0) {
            schemas[table] = Object.keys(data[0]);
        }
      }
    } catch (e) {
      errors.push(`[${table}] Exception: ${e.message}`);
    }
  }

  if (dbState.reports) {
    dbState.reports.forEach(rep => {
      if (dbState.consultations && !dbState.consultations.find(c => c.id === rep.consultation_id)) {
        anomalies.push(`ORPHAN REPORT: report ${rep.id} linked to missing consultation ${rep.consultation_id}`);
      }
    });
  }

  if (dbState.audit_logs && dbState.profiles) {
    let unmappedLogs = 0;
    dbState.audit_logs.forEach(log => {
        if (log.user_id && !dbState.profiles.find(p => p.id === log.user_id)) unmappedLogs++;
    });
    if (unmappedLogs > 0) anomalies.push(`AUDIT LOGS: ${unmappedLogs} logs reference non-existent users.`);
  }

  const out = { counts, schemas, anomalies, errors };
  fs.writeFileSync('db_audit_out.json', JSON.stringify(out, null, 2));
}

main().catch(console.error);
