import { getSupabaseClient } from '../src/database/supabase.client';
import "dotenv/config";

async function checkUserRoles() {
  const supabase = getSupabaseClient();
  const emails = ['user@auraskin.ai', 'store@auraskin.ai', 'doctor@auraskin.ai', 'admin@auraskin.ai'];
  
  for (const email of emails) {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('email, role')
      .eq('email', email)
      .maybeSingle();
      
    if (error) {
      console.error(`Error checking ${email}:`, error.message);
    } else {
      console.log(`User: ${email}, Role: ${profile?.role ?? 'NULL (No Profile)'}`);
    }
  }
}

checkUserRoles();
