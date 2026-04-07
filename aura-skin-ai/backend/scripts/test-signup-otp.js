/**
 * test-signup-otp.js — Full integration test for Signup OTP generation.
 * Usage: node scripts/test-signup-otp.js [optional-email]
 */
require('dotenv').config({ path: './.env' });

const API_URL = process.env.API_URL || 'http://localhost:3001/api';

async function main() {
  const email = process.argv[2] || `test-${Date.now()}@example.com`;
  const password = 'Password123!';
  const name = 'Test User';

  console.log(`=== Signup OTP Integration Test ===`);
  console.log(`Target API: ${API_URL}`);
  console.log(`Test Email: ${email}\n`);

  const start = Date.now();
  try {
    console.log(`1. POST /auth/signup ...`);
    const res = await fetch(`${API_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name, requested_role: 'USER' }),
    });

    const json = await res.json();
    const data = json.data || json;
    const duration = Date.now() - start;

    if (res.ok && data.otp_required) {
      console.log(`   ✅ pending signup created (duration=${duration}ms)`);
      console.log(`   ✅ OTP email sent (according to response)`);
      console.log(`   ✅ OTP_REQUIRED returned`);
      console.log(`\nPending ID: ${data.pendingId}`);
      console.log(`\n=== SUCCESS ===`);
    } else {
      console.error(`   ❌ Failed with status ${res.status}`);
      console.error(`   Body:`, JSON.stringify(data, null, 2));
      process.exit(1);
    }
  } catch (err) {
    console.error(`   ❌ Request FAILED:`, err.message);
    process.exit(1);
  }
}

main();
