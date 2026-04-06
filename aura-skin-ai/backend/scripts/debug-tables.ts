import { getSupabaseClient } from '../src/database/supabase.client';
import "dotenv/config";

async function verifyTable() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from('pending_signups').select('count', { count: 'exact', head: true });
  if (error) {
    console.error('Table pending_signups access error:', error);
  } else {
    console.log('Table pending_signups is accessible. Count:', data);
  }
  
  const { data: pData, error: pError } = await supabase.from('profiles').select('id, email, otp_required').eq('email', 'store@auraskin.ai').single();
  if (pError) {
    console.error('Profile store@auraskin.ai fetch error:', pError);
  } else {
    console.log('Profile store@auraskin.ai:', pData);
  }
}

verifyTable();
