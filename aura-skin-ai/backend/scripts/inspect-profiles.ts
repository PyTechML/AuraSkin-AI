import { getSupabaseClient } from '../src/database/supabase.client';
import "dotenv/config";

async function debugProfilesTable() {
  const supabase = getSupabaseClient();
  
  // Try to fetch one row with all columns to see what's available
  const { data, error } = await supabase.from('profiles').select('*').limit(1);
  
  if (error) {
    console.error('Error fetching profiles:', error);
  } else {
    console.log('Columns in profiles table:', data.length > 0 ? Object.keys(data[0]) : 'No data found');
    console.log('Sample profile:', data[0]);
  }
}

debugProfilesTable();
