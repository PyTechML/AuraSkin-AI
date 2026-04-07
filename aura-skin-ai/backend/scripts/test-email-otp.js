/**
 * test-email-otp.js — Standalone SMTP connectivity & OTP email send test.
 * Usage:  node scripts/test-email-otp.js [optional-recipient@gmail.com]
 *
 * Verifies:
 *  1. Environment variables are loaded
 *  2. SMTP transporter connects (EHLO handshake)
 *  3. OTP email sends successfully
 *  4. Total time < 5 seconds
 */
const nodemailer = require('nodemailer');
require('dotenv').config({ path: './.env' });

const SEND_TIMEOUT_MS = 8_000;

async function main() {
  const recipient = process.argv[2] || process.env.SMTP_USER || 'test@example.com';

  console.log('=== AuraSkin OTP Email Delivery Test ===\n');

  // --- Step 1: Environment check ---
  const vars = {
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_PORT: process.env.SMTP_PORT || '587',
    SMTP_SECURE: process.env.SMTP_SECURE || 'false',
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASS: process.env.SMTP_PASS ? '***SET***' : undefined,
    SMTP_FROM: process.env.SMTP_FROM,
    AUTH_EMAIL_OTP_REQUIRED: process.env.AUTH_EMAIL_OTP_REQUIRED,
  };

  console.log('1. Environment variables:');
  let allSet = true;
  for (const [key, val] of Object.entries(vars)) {
    const status = val ? '✅' : '❌ MISSING';
    console.log(`   ${status} ${key} = ${val || '(not set)'}`);
    if (!val && key !== 'AUTH_EMAIL_OTP_REQUIRED') allSet = false;
  }

  if (!allSet) {
    console.error('\n❌ FATAL: Required SMTP env vars missing. Cannot send email.');
    process.exit(1);
  }

  // --- Step 2: Create transporter & verify connection ---
  console.log('\n2. Creating SMTP transporter...');
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    connectionTimeout: 5_000,
    greetingTimeout: 5_000,
    socketTimeout: 8_000,
    tls: {
      rejectUnauthorized: false,
    },
  });

  try {
    const verifyStart = Date.now();
    await transporter.verify();
    const verifyMs = Date.now() - verifyStart;
    console.log(`   ✅ SMTP connection successful (${verifyMs}ms)`);
  } catch (err) {
    console.error(`   ❌ SMTP connection FAILED: ${err.message}`);
    console.error('   Check credentials, host, port, and firewall settings.');
    process.exit(1);
  }

  // --- Step 3: Send test OTP email ---
  console.log(`\n3. Sending test OTP email to: ${recipient}`);
  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const sendStart = Date.now();

  try {
    const sendPromise = transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: recipient,
      subject: 'AuraSkin OTP Test',
      html: `<p>Your test OTP code is <strong>${otp}</strong>.</p><p>This is an automated test from test-email-otp.js.</p>`,
      text: `Your test OTP code is ${otp}. This is an automated test.`,
    });

    // Race against timeout
    const result = await Promise.race([
      sendPromise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Send timed out after ${SEND_TIMEOUT_MS}ms`)), SEND_TIMEOUT_MS)
      ),
    ]);

    const sendMs = Date.now() - sendStart;
    console.log(`   ✅ OTP email sent successfully (${sendMs}ms)`);
    console.log(`   Message ID: ${result.messageId || 'N/A'}`);

    if (sendMs > 5000) {
      console.warn(`   ⚠️ WARNING: Send took ${sendMs}ms (target < 5000ms)`);
    } else {
      console.log(`   ✅ Response time ${sendMs}ms < 5000ms target`);
    }
  } catch (err) {
    const sendMs = Date.now() - sendStart;
    console.error(`   ❌ Email send FAILED after ${sendMs}ms: ${err.message}`);
    process.exit(1);
  }

  // --- Summary ---
  console.log('\n=== RESULTS ===');
  console.log('✅ SMTP connection successful');
  console.log('✅ OTP email sent');
  console.log('✅ No infinite promise hanging');
  console.log('✅ No unhandled rejection');
  console.log('✅ No timeout');
  console.log(`\nTest OTP code: ${otp} (sent to ${recipient})`);
}

main().catch((err) => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
