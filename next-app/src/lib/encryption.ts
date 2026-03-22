/**
 * Server-only AES-256-GCM encryption helpers for at-rest encryption of
 * sensitive waitlist fields (email, name). Uses a 32-byte key from ENCRYPTION_KEY env var.
 */
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96-bit IV recommended for GCM
const AUTH_TAG_LENGTH = 16;

function getKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) throw new Error("ENCRYPTION_KEY environment variable is not set");
  const key = Buffer.from(raw, "hex");
  if (key.length !== 32) {
    throw new Error("ENCRYPTION_KEY must be a 64-character hex string (32 bytes)");
  }
  return key;
}

/** Encrypt a plaintext string. Returns a base64-encoded payload: iv + authTag + ciphertext */
export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  // Layout: [12 bytes iv][16 bytes authTag][ciphertext]
  const payload = Buffer.concat([iv, authTag, encrypted]);
  return payload.toString("base64");
}

/** Decrypt a base64 payload produced by encrypt(). */
export function decrypt(encoded: string): string {
  const key = getKey();
  const payload = Buffer.from(encoded, "base64");
  const iv = payload.subarray(0, IV_LENGTH);
  const authTag = payload.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = payload.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}
