import { getSession, decrypt } from "../services/cryptoService.js";
import type { EncryptedPayload } from "../types/index.js";

type DecryptResult =
  | { success: true; data: unknown }
  | { success: false; error: string };

/**
 * Decrypts an incoming encrypted request payload.
 * Expects { sessionId, iv, ciphertext } in the request body.
 */
export function decryptRequest(body: unknown): DecryptResult {
  if (
    !body ||
    typeof body !== "object" ||
    !("sessionId" in body) ||
    !("iv" in body) ||
    !("ciphertext" in body)
  ) {
    return { success: false, error: "Missing encrypted payload fields" };
  }

  const { sessionId, iv, ciphertext } = body as EncryptedPayload;

  if (
    typeof sessionId !== "string" ||
    typeof iv !== "string" ||
    typeof ciphertext !== "string"
  ) {
    return { success: false, error: "Invalid encrypted payload types" };
  }

  const session = getSession(sessionId);
  if (!session) {
    return { success: false, error: "Invalid or expired session" };
  }

  try {
    const plaintext = decrypt(session.aesKey, iv, ciphertext);
    const data = JSON.parse(plaintext) as unknown;
    return { success: true, data };
  } catch {
    return { success: false, error: "Decryption failed" };
  }
}
