const { Client } = require('pg');

async function runAudit() {
  const client = new Client({
    user: 'postgres',
    password: '[A(u₹@9Ni(+_+)RPs)-]',
    host: 'db.wipwjchfmttscteqtcmq.supabase.co',
    port: 5432,
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    
    // 1. Get Tables in public schema
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public';
    `);
    const tables = tablesRes.rows.map(r => r.table_name);
    
    // 2. Map row counts
    const rowCounts = {};
    for (const table of tables) {
      try {
        const countRes = await client.query(`SELECT count(*) as count FROM public."${table}"`);
        rowCounts[table] = parseInt(countRes.rows[0].count, 10);
      } catch(e) { /* ignore */ }
    }
    
    // 3. Inspect Foreign Keys
    const fksRes = await client.query(`
      SELECT
        tc.table_name, 
        kcu.column_name, 
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name, 
        rc.update_rule, 
        rc.delete_rule
      FROM 
        information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        JOIN information_schema.referential_constraints AS rc
          ON rc.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema='public';
    `);
    
    console.log(JSON.stringify({
      tables,
      rowCounts,
      foreignKeys: fksRes.rows
    }, null, 2));

  } catch (err) {
    console.error("Error connecting to database:", err);
  } finally {
    await client.end();
  }
}

runAudit();
