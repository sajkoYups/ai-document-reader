import {
  initE2ESession,
  encryptPayload,
  decryptPayload,
  isSessionActive,
  destroyE2ESession,
} from "./e2eEncryption";
import type { OutputLanguage, TaskType } from "@/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

async function ensureSession(): Promise<void> {
  if (!isSessionActive()) {
    await initE2ESession(API_BASE_URL);
  }
}

async function processSSEStream(
  response: Response,
  onToken: (token: string) => void,
): Promise<string> {
  if (!response.body) throw new Error("No response body");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let fullResult = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6).trim();

        if (data === "[DONE]") continue;

        try {
          const { iv, ciphertext } = JSON.parse(data) as {
            iv: string;
            ciphertext: string;
          };
          const decrypted = await decryptPayload(iv, ciphertext);

          if (decrypted.startsWith("__ERROR__:")) {
            throw new Error(decrypted.slice(10));
          }

          fullResult += decrypted;
          onToken(decrypted);
        } catch (e) {
          if (e instanceof Error && e.message.startsWith("__ERROR__:")) throw e;
          // skip malformed chunks
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  return fullResult;
}

export async function analyzeViaApi(
  taskType: TaskType,
  documentText: string,
  outputLanguage: OutputLanguage,
  onToken: (token: string) => void,
): Promise<string> {
  await ensureSession();

  const encrypted = await encryptPayload({
    taskType,
    documentText,
    outputLanguage: outputLanguage ?? "en",
  });

  const response = await fetch(`${API_BASE_URL}/api/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(encrypted),
  });

  if (!response.ok) {
    const error = await response.text().catch(() => "Request failed");
    throw new Error(`Analysis failed (${response.status}): ${error}`);
  }

  return processSSEStream(response, onToken);
}

export async function chatViaApi(
  documentText: string,
  message: string,
  conversationHistory: Array<{ role: string; content: string }>,
  outputLanguage: OutputLanguage,
  onToken: (token: string) => void,
): Promise<string> {
  await ensureSession();

  const encrypted = await encryptPayload({
    documentText,
    message,
    conversationHistory,
    outputLanguage: outputLanguage ?? "en",
  });

  const response = await fetch(`${API_BASE_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(encrypted),
  });

  if (!response.ok) {
    const error = await response.text().catch(() => "Request failed");
    throw new Error(`Chat failed (${response.status}): ${error}`);
  }

  return processSSEStream(response, onToken);
}

export async function checkApiHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/health`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return false;
    const data = (await response.json()) as { status: string };
    return data.status === "healthy";
  } catch {
    return false;
  }
}

export function destroyApiSession(): void {
  destroyE2ESession();
}
