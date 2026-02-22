/**
 * Client-side E2E encryption using ECDH (P-256) key exchange + AES-256-GCM.
 *
 * Protocol:
 * 1. Client generates ephemeral ECDH key pair
 * 2. Client sends public key to server, receives server's public key
 * 3. Both derive the same shared secret via ECDH
 * 4. Shared secret is stretched to AES-256-GCM key via HKDF (SHA-256)
 * 5. All payloads encrypted with AES-256-GCM + random IV per message
 */

const HKDF_INFO = new TextEncoder().encode("e2e-doc-analyzer");

let keyPair: CryptoKeyPair | null = null;
let derivedAesKey: CryptoKey | null = null;
let currentSessionId: string | null = null;

async function deriveAesKey(
  privateKey: CryptoKey,
  serverPublicKey: CryptoKey,
): Promise<CryptoKey> {
  const sharedBits = await crypto.subtle.deriveBits(
    { name: "ECDH", public: serverPublicKey },
    privateKey,
    256,
  );

  const sharedKeyMaterial = await crypto.subtle.importKey(
    "raw",
    sharedBits,
    "HKDF",
    false,
    ["deriveKey"],
  );

  return crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: new Uint8Array(32),
      info: HKDF_INFO,
    },
    sharedKeyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function initE2ESession(
  apiBaseUrl: string,
): Promise<string> {
  keyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    false,
    ["deriveBits"],
  );

  const clientPublicJwk = await crypto.subtle.exportKey(
    "jwk",
    keyPair.publicKey,
  );

  const response = await fetch(`${apiBaseUrl}/api/session/init`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientPublicKey: clientPublicJwk }),
  });

  if (!response.ok) {
    throw new Error(`Session init failed: ${response.status}`);
  }

  const { sessionId, serverPublicKey } = (await response.json()) as {
    sessionId: string;
    serverPublicKey: JsonWebKey;
  };

  const importedServerKey = await crypto.subtle.importKey(
    "jwk",
    serverPublicKey,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    [],
  );

  derivedAesKey = await deriveAesKey(keyPair.privateKey, importedServerKey);
  currentSessionId = sessionId;

  return sessionId;
}

export async function encryptPayload(
  data: unknown,
): Promise<{ sessionId: string; iv: string; ciphertext: string }> {
  if (!derivedAesKey || !currentSessionId) {
    throw new Error("E2E session not initialized");
  }

  const plaintext = new TextEncoder().encode(JSON.stringify(data));
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    derivedAesKey,
    plaintext,
  );

  return {
    sessionId: currentSessionId,
    iv: bufferToHex(iv),
    ciphertext: bufferToBase64(new Uint8Array(encrypted)),
  };
}

export async function decryptPayload(
  iv: string,
  ciphertext: string,
): Promise<string> {
  if (!derivedAesKey) {
    throw new Error("E2E session not initialized");
  }

  const ivBytes = hexToBuffer(iv);
  const encryptedBytes = base64ToBuffer(ciphertext);

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: ivBytes.buffer as ArrayBuffer },
    derivedAesKey,
    encryptedBytes.buffer as ArrayBuffer,
  );

  return new TextDecoder().decode(decrypted);
}

export function getSessionId(): string | null {
  return currentSessionId;
}

export function isSessionActive(): boolean {
  return derivedAesKey !== null && currentSessionId !== null;
}

export function destroyE2ESession(): void {
  keyPair = null;
  derivedAesKey = null;
  currentSessionId = null;
}

function bufferToHex(buffer: Uint8Array): string {
  return Array.from(buffer)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function hexToBuffer(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

function bufferToBase64(buffer: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < buffer.length; i++) {
    binary += String.fromCharCode(buffer[i]!);
  }
  return btoa(binary);
}

function base64ToBuffer(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
