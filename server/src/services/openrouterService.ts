import { config, isOpenRouterConfigured } from "../config.js";
import type { InferenceOptions, OutputLanguage, TaskType } from "../types/index.js";
import { taskUsesJsonMode } from "../types/index.js";
import { buildInferenceMessages } from "./ollamaService.js";
import {
  fetchStreamingChatCompletion,
  streamOpenAiSseTokens,
} from "./openaiCompatibleStream.js";

export function getOpenrouterTaskMaxTokens(_taskType: TaskType): number {
  return Math.max(300, config.openrouter.maxTokens);
}

function buildOpenRouterHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${config.openrouter.apiKey}`,
    "HTTP-Referer": config.openrouter.siteUrl,
    "X-Title": config.openrouter.appName,
  };
}

function buildProviderPreferences(): Record<string, unknown> {
  const prefs: Record<string, unknown> = {
    data_collection: config.openrouter.dataCollection,
  };
  if (config.openrouter.providerOnly.length > 0) {
    prefs.only = config.openrouter.providerOnly;
  }
  if (config.openrouter.zdr) {
    prefs.zdr = true;
  }
  return prefs;
}

/**
 * Opens the OpenRouter chat completion stream and returns the Response
 * before any tokens are consumed — used for pre-stream failover decisions.
 */
export async function openOpenrouterChatCompletion(
  taskType: TaskType,
  documentText: string,
  userMessage?: string,
  conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>,
  outputLanguage: OutputLanguage = "en",
  options?: InferenceOptions,
): Promise<Response> {
  if (!isOpenRouterConfigured()) {
    throw new Error("OpenRouter is not configured (missing OPENROUTER_API_KEY)");
  }

  const messages = buildInferenceMessages(
    taskType,
    documentText,
    userMessage,
    conversationHistory,
    outputLanguage,
    options,
  );

  const jsonMode = taskUsesJsonMode(taskType, options?.jsonMode);

  const response = await fetchStreamingChatCompletion(
    `${config.openrouter.baseUrl}/chat/completions`,
    {
      method: "POST",
      headers: buildOpenRouterHeaders(),
      body: JSON.stringify({
        model: config.openrouter.model,
        messages,
        stream: true,
        temperature: 0.2,
        max_tokens: getOpenrouterTaskMaxTokens(taskType),
        provider: buildProviderPreferences(),
        ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
      }),
    },
    config.openrouter.timeoutMs,
  );

  if (!response.ok) {
    const text = await response.text().catch(() => "unknown error");
    throw new Error(`OpenRouter request failed (${response.status}): ${text}`);
  }

  if (!response.body) {
    throw new Error("No response body from OpenRouter");
  }

  return response;
}

export async function* streamOpenrouterInference(
  taskType: TaskType,
  documentText: string,
  userMessage?: string,
  conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>,
  outputLanguage: OutputLanguage = "en",
  options?: InferenceOptions,
): AsyncGenerator<string> {
  const response = await openOpenrouterChatCompletion(
    taskType,
    documentText,
    userMessage,
    conversationHistory,
    outputLanguage,
    options,
  );

  yield* streamOpenAiSseTokens(response.body!, {
    idleMs: config.openrouter.timeoutMs,
  });
}

/**
 * Yields from an already-opened successful OpenRouter response body.
 */
export async function* streamOpenrouterFromResponse(
  response: Response,
): AsyncGenerator<string> {
  if (!response.body) {
    throw new Error("No response body from OpenRouter");
  }
  yield* streamOpenAiSseTokens(response.body, {
    idleMs: config.openrouter.timeoutMs,
  });
}

export async function checkOpenrouterHealth(): Promise<boolean> {
  if (!isOpenRouterConfigured()) return false;
  try {
    const response = await fetch(`${config.openrouter.baseUrl}/models`, {
      headers: {
        Authorization: `Bearer ${config.openrouter.apiKey}`,
      },
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
}
