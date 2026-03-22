import { config } from "../config.js";
import type { OutputLanguage, TaskType } from "../types/index.js";
import { buildInferenceMessages } from "./ollamaService.js";

function normalizeOpenAiContent(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (part && typeof part === "object" && "text" in part) {
          const t = (part as { text?: unknown }).text;
          return typeof t === "string" ? t : "";
        }
        return "";
      })
      .join("");
  }
  return "";
}

function extractRunpodStreamText(chunk: unknown): string {
  if (chunk === null || typeof chunk !== "object") return "";
  const obj = chunk as Record<string, unknown>;

  if (obj.error && typeof obj.error === "object") {
    const msg = (obj.error as { message?: unknown }).message;
    if (typeof msg === "string" && msg.length > 0) {
      throw new Error(msg);
    }
  }

  const choices = obj.choices;
  if (!Array.isArray(choices) || choices.length === 0) return "";

  const choice0 = choices[0] as Record<string, unknown>;
  if (typeof choice0.text === "string" && choice0.text.length > 0) {
    return choice0.text;
  }

  const delta = choice0.delta as Record<string, unknown> | undefined;
  const message = choice0.message as Record<string, unknown> | undefined;

  const fromDelta = normalizeOpenAiContent(delta?.content);
  if (fromDelta.length > 0) return fromDelta;
  return normalizeOpenAiContent(message?.content);
}

export function getRunpodTaskMaxTokens(_taskType: TaskType): number {
  return Math.max(300, config.runpod.maxTokens);
}

export async function* streamRunpodInference(
  taskType: TaskType,
  documentText: string,
  userMessage?: string,
  conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>,
  outputLanguage: OutputLanguage = "en",
): AsyncGenerator<string> {
  const messages = buildInferenceMessages(
    taskType,
    documentText,
    userMessage,
    conversationHistory,
    outputLanguage,
  );

  const response = await fetch(`${config.runpod.baseUrl}/v1/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(config.runpod.timeoutMs),
    body: JSON.stringify({
      model: config.runpod.model,
      messages,
      stream: true,
      temperature: 0.2,
      max_tokens: getRunpodTaskMaxTokens(taskType),
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "unknown error");
    throw new Error(`RunPod request failed (${response.status}): ${text}`);
  }

  if (!response.body) {
    throw new Error("No response body from RunPod");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const yieldTokensFromSseLine = async function* (rawLine: string) {
    const line = rawLine.trim();
    if (!line.startsWith("data:")) return;

    const data = line.slice("data:".length).trim();
    if (!data || data === "[DONE]") return;

    let chunk: unknown;
    try {
      chunk = JSON.parse(data);
    } catch {
      return;
    }
    try {
      const text = extractRunpodStreamText(chunk);
      if (text.length > 0) yield text;
    } catch (e) {
      if (e instanceof Error) throw e;
    }
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const rawLine of lines) {
        yield* yieldTokensFromSseLine(rawLine);
      }
    }

    buffer += decoder.decode(new Uint8Array(), { stream: false });
    for (const rawLine of buffer.split("\n")) {
      yield* yieldTokensFromSseLine(rawLine);
    }
  } finally {
    reader.releaseLock();
  }
}

export async function checkRunpodHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${config.runpod.baseUrl}/v1/models`, {
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
}
