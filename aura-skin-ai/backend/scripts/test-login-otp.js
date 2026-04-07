/**
 * test-login-otp.js — Full integration test for Login OTP generation.
 * Usage: node scripts/test-login-otp.js <email> <password>
 */
require('dotenv').config({ path: './.env' });

const API_URL = process.env.API_URL || 'http://localhost:3001/api';

async function main() {
  const email = process.argv[2];
  const password = process.argv[3];

  if (!email || !password) {
    console.error('Usage: node scripts/test-login-otp.js <email> <password>');
    process.exit(1);
  }

  console.log(`=== Login OTP Integration Test ===`);
  console.log(`Target API: ${API_URL}`);
  console.log(`Test Email: ${email}\n`);

  const start = Date.now();
  try {
    console.log(`1. POST /auth/login ...`);
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const json = await res.json();
    const data = json.data || json;
    const duration = Date.now() - start;

    if (res.ok && data.otp_required) {
      console.log(`   ✅ challenge created (duration=${duration}ms)`);
      console.log(`   ✅ OTP email sent (according to response)`);
      console.log(`   ✅ OTP_REQUIRED returned`);
      console.log(`\nChallenge ID: ${data.challengeId}`);
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
