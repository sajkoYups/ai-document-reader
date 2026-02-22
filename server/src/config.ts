export const config = {
  port: parseInt(process.env.PORT ?? "3001", 10),

  ollama: {
    baseUrl: process.env.OLLAMA_BASE_URL ?? "http://localhost:11434",
    model: process.env.OLLAMA_MODEL ?? "qwen2.5:3b",
    contextWindow: parseInt(process.env.OLLAMA_CONTEXT_WINDOW ?? "32768", 10),
  },

  cors: {
    origins: (process.env.CORS_ORIGINS ?? "http://localhost:5173")
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
