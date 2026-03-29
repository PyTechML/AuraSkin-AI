/** Client-side mirrors of backend flags (NEXT_PUBLIC_*). Server remains authoritative. */

export const authEmailOtpRequired =
  typeof process !== "undefined" && process.env.NEXT_PUBLIC_AUTH_EMAIL_OTP_REQUIRED === "true";

export const authGmailOnly =
  typeof process !== "undefined" && process.env.NEXT_PUBLIC_AUTH_GMAIL_ONLY === "true";

export const authAppleOAuthWhenGmailOnly =
  typeof process !== "undefined" &&
  process.env.NEXT_PUBLIC_AUTH_APPLE_OAUTH_WHEN_GMAIL_ONLY === "true";
