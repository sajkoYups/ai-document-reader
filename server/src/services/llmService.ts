import { config } from "../config.js";
import { assertDeepInferenceWithinContext } from "../contextBudget.js";
import { assertHostedProvider } from "../providerPolicy.js";
import type { InferenceOptions, OutputLanguage, TaskType } from "../types/index.js";
import {
  checkOpenrouterHealth,
  streamOpenrouterInference,
} from "./openrouterService.js";

export async function* streamDeepInference(
  taskType: TaskType,
  documentText: string,
  userMessage?: string,
  conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>,
  outputLanguage: OutputLanguage = "en",
  options?: InferenceOptions,
): AsyncGenerator<string> {
  assertHostedProvider(
    config.deepAnalysis.provider === "openrouter" ? "openrouter" : undefined,
  );
  assertDeepInferenceWithinContext(
    taskType,
    documentText,
    userMessage,
    conversationHistory,
    outputLanguage,
    options,
  );

  yield* streamOpenrouterInference(
    taskType,
    documentText,
    userMessage,
    conversationHistory,
    outputLanguage,
    options,
  );
}

export async function checkDeepProviderHealth(): Promise<boolean> {
  if (config.deepAnalysis.provider !== "openrouter") return false;
  return checkOpenrouterHealth();
}

function stripStackNoise(message: string): string {
  const firstLine = message.split(/\r?\n/)[0]?.trim() ?? "";
  return firstLine.length > 0 ? firstLine : message.trim();
}

/** Maps provider errors to a short string that does not echo upstream text. */
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

  return "Inference failed";
}
