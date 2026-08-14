import type { LlmProvider } from "./types/index.js";

function parseProvider(value: string | undefined): LlmProvider {
  if (value === "runpod") return "runpod";
  if (value === "openrouter") return "openrouter";
  return "ollama";
}

function parseProviderOnly(value: string | undefined): string[] {
  const raw = value ?? "azure,novita,deepinfra";
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function parseDataCollection(
  value: string | undefined,
): "allow" | "deny" {
  return value === "allow" ? "allow" : "deny";
}

export const config = {
  port: parseInt(process.env.PORT ?? "3001", 10),

  trustedProxy: {
    headerName: (
      process.env.TRUSTED_PROXY_HEADER_NAME ?? "x-internal-proxy-secret"
    ).toLowerCase(),
    secret: process.env.TRUSTED_PROXY_SECRET ?? "",
  },

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
        "180000",
      10,
    ),
    maxTokens: parseInt(
      process.env.RUNPOD_MAX_TOKENS ??
        process.env.RUNPOD_VLLM_MAX_TOKENS ??
        "800",
      10,
    ),
    /** vLLM / OpenAI provider context limit (input + max output must fit). */
    contextWindow: parseInt(
      process.env.RUNPOD_CONTEXT_WINDOW ??
        process.env.LLM_CONTEXT_WINDOW ??
        "8192",
      10,
    ),
  },

  openrouter: {
    apiKey: process.env.OPENROUTER_API_KEY ?? "",
    baseUrl:
      process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1",
    model: process.env.OPENROUTER_MODEL ?? "qwen/qwen2.5-7b-instruct",
    timeoutMs: parseInt(process.env.OPENROUTER_TIMEOUT_MS ?? "180000", 10),
    maxTokens: parseInt(process.env.OPENROUTER_MAX_TOKENS ?? "8192", 10),
    contextWindow: parseInt(
      process.env.OPENROUTER_CONTEXT_WINDOW ?? "8192",
      10,
    ),
    providerOnly: parseProviderOnly(process.env.OPENROUTER_PROVIDER_ONLY),
    zdr: process.env.OPENROUTER_ZDR !== "false",
    dataCollection: parseDataCollection(
      process.env.OPENROUTER_DATA_COLLECTION,
    ),
    siteUrl: process.env.OPENROUTER_SITE_URL ?? "https://doc-analyzer.example.com",
    appName: process.env.OPENROUTER_APP_NAME ?? "PIA",
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

/** True when OpenRouter can be used as primary or RunPod fallback. */
export function isOpenRouterConfigured(): boolean {
  return config.openrouter.apiKey.length > 0;
}
