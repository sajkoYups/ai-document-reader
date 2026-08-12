import { config } from "../config.js";
import type { OutputLanguage, TaskType } from "../types/index.js";
import { buildInferenceMessages } from "./ollamaService.js";
import { streamOpenAiSseTokens } from "./openaiCompatibleStream.js";

export function getRunpodTaskMaxTokens(_taskType: TaskType): number {
  return Math.max(300, config.runpod.maxTokens);
}

/**
 * Opens the RunPod chat completion stream and returns the Response
 * before any tokens are consumed — used for pre-stream failover decisions.
 */
export async function openRunpodChatCompletion(
  taskType: TaskType,
  documentText: string,
  userMessage?: string,
  conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>,
  outputLanguage: OutputLanguage = "en",
): Promise<Response> {
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

  return response;
}

export async function* streamRunpodInference(
  taskType: TaskType,
  documentText: string,
  userMessage?: string,
  conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>,
  outputLanguage: OutputLanguage = "en",
): AsyncGenerator<string> {
  const response = await openRunpodChatCompletion(
    taskType,
    documentText,
    userMessage,
    conversationHistory,
    outputLanguage,
  );

  yield* streamOpenAiSseTokens(response.body!);
}

export async function* streamRunpodFromResponse(
  response: Response,
): AsyncGenerator<string> {
  if (!response.body) {
    throw new Error("No response body from RunPod");
  }
  yield* streamOpenAiSseTokens(response.body);
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
