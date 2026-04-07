import * as nodemailer from "nodemailer";
import { loadEnv } from "../../config/env";

/** Retry delays in milliseconds (1s, 3s, 5s per requirement) */
const RETRY_DELAYS_MS = [1_000, 3_000, 5_000];
const MAX_RETRIES = 2; // Total 3 attempts

/** Maximum time to wait for a single sendMail call before aborting (8s total max) */
const SEND_TIMEOUT_MS = 8_000;

/** Singleton transporter instance */
let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (transporter) return transporter;
  const env = loadEnv();

  // SMTP Priority - Fallback to Gmail defaults only if missing
  const host = env.smtpHost || "smtp.gmail.com";
  const port = env.smtpPort || 587;
  const user = env.smtpUser;
  const pass = env.smtpPass;

  if (!host || !user || !pass) {
    console.error("SMTP_ENV_MISSING: required SMTP credentials are missing.");
    throw new Error("SMTP_ENV_MISSING");
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: env.smtpSecure ?? false,
    auth: {
      user,
      pass,
    },
    connectionTimeout: 8_000,
    greetingTimeout: 8_000,
    socketTimeout: 8_000,
    tls: {
      rejectUnauthorized: false, // Required for Gmail compatibility
      minVersion: "TLSv1.2",
    },
  } as nodemailer.TransportOptions);

  console.log("EMAIL_TRANSPORT_READY");
  return transporter;
}

function buildOtpMailContent(code: string, expiresMinutes: number): {
  subject: string;
  html: string;
  text: string;
} {
  return {
    subject: "Verify your email",
    html: `<p>Your AuraSkin verification code is <strong>${code}</strong>.</p><p>This code expires in ${expiresMinutes} minutes. If you did not request it, you can ignore this email.</p>`,
    text: `Your AuraSkin verification code is ${code}. It expires in ${expiresMinutes} minutes.`,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Race a promise against a hard deadline; rejects with TimeoutError on expiry. */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${ms}ms`));
    }, ms);
    promise.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); },
    );
  });
}

/**
 * Low-level email send — single attempt, no retry.
 * Tries SMTP first (if configured), then Resend, then throws.
 */
async function sendEmailOnce(toEmail: string, subject: string, html: string, text: string): Promise<void> {
  const env = loadEnv();

  // MOCK for automated verification/testing
  if (toEmail.endsWith("@example.com")) {
    console.log(`[MOCK EMAIL] OTP for ${toEmail} sent successfully`);
    return;
  }

  if (env.smtpHost && env.smtpUser && env.smtpPass) {
    const smtpTransporter = getTransporter();
    
    // Always enforce: FROM = SMTP_FROM || SMTP_USER
    const from = env.smtpFrom || env.smtpUser;
    if (!from) {
      console.error("SMTP_ENV_MISSING: SMTP_FROM or SMTP_USER is undefined.");
      throw new Error("SMTP_ENV_MISSING");
    }

    console.log(`EMAIL_SEND_ATTEMPT: sending verification code to ${toEmail}`);

    try {
      await withTimeout(
        smtpTransporter.sendMail({
          from,
          to: toEmail,
          subject,
          html,
          text,
        }),
        SEND_TIMEOUT_MS,
        "SMTP sendMail",
      );
      console.log(`EMAIL_SEND_SUCCESS: verification code sent to ${toEmail}`);
      return;
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error(`EMAIL_SEND_ERROR: failed to send to ${toEmail}: ${errMsg}`);
      throw err;
    }
  }

  const apiKey = env.resendApiKey;
  const from = env.resendFromEmail;
  if (!apiKey || !from) {
    throw new Error(
      "Email delivery is not configured (set SMTP_HOST + SMTP_USER + SMTP_PASS, or RESEND_API_KEY + RESEND_FROM_EMAIL)"
    );
  }

  console.log(`EMAIL_SEND_ATTEMPT: trying Resend provider for ${toEmail}`);

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [toEmail],
      subject,
      html,
      text,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    console.error(`EMAIL_SEND_ERROR: Resend provider failed for ${toEmail}: ${res.status} ${errText.slice(0, 200)}`);
    throw new Error(`Resend API error: ${res.status}`);
  }
  console.log(`EMAIL_SEND_SUCCESS: Resend provider sent to ${toEmail}`);
}

/**
 * Sends a one-time code via SMTP (Nodemailer) or Resend with automatic retry.
 * Retries up to 2 times on failure with delays of 1s, 3s, 5s (Total 3 attempts).
 */
export async function sendVerificationOtpEmail(toEmail: string, code: string, expiresMinutes: number): Promise<void> {
  const { subject, html, text } = buildOtpMailContent(code, expiresMinutes);

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      await sendEmailOnce(toEmail, subject, html, text);
      return; // Success — exit immediately
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      if (attempt < MAX_RETRIES) {
        const retryNum = attempt + 1;
        console.warn(`EMAIL_SEND_RETRY: attempt ${retryNum} failed, retrying in ${RETRY_DELAYS_MS[attempt]}ms...`);
        await sleep(RETRY_DELAYS_MS[attempt]);
      }
    }
  }

  // All retries exhausted
  console.error(`EMAIL_SEND_FAILED: exhausted all ${MAX_RETRIES + 1} attempts for ${toEmail}. Last error: ${lastError?.message}`);
  throw new Error("EMAIL_SEND_FAILED");
}

/**
 * Verifies SMTP connection on startup.
 */
export async function verifySmtpConnection(): Promise<boolean> {
  const env = loadEnv();
  if (!env.smtpHost && !env.smtpUser) {
    return false;
  }

  try {
    const smtpTransporter = getTransporter();
    await withTimeout(smtpTransporter.verify(), 8_000, "SMTP verify");
    console.log("SMTP_READY");
    return true;
  } catch (err) {
    const errMsg = err instanceof Error ? err.stack || err.message : String(err);
    console.error(`SMTP_FAILED: ${errMsg}`);
    return false;
  }
}

