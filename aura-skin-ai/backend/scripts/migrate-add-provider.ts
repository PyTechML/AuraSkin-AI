import { Client } from 'pg';
import "dotenv/config";

async function migrate() {
  const connectionString = process.env.SUPABASE_STORAGE_CONNECTION_STRING;
  if (!connectionString) {
    console.error('Error: SUPABASE_STORAGE_CONNECTION_STRING not found in .env');
    process.exit(1);
  }

  const client = new Client({
    connectionString: connectionString,
  });

  try {
    await client.connect();
    console.log('Connected to PostgreSQL database.');

    // Check if column exists first
    const checkColQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='profiles' AND column_name='provider';
    `;
    const res = await client.query(checkColQuery);

    if (res.rowCount === 0) {
      console.log('Column "provider" missing. Adding it...');
      // Add provider column as text
      await client.query('ALTER TABLE profiles ADD COLUMN provider text;');
      console.log('Successfully added "provider" column to "profiles" table.');
    } else {
      console.log('Column "provider" already exists. No action needed.');
    }

  } catch (err) {
    console.error('Migration failed:', err.message);
  } finally {
    await client.end();
  }
}

migrate();
