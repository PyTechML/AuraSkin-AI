import * as nodemailer from "nodemailer";
import { loadEnv } from "../../config/env";

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

/**
 * Sends a one-time code via SMTP (Nodemailer) or Resend. Proves inbox access / deliverability only — not Google account endorsement.
 * If SMTP_HOST is set, Nodemailer is used; otherwise Resend (RESEND_API_KEY + RESEND_FROM_EMAIL).
 */
export async function sendVerificationOtpEmail(toEmail: string, code: string, expiresMinutes: number): Promise<void> {
  const env = loadEnv();
  const { subject, html, text } = buildOtpMailContent(code, expiresMinutes);

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
