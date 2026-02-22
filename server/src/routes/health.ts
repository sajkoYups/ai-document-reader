import { Router } from "express";
import { checkOllamaHealth } from "../services/ollamaService.js";
import { getActiveSessionCount } from "../services/cryptoService.js";

export const healthRouter = Router();

healthRouter.get("/", async (_req, res) => {
  const ollamaOk = await checkOllamaHealth();

  res.json({
    status: ollamaOk ? "healthy" : "degraded",
    ollama: ollamaOk ? "connected" : "unavailable",
    activeSessions: getActiveSessionCount(),
    timestamp: Date.now(),
  });
});
