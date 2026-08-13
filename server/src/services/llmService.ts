import { config, isOpenRouterConfigured } from "../config.js";
import { assertDeepInferenceWithinContext } from "../contextBudget.js";
import type { InferenceOptions, OutputLanguage, TaskType } from "../types/index.js";
import {
  checkOllamaHealth,
  streamInference as streamOllamaInference,
} from "./ollamaService.js";
import {
  checkOpenrouterHealth,
  openOpenrouterChatCompletion,
  streamOpenrouterFromResponse,
  streamOpenrouterInference,
} from "./openrouterService.js";
import {
  checkRunpodHealth,
  openRunpodChatCompletion,
  streamRunpodFromResponse,
} from "./runpodService.js";

async function* streamRunpodWithOpenRouterFallback(
  taskType: TaskType,
  documentText: string,
  userMessage: string | undefined,
  conversationHistory:
    | Array<{ role: "user" | "assistant"; content: string }>
    | undefined,
  outputLanguage: OutputLanguage,
  options?: InferenceOptions,
): AsyncGenerator<string> {
  const canFallback = isOpenRouterConfigured();

  // Prefer a quick health check; if RunPod is down, skip straight to OpenRouter.
  if (canFallback) {
    const runpodOk = await checkRunpodHealth();
    if (!runpodOk) {
      console.warn(
        "Deep Analysis: RunPod unavailable, using OpenRouter fallback",
      );
      yield* streamOpenrouterInference(
        taskType,
        documentText,
        userMessage,
        conversationHistory,
        outputLanguage,
        options,
      );
      return;
    }
  }

  try {
    const response = await openRunpodChatCompletion(
      taskType,
      documentText,
      userMessage,
      conversationHistory,
      outputLanguage,
      options,
    );
    yield* streamRunpodFromResponse(response, options);
  } catch (error) {
    if (!canFallback) throw error;
    console.warn(
      "Deep Analysis: RunPod request failed before stream, using OpenRouter fallback",
    );
    // Open a fresh OpenRouter request (do not reuse any partial RunPod body).
    const response = await openOpenrouterChatCompletion(
      taskType,
      documentText,
      userMessage,
      conversationHistory,
      outputLanguage,
      options,
    );
    yield* streamOpenrouterFromResponse(response, options);
  }
}

export async function* streamDeepInference(
  taskType: TaskType,
  documentText: string,
  userMessage?: string,
  conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>,
  outputLanguage: OutputLanguage = "en",
  options?: InferenceOptions,
): AsyncGenerator<string> {
  assertDeepInferenceWithinContext(
    taskType,
    documentText,
    userMessage,
    conversationHistory,
    outputLanguage,
    options,
  );

  if (config.deepAnalysis.provider === "openrouter") {
    yield* streamOpenrouterInference(
      taskType,
      documentText,
      userMessage,
      conversationHistory,
      outputLanguage,
      options,
    );
    return;
  }

  if (config.deepAnalysis.provider === "runpod") {
    yield* streamRunpodWithOpenRouterFallback(
      taskType,
      documentText,
      userMessage,
      conversationHistory,
      outputLanguage,
      options,
    );
    return;
  }

  yield* streamOllamaInference(
    taskType,
    documentText,
    userMessage,
    conversationHistory,
    outputLanguage,
    options,
  );
}

export async function checkDeepProviderHealth(): Promise<boolean> {
  if (config.deepAnalysis.provider === "openrouter") {
    return checkOpenrouterHealth();
  }
  if (config.deepAnalysis.provider === "runpod") {
    const runpodOk = await checkRunpodHealth();
    if (runpodOk) return true;
    if (isOpenRouterConfigured()) {
      return checkOpenrouterHealth();
    }
    return false;
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
