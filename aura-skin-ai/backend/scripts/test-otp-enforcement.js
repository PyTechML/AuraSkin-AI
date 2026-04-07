const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: './.env' });

const BASE_URL = 'http://localhost:3001/api';
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runTest() {
  const testEmail = `test_${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';
  const testName = 'OTP Test User';

  console.log('--- STARTING OTP ENFORCEMENT TEST ---');

  // 1. Test Registration Enforcement
  console.log(`\n1. Attempting registration for ${testEmail}...`);
  const regRes = await fetch(`${BASE_URL}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, password: testPassword, name: testName })
  });
  const regData = await regRes.json();
  
  if (regData.data?.otp_required && regData.data?.pendingId) {
    console.log('✅ Registration triggered OTP flow as expected.');
  } else {
    console.error('❌ Registration did not trigger OTP flow or returned tokens directly!', regData);
    process.exit(1);
  }

  // Verify NO user created in Supabase yet
  const { data: userBefore } = await supabase.from('profiles').select('id').eq('email', testEmail).maybeSingle();
  if (userBefore) {
    console.error('❌ FAIL: User already exists in profiles before OTP verification!');
    process.exit(1);
  } else {
    console.log('✅ Confirmed: No user created in Supabase profiles yet.');
  }

  // 2. Mock OTP Verification for Signup
  console.log('\n2. Mocking OTP verification...');
  const pendingId = regData.data.pendingId;
  const testOtp = '123456';
  const testOtpHash = await bcrypt.hash(testOtp, 10);
  
  // Directly update the pending_signup row with a known hash for testing
  await supabase.from('pending_signups').update({ otp_hash: testOtpHash }).eq('id', pendingId);
  
  const verifyRes = await fetch(`${BASE_URL}/auth/signup/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pendingId, otp: testOtp })
  });
  const verifyData = (await verifyRes.json()).data;
  
  if (verifyData?.success) {
    console.log('✅ Signup verification successful.');
  } else {
    console.error('❌ Signup verification failed!', verifyData);
    process.exit(1);
  }

  // Verify user created and marked as verified/otp_required=true
  const { data: userAfter } = await supabase.from('profiles').select('*').eq('email', testEmail).single();
  if (userAfter && userAfter.email_verified && userAfter.otp_required) {
    console.log('✅ User created with correct flags (verified=true, otp_required=true).');
  } else {
    console.error('❌ User creation failed or flags incorrect!', userAfter);
    process.exit(1);
  }

  // 3. Test Login Enforcement (No token leakage)
  console.log(`\n3. Attempting login for ${testEmail}...`);
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, password: testPassword })
  });
  const loginData = await loginRes.json();

  if (loginData.data?.otp_required && loginData.data?.challengeId) {
    if (loginData.data.access_token || loginData.data.user || loginData.data.token) {
      console.error('❌ FAIL: Session tokens leaked during login challenge!', loginData.data);
      process.exit(1);
    } else {
      console.log('✅ Login triggered challenge and NO tokens were leaked.');
    }
  } else {
    console.error('❌ Login did not trigger expected OTP challenge!', loginData);
    process.exit(1);
  }

  // 4. Mock OTP Verification for Login
  console.log('\n4. Mocking Login OTP verification...');
  const challengeId = loginData.data.challengeId;
  await supabase.from('auth_login_challenges').update({ otp_hash: testOtpHash }).eq('id', challengeId);

  const loginCompleteRes = await fetch(`${BASE_URL}/auth/login/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ challengeId, otp: testOtp })
  });
  const loginCompleteData = await loginCompleteRes.json();

  if (loginCompleteData.data?.accessToken) {
    console.log('✅ Login verification successful, JWT received.');
  } else {
    console.error('❌ Login verification failed to return tokens!', loginCompleteData);
    process.exit(1);
  }

  // 5. Test Legacy User (Bypass)
  console.log('\n5. Testing Legacy User bypass...');
  const legacyEmail = 'legacy@example.com';
  // Create a legacy-style user directly in Supabase
  const { data: legacyUserBody } = await supabase.auth.admin.createUser({
    email: legacyEmail,
    password: testPassword,
    email_confirm: true
  });
  await supabase.from('profiles').upsert({
    id: legacyUserBody.user.id,
    email: legacyEmail,
    email_verified: true,
    otp_required: false // Legacy user
  });

  const legacyLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: legacyEmail, password: testPassword })
  });
  const legacyLoginData = await legacyLoginRes.json();

  if (legacyLoginData.data?.accessToken && !legacyLoginData.data?.otp_required) {
    console.log('✅ Legacy user successfully bypassed OTP challenge as expected.');
  } else {
    console.error('❌ Legacy login failed or forced into OTP!', legacyLoginData);
    process.exit(1);
  }

  // Cleanup
  console.log('\nCleaning up test data...');
  await supabase.auth.admin.deleteUser(userAfter.id);
  await supabase.auth.admin.deleteUser(legacyUserBody.user.id);
  
  console.log('\n--- ALL OTP ENFORCEMENT TESTS PASSED ---');
}

runTest();
