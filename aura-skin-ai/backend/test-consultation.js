const fs = require('fs');
require('dotenv').config({ path: './.env' });

const BASE_URL = 'http://localhost:3001/api';

async function run() {
  try {
    console.log("1. Logging in...");
    const loginBody = { email: 'user@auraskin.ai', password: 'User@12345' };
    
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(loginBody)
    });
    const loginData = await loginRes.json();
    console.log("Login res:", loginData);
    const token = loginData?.data?.access_token || loginData?.access_token;

    if (!token) throw new Error("Login failed - no token");

    console.log("\n2. Getting Dermatologist...");
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: derms } = await supabase.from('users').select('id').eq('role', 'dermatologist').limit(1);
    const doctorId = derms?.[0]?.id;
    if (!doctorId) throw new Error("No dermatologist found");
    console.log("Found dermatologist:", doctorId);

    const slotId = 'test-slot-' + Date.now();
    await supabase.from('availability_slots').insert({
      id: slotId,
      doctor_id: doctorId,
      slot_date: new Date().toISOString().slice(0, 10),
      start_time: '10:00:00',
      end_time: '10:30:00',
      status: 'available'
    });
    console.log("Created slot:", slotId);
    
    await supabase.from('dermatologist_profiles').upsert({ id: doctorId, consultation_fee: 50 }, { onConflict: 'id' });

    console.log("\n3. Creating Checkout Session...");
    const checkoutRes = await fetch(`${BASE_URL}/consultations/create-checkout-session`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        dermatologist_id: doctorId,
        slot_id: slotId
      })
    });
    const checkoutData = await checkoutRes.json();
    console.log("Checkout Res:", checkoutData);

    if (checkoutData?.data?.checkout_url) {
      console.log("\nSUCCESS! Stripe Checkout URL:", checkoutData.data.checkout_url);
    }

  } catch (e) {
    console.error("Error:", e.message);
  }
}

run();
