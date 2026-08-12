import { Router } from "express";
import { config, isOpenRouterConfigured } from "../config.js";
import { checkDeepProviderHealth } from "../services/llmService.js";
import { getActiveSessionCount } from "../services/cryptoService.js";

export const healthRouter = Router();

healthRouter.get("/", async (_req, res) => {
  const providerOk = await checkDeepProviderHealth();
  const fallbackConfigured =
    config.deepAnalysis.provider === "runpod" && isOpenRouterConfigured();

  res.json({
    status: providerOk ? "healthy" : "degraded",
    provider: config.deepAnalysis.provider,
    fallbackConfigured,
    deepAnalysis: providerOk ? "connected" : "unavailable",
    activeSessions: getActiveSessionCount(),
    timestamp: Date.now(),
  });
});
