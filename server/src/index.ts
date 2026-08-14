import "dotenv/config";
import express from "express";
import { config, isOpenRouterConfigured } from "./config.js";
import { applySecurity } from "./middleware/security.js";
import { requireTrustedProxy } from "./middleware/auth.js";
import { analyzeRouter } from "./routes/analyze.js";
import { chatRouter } from "./routes/chat.js";
import { sessionRouter } from "./routes/session.js";
import { healthRouter } from "./routes/health.js";
import { startSessionCleanup } from "./services/cryptoService.js";

const app = express();

applySecurity(app);

if (!config.trustedProxy.secret) {
  throw new Error(
    "Missing TRUSTED_PROXY_SECRET. Backend API shielding requires this secret.",
  );
}

if (
  config.deepAnalysis.provider === "openrouter" &&
  !isOpenRouterConfigured()
) {
  throw new Error(
    "DEEP_ANALYSIS_LLM_PROVIDER=openrouter requires OPENROUTER_API_KEY.",
  );
}

app.use("/api", requireTrustedProxy);

app.use("/api/health", healthRouter);
app.use("/api/session", sessionRouter);
app.use("/api/analyze", analyzeRouter);
app.use("/api/chat", chatRouter);

startSessionCleanup();

app.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
  console.log(
    `Trusted proxy header: ${config.trustedProxy.headerName} (enabled)`,
  );
  console.log(`Deep provider: ${config.deepAnalysis.provider}`);
  if (config.deepAnalysis.provider === "openrouter") {
    console.log(`OpenRouter model: ${config.openrouter.model}`);
    console.log(
      `OpenRouter providers: ${config.openrouter.providerOnly.join(",") || "(any)"}`,
    );
  } else if (config.deepAnalysis.provider === "runpod") {
    console.log(`RunPod endpoint: ${config.runpod.baseUrl}`);
    console.log(`RunPod model: ${config.runpod.model}`);
    if (isOpenRouterConfigured()) {
      console.log(
        `OpenRouter fallback: enabled (model ${config.openrouter.model})`,
      );
    } else {
      console.log("OpenRouter fallback: not configured");
    }
  } else {
    console.log(`Ollama endpoint: ${config.ollama.baseUrl}`);
    console.log(`Ollama model: ${config.ollama.model}`);
  }
});
