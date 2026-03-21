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

function sseDataPayload(line: string): string | null {
  const trimmed = line.trimEnd();
  if (!trimmed.startsWith("data:")) return null;
  const payload = trimmed.slice("data:".length).trimStart();
  if (!payload || payload === "[DONE]") return null;
  return payload;
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

  const consumeEncryptedPayload = async (data: string) => {
    let parsed: { iv: string; ciphertext: string };
    try {
      parsed = JSON.parse(data) as { iv: string; ciphertext: string };
    } catch {
      return;
    }
    if (typeof parsed.iv !== "string" || typeof parsed.ciphertext !== "string") {
      return;
    }

    let decrypted: string;
    try {
      decrypted = await decryptPayload(parsed.iv, parsed.ciphertext);
    } catch {
      return;
    }

    if (decrypted.startsWith("__ERROR__:")) {
      throw new Error(decrypted.slice(10));
    }

    fullResult += decrypted;
    onToken(decrypted);
  };

  const processLines = async (lines: string[]) => {
    for (const line of lines) {
      const data = sseDataPayload(line);
      if (data === null) continue;
      await consumeEncryptedPayload(data);
    }
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      await processLines(lines);
    }

    buffer += decoder.decode(new Uint8Array(), { stream: false });
    if (buffer.trim()) {
      await processLines(buffer.split("\n"));
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
