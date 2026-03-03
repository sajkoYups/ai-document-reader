import { config } from "../config.js";
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

export function toClientSafeInferenceError(error: unknown): string {
  if (!(error instanceof Error)) return "Inference failed";
  const normalized = error.message.toLowerCase();
  if (normalized.includes("timeout")) {
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
  return "Inference failed";
}
