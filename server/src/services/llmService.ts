import { config } from "../config.js";
import { assertDeepInferenceWithinContext } from "../contextBudget.js";
import type { OutputLanguage, TaskType } from "../types/index.js";
import {
  checkOllamaHealth,
  streamInference as streamOllamaInference,
} from "./ollamaService.js";
import {
  checkRunpodHealth,
  streamRunpodInference,
} from "./runpodService.js";

export async function* streamDeepInference(
  taskType: TaskType,
  documentText: string,
  userMessage?: string,
  conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>,
  outputLanguage: OutputLanguage = "en",
): AsyncGenerator<string> {
  assertDeepInferenceWithinContext(
    taskType,
    documentText,
    userMessage,
    conversationHistory,
    outputLanguage,
  );

  if (config.deepAnalysis.provider === "runpod") {
    yield* streamRunpodInference(
      taskType,
      documentText,
      userMessage,
      conversationHistory,
      outputLanguage,
    );
    return;
  }

  yield* streamOllamaInference(
    taskType,
    documentText,
    userMessage,
    conversationHistory,
    outputLanguage,
  );
}

export async function checkDeepProviderHealth(): Promise<boolean> {
  if (config.deepAnalysis.provider === "runpod") {
    return checkRunpodHealth();
  }
  return checkOllamaHealth();
}

const MAX_CLIENT_ERROR_CHARS = 320;

function stripStackNoise(message: string): string {
  const firstLine = message.split(/\r?\n/)[0]?.trim() ?? "";
  return firstLine.length > 0 ? firstLine : message.trim();
}

/**
 * Maps provider/network errors to a short string safe to show in the UI.
 * Prefer real provider messages (e.g. context-length 400s) over a generic fallback.
 */
export function toClientSafeInferenceError(error: unknown): string {
  if (!(error instanceof Error)) return "Inference failed";

  const raw = stripStackNoise(error.message);
  const normalized = raw.toLowerCase();
  const name = error.name?.toLowerCase() ?? "";

  if (
    normalized.includes("timeout") ||
    name === "aborterror" ||
    normalized.includes("aborted") ||
    normalized.includes("the operation was aborted")
  ) {
    return "Inference timed out";
  }
  if (normalized.includes("401") || normalized.includes("403")) {
    return "Inference provider authentication failed";
  }
  if (normalized.includes("429")) {
    return "Inference provider is rate-limited";
  }
  if (/\b5\d\d\b/.test(normalized)) {
    return "Inference provider is unavailable";
  }

  // 400–499: often context length, bad request, model id — useful for debugging
  if (/\b4\d\d\b/.test(normalized) && raw.length > 0) {
    return raw.length > MAX_CLIENT_ERROR_CHARS
      ? `${raw.slice(0, MAX_CLIENT_ERROR_CHARS - 1)}…`
      : raw;
  }

  if (
    raw.length > 0 &&
    raw.length <= MAX_CLIENT_ERROR_CHARS &&
    !/\n\s*at\s+/i.test(error.message)
  ) {
    return raw;
  }

  return "Inference failed";
}
