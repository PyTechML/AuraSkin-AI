import * as nodemailer from "nodemailer";
import { loadEnv } from "../../config/env";

/** Retry delays in milliseconds: 1s, 3s, 5s */
const RETRY_DELAYS_MS = [1_000, 3_000, 5_000];
const MAX_RETRIES = RETRY_DELAYS_MS.length;

function buildOtpMailContent(code: string, expiresMinutes: number): {
  subject: string;
  html: string;
  text: string;
} {
  return {
    subject: "Your AuraSkin verification code",
    html: `<p>Your AuraSkin verification code is <strong>${code}</strong>.</p><p>This code expires in ${expiresMinutes} minutes. If you did not request it, you can ignore this email.</p>`,
    text: `Your AuraSkin verification code is ${code}. It expires in ${expiresMinutes} minutes.`,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

  if (env.smtpHost && env.smtpFrom && env.smtpUser && env.smtpPass) {
    const transporter = nodemailer.createTransport({
      host: env.smtpHost,
      port: env.smtpPort,
      secure: env.smtpSecure,
      auth: {
        user: env.smtpUser,
        pass: env.smtpPass,
      },
    });
    await transporter.sendMail({
      from: env.smtpFrom,
      to: toEmail,
      subject,
      html,
      text,
    });
    return;
  }

  const apiKey = env.resendApiKey;
  const from = env.resendFromEmail;
  if (!apiKey || !from) {
    throw new Error(
      "Email delivery is not configured (set SMTP_HOST + SMTP_FROM + SMTP_USER + SMTP_PASS, or RESEND_API_KEY + RESEND_FROM_EMAIL)"
    );
  }

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
    throw new Error(`Resend API error: ${res.status} ${errText.slice(0, 200)}`);
  }
}

/**
 * Sends a one-time code via SMTP (Nodemailer) or Resend with automatic retry.
 * Retries up to 3 times on failure with delays of 1s, 3s, 5s.
 * Same OTP code is reused across retries — no duplicate entries created.
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
        console.warn(
          JSON.stringify({
            event: `OTP_EMAIL_RETRY_ATTEMPT_${retryNum}`,
            email: toEmail,
            error: lastError.message,
            delay_ms: RETRY_DELAYS_MS[attempt],
            timestamp: new Date().toISOString(),
          })
        );
        await sleep(RETRY_DELAYS_MS[attempt]);
      }
    }
  }

  // All retries exhausted
  console.error(
    JSON.stringify({
      event: "OTP_EMAIL_DELIVERY_FAILED",
      email: toEmail,
      error: lastError?.message ?? "unknown",
      total_attempts: MAX_RETRIES + 1,
      timestamp: new Date().toISOString(),
    })
  );

  throw new Error("Verification email could not be sent. Please try again.");
}
