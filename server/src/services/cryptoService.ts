import { createECDH, randomBytes, createCipheriv, createDecipheriv, hkdf } from "node:crypto";
import { config } from "../config.js";
import type { SessionEntry } from "../types/index.js";

const sessions = new Map<string, SessionEntry>();

export const sessionLimits = { global: 500, perUser: 5 };

export class SessionLimitError extends Error {
  constructor() {
    super("Too many sessions");
    this.name = "SessionLimitError";
  }
}

export function resetSessionsForTests(): void {
  for (const [id] of sessions) deleteSession(id);
}

const HKDF_SALT = Buffer.alloc(32, 0);
const HKDF_INFO = Buffer.from("e2e-doc-analyzer");

/**
 * Derives a 256-bit AES key from an ECDH shared secret using HKDF (SHA-256).
 * Parameters match the client-side WebCrypto HKDF derivation exactly:
 * hash=SHA-256, salt=32 zero bytes, info="e2e-doc-analyzer", keylen=32.
 */
function deriveAesKey(sharedSecret: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    hkdf("sha256", sharedSecret, HKDF_SALT, HKDF_INFO, 32, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(Buffer.from(derivedKey));
    });
  });
}

/**
 * Converts a JWK-encoded P-256 public key to the uncompressed point format
 * that Node's ECDH.computeSecret expects (0x04 || x || y).
 */
function jwkToUncompressedPoint(jwk: JsonWebKey): Buffer {
  if (!jwk.x || !jwk.y) throw new Error("Invalid JWK: missing x or y");
  const x = Buffer.from(jwk.x, "base64url");
  const y = Buffer.from(jwk.y, "base64url");
  return Buffer.concat([Buffer.from([0x04]), x, y]);
}

/**
 * Initiates a session: generates a server-side ECDH key pair,
 * computes the shared secret from the client's public key,
 * derives an AES-256-GCM key, and stores it in the session map.
 */
function evictExpired(now: number): void {
  for (const [id, entry] of sessions) {
    if (now - entry.createdAt > config.session.ttlMs) deleteSession(id);
  }
}

export async function initSession(
  clientPublicKeyJwk: JsonWebKey,
  userId: string,
): Promise<{
  sessionId: string;
  serverPublicKey: JsonWebKey;
}> {
  if (!userId) throw new Error("missing-user");
  evictExpired(Date.now());
  const mine = [...sessions.entries()]
    .filter(([, entry]) => entry.userId === userId)
    .sort((a, b) => a[1].createdAt - b[1].createdAt);
  while (mine.length >= sessionLimits.perUser) {
    const oldest = mine.shift();
    if (oldest) deleteSession(oldest[0]);
  }
  if (sessions.size >= sessionLimits.global) throw new SessionLimitError();

  const ecdh = createECDH("prime256v1");
  ecdh.generateKeys();

  const clientPoint = jwkToUncompressedPoint(clientPublicKeyJwk);
  const sharedSecret = ecdh.computeSecret(clientPoint);
  const aesKey = await deriveAesKey(sharedSecret);

  const sessionId = randomBytes(16).toString("hex");

  const serverPub = ecdh.getPublicKey();
  const x = serverPub.subarray(1, 33).toString("base64url");
  const y = serverPub.subarray(33, 65).toString("base64url");

  const serverPublicKey: JsonWebKey = {
    kty: "EC",
    crv: "P-256",
    x,
    y,
  };

  sessions.set(sessionId, { aesKey, createdAt: Date.now(), userId });

  return { sessionId, serverPublicKey };
}

export function getSession(sessionId: string, userId: string): SessionEntry | undefined {
  const entry = sessions.get(sessionId);
  if (!entry || !userId || entry.userId !== userId) return undefined;
  if (Date.now() - entry.createdAt > config.session.ttlMs) {
    deleteSession(sessionId);
    return undefined;
  }
  return entry;
}

export function deleteSession(sessionId: string): void {
  const entry = sessions.get(sessionId);
  if (entry) {
    entry.aesKey.fill(0);
    sessions.delete(sessionId);
  }
}

export function decrypt(
  aesKey: Buffer,
  ivHex: string,
  ciphertextBase64: string,
): string {
  const iv = Buffer.from(ivHex, "hex");
  const data = Buffer.from(ciphertextBase64, "base64");

  const authTag = data.subarray(data.length - 16);
  const encrypted = data.subarray(0, data.length - 16);

  const decipher = createDecipheriv("aes-256-gcm", aesKey, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}

export function encrypt(aesKey: Buffer, plaintext: string): {
  iv: string;
  ciphertext: string;
} {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", aesKey, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return {
    iv: iv.toString("hex"),
    ciphertext: Buffer.concat([encrypted, authTag]).toString("base64"),
  };
}

/**
 * Evicts expired sessions. Runs on an interval to prevent memory leaks.
 */
export function startSessionCleanup(): void {
  const interval = Math.min(config.session.ttlMs, 60_000);

  setInterval(() => {
    const now = Date.now();
    for (const [id, entry] of sessions) {
      if (now - entry.createdAt > config.session.ttlMs) {
        entry.aesKey.fill(0);
        sessions.delete(id);
      }
    }
  }, interval);
}

export function getActiveSessionCount(): number {
  return sessions.size;
}
