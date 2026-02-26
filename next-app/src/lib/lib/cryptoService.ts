/**
 * Client-side in-memory encryption for document data at rest.
 * Uses AES-256-GCM with a per-session non-extractable key.
 */

export interface EncryptedData {
  iv: Uint8Array;
  ciphertext: ArrayBuffer;
}

let sessionKey: CryptoKey | null = null;

export async function initSessionKey(): Promise<void> {
  sessionKey = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function encryptText(plaintext: string): Promise<EncryptedData> {
  if (!sessionKey) await initSessionKey();

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);

  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv.buffer as ArrayBuffer },
    sessionKey!,
    encoded,
  );

  return { iv, ciphertext };
}

export async function decryptText(data: EncryptedData): Promise<string> {
  if (!sessionKey) {
    throw new Error("Session key not initialized");
  }

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: data.iv.buffer as ArrayBuffer },
    sessionKey,
    data.ciphertext,
  );

  return new TextDecoder().decode(decrypted);
}

/**
 * Overwrites an EncryptedData buffer with random bytes before releasing,
 * making it harder to recover from memory dumps.
 */
export function sanitizeEncryptedData(data: EncryptedData): void {
  crypto.getRandomValues(data.iv);

  const view = new Uint8Array(data.ciphertext);
  crypto.getRandomValues(view);
}

/**
 * Destroys the session key and clears references.
 * After this call, encrypted data is unrecoverable.
 */
export function destroySessionKey(): void {
  sessionKey = null;
}

export function isSessionKeyReady(): boolean {
  return sessionKey !== null;
}
