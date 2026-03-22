import { config } from "./config.js";
import type { OutputLanguage, TaskType } from "./types/index.js";
import { buildInferenceMessages } from "./services/ollamaService.js";
import { getRunpodTaskMaxTokens } from "./services/runpodService.js";

/** Rough chars-per-token estimate (aligned with client Qwen-style heuristic). */
const ESTIMATED_CHARS_PER_TOKEN = 4;

/** Max prior chat turns kept for Deep Analysis (each item is user or assistant). */
export const MAX_API_CHAT_HISTORY_MESSAGES = 24;

export function getDeepAnalysisContextLimit(): number {
  if (config.deepAnalysis.provider === "runpod") {
    return config.runpod.contextWindow;
  }
  return config.ollama.contextWindow;
}

function completionReserveTokens(taskType: TaskType): number {
  if (config.deepAnalysis.provider === "runpod") {
    return getRunpodTaskMaxTokens(taskType);
  }
  return 2048;
}

export function capConversationHistoryForDeepChat(
  history: Array<{ role: "user" | "assistant"; content: string }> | undefined,
): Array<{ role: "user" | "assistant"; content: string }> {
  if (!history?.length) return [];
  if (history.length <= MAX_API_CHAT_HISTORY_MESSAGES) return history;
  return history.slice(-MAX_API_CHAT_HISTORY_MESSAGES);
}

function estimateInputTokensFromMessages(
  messages: Array<{ content: string }>,
): number {
  const chars = messages.reduce((acc, m) => acc + m.content.length, 0);
  return Math.ceil(chars / ESTIMATED_CHARS_PER_TOKEN);
}

/**
 * Throws if the built prompt likely exceeds the configured context window
 * (input + reserved completion budget).
 */
export function assertDeepInferenceWithinContext(
  taskType: TaskType,
  documentText: string,
  userMessage: string | undefined,
  conversationHistory: Array<{
    role: "user" | "assistant";
    content: string;
  }> | undefined,
  outputLanguage: OutputLanguage,
): void {
  const messages = buildInferenceMessages(
    taskType,
    documentText,
    userMessage,
    conversationHistory,
    outputLanguage,
  );
  const inputTokens = estimateInputTokensFromMessages(messages);
  const limit = getDeepAnalysisContextLimit();
  const completionBudget = completionReserveTokens(taskType);
  if (inputTokens + completionBudget > limit) {
    throw new Error(
      `Request exceeds model context window (~${limit} tokens). Shorten the document, start a new chat, or use a smaller conversation history.`,
    );
  }
}
