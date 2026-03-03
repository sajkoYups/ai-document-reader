import type { LlmProvider } from "./types/index.js";

function parseProvider(value: string | undefined): LlmProvider {
  if (value === "runpod") return "runpod";
  return "ollama";
}

export const config = {
  port: parseInt(process.env.PORT ?? "3001", 10),

  deepAnalysis: {
    provider: parseProvider(process.env.DEEP_ANALYSIS_LLM_PROVIDER),
  },

  ollama: {
    baseUrl: process.env.OLLAMA_BASE_URL ?? "http://localhost:11434",
    model: process.env.OLLAMA_MODEL ?? "qwen2.5:3b",
    contextWindow: parseInt(process.env.OLLAMA_CONTEXT_WINDOW ?? "32768", 10),
  },

  runpod: {
    baseUrl:
      process.env.RUNPOD_BASE_URL ??
      process.env.RUNPOD_VLLM_BASE_URL ??
      "https://x7k139f7thbivr-8000.proxy.runpod.net",
    model:
      process.env.RUNPOD_MODEL ??
      process.env.RUNPOD_VLLM_MODEL ??
      "Qwen/Qwen2.5-7B-Instruct",
    timeoutMs: parseInt(
      process.env.RUNPOD_TIMEOUT_MS ??
        process.env.RUNPOD_VLLM_TIMEOUT_MS ??
        "60000",
      10,
    ),
    maxTokens: parseInt(
      process.env.RUNPOD_MAX_TOKENS ??
        process.env.RUNPOD_VLLM_MAX_TOKENS ??
        "800",
      10,
    ),
  },

  cors: {
    origins: (
      process.env.CORS_ORIGINS ??
      "http://localhost:3000,http://localhost:5173"
    )
      .split(",")
      .map((o) => o.trim()),
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS ?? "60000", 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS ?? "20", 10),
  },

  session: {
    ttlMs: parseInt(process.env.SESSION_TTL_MS ?? "1800000", 10),
  },
} as const;
