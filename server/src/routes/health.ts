import { Router } from "express";
import { config } from "../config.js";
import { checkDeepProviderHealth } from "../services/llmService.js";
import { getActiveSessionCount } from "../services/cryptoService.js";

export const healthRouter = Router();

healthRouter.get("/", async (_req, res) => {
  const providerOk = await checkDeepProviderHealth();

  res.json({
    status: providerOk ? "healthy" : "degraded",
    provider: config.deepAnalysis.provider,
    fallbackConfigured: false,
    deepAnalysis: providerOk ? "connected" : "unavailable",
    activeSessions: getActiveSessionCount(),
    timestamp: Date.now(),
  });
});
