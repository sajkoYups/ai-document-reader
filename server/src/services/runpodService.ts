import { config } from "../config.js";
import type { OutputLanguage, TaskType } from "../types/index.js";
import { buildInferenceMessages } from "./ollamaService.js";

interface RunpodDeltaChunk {
  choices?: Array<{
    delta?: {
      content?: string;
    };
    message?: {
      content?: string;
    };
  }>;
}

function getTaskMaxTokens(taskType: TaskType): number {
  const base = Math.max(300, config.runpod.maxTokens);
  if (taskType === "chat") return base;
  if (taskType === "explain") return Math.min(base, 700);
  return Math.min(base, 500);
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
      max_tokens: getTaskMaxTokens(taskType),
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

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line.startsWith("data:")) continue;

        const data = line.slice("data:".length).trim();
        if (!data || data === "[DONE]") continue;

        try {
          const chunk = JSON.parse(data) as RunpodDeltaChunk;
          const text =
            chunk.choices?.[0]?.delta?.content ??
            chunk.choices?.[0]?.message?.content;
          if (text) yield text;
        } catch {
          // skip malformed chunks
        }
      }
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
