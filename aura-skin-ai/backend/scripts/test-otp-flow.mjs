
const API_BASE = 'http://localhost:3001/api';

async function testSignupStart() {
  console.log('\n--- Testing Signup Start ---');
  const res = await fetch(`${API_BASE}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: `test_${Date.now()}@gmail.com`,
      password: 'Password123!',
      name: 'Test User',
      requested_role: 'USER'
    })
  });
  const json = await res.json();
  console.log('Status:', res.status);
  console.log('Body:', JSON.stringify(json, null, 2));
  
  if (json.data?.otp_required) {
    console.log('✅ Signup triggered OTP start as expected.');
  } else {
    console.log('❌ Signup did not trigger OTP (check AUTH_EMAIL_OTP_REQUIRED env flag).');
  }
}

async function testLegacyLogin() {
  console.log('\n--- Testing Legacy Login (store@auraskin.ai) ---');
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'store@auraskin.ai',
      password: 'Store@12345',
      requested_role: 'STORE'
    })
  });
  const json = await res.json();
  console.log('Status:', res.status);
  
  if (json.data?.accessToken && !json.data?.otp_required) {
    console.log('✅ Legacy login bypassed OTP as expected.');
  } else if (json.data?.otp_required) {
    console.log('⚠️ Legacy login requested OTP (Expected if store@auraskin.ai is not in DB or migration not run).');
  } else {
    console.log('❌ Legacy login failed:', json.message || 'Unknown error');
  }
}

async function runTests() {
  try {
    await testSignupStart();
    await testLegacyLogin();
  } catch (err) {
    console.error('Test execution failed:', err.message);
    console.log('Hint: Ensure the backend is running at http://localhost:3001');
  }
}

runTests();
