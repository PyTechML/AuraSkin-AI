import { randomInt } from "crypto";
import * as bcrypt from "bcryptjs";

const BCRYPT_ROUNDS = 10;

/** 6-digit numeric OTP from a cryptographically secure source. */
export function generateNumericOtp6(): string {
  const n = randomInt(0, 1_000_000);
  return n.toString().padStart(6, "0");
}

export async function hashOtp(otp: string): Promise<string> {
  return bcrypt.hash(otp, BCRYPT_ROUNDS);
}

export async function verifyOtpConstantTime(otp: string, hash: string): Promise<boolean> {
  if (!otp || !hash) return false;
  return bcrypt.compare(otp, hash);
}
