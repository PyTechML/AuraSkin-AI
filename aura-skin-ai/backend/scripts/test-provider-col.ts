import { getSupabaseClient } from '../src/database/supabase.client';
import "dotenv/config";

async function testProviderColumn() {
  const supabase = getSupabaseClient();
  
  console.log('Testing select with "provider" column...');
  const { data, error } = await supabase
    .from('profiles')
    .select('id, provider')
    .limit(1);
  
  if (error) {
    console.error('Error selecting provider:', error.message, error.details);
  } else {
    console.log('Success! Data:', data);
  }
}

testProviderColumn();
