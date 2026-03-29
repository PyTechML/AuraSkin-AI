/**
 * Product rule: when AUTH_GMAIL_ONLY is enabled, only @gmail.com addresses are allowed
 * for email+password flows and Google OAuth. Google Workspace primary domains that are not
 * @gmail.com may be rejected.
 */

export function normalizeEmail(email: string): string {
  return (email ?? "").trim().toLowerCase();
}

export function isGmailDomainEmail(normalizedLowerEmail: string): boolean {
  return normalizedLowerEmail.endsWith("@gmail.com");
}

export const GMAIL_ONLY_SIGNUP_MESSAGE =
  "Only Gmail addresses (@gmail.com) can register with email and password.";

export const GMAIL_ONLY_LOGIN_MESSAGE =
  "Only Gmail addresses (@gmail.com) can sign in with email and password.";
