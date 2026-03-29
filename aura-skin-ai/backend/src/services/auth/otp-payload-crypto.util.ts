import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import { loadEnv } from "../../config/env";

const ALGO = "aes-256-gcm";
const IV_LEN = 12;
const TAG_LEN = 16;

function parseOtpEncryptionKey(raw: string): Buffer {
  const t = raw.trim();
  if (/^[0-9a-fA-F]{64}$/.test(t)) {
    return Buffer.from(t, "hex");
  }
  const b64 = Buffer.from(t, "base64");
  if (b64.length !== 32) {
    throw new Error("AUTH_OTP_ENCRYPTION_KEY must decode to 32 bytes (use 64 hex chars or base64)");
  }
  return b64;
}

let cachedKey: Buffer | null = null;

export function getOtpEncryptionKeyBuffer(): Buffer {
  if (cachedKey) return cachedKey;
  const env = loadEnv();
  const raw = env.authOtpEncryptionKey;
  if (!raw) {
    throw new Error("AUTH_OTP_ENCRYPTION_KEY is not configured");
  }
  cachedKey = parseOtpEncryptionKey(raw);
  return cachedKey;
}

/** Encrypt JSON-serializable payload; returns base64(iv || ciphertext || tag). */
export function encryptJsonPayload(obj: unknown): string {
  const key = getOtpEncryptionKeyBuffer();
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, key, iv);
  const plain = Buffer.from(JSON.stringify(obj), "utf8");
  const enc = Buffer.concat([cipher.update(plain), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, enc, tag]).toString("base64");
}

export function decryptJsonPayload<T>(b64: string): T {
  const key = getOtpEncryptionKeyBuffer();
  const buf = Buffer.from(b64, "base64");
  if (buf.length < IV_LEN + TAG_LEN + 1) {
    throw new Error("Invalid ciphertext");
  }
  const iv = buf.subarray(0, IV_LEN);
  const tag = buf.subarray(buf.length - TAG_LEN);
  const enc = buf.subarray(IV_LEN, buf.length - TAG_LEN);
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
  return JSON.parse(dec.toString("utf8")) as T;
}
