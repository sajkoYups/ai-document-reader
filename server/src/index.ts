import "dotenv/config";
import express from "express";
import { config } from "./config.js";
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
  if (config.deepAnalysis.provider === "runpod") {
    console.log(`RunPod endpoint: ${config.runpod.baseUrl}`);
    console.log(`RunPod model: ${config.runpod.model}`);
  } else {
    console.log(`Ollama endpoint: ${config.ollama.baseUrl}`);
    console.log(`Ollama model: ${config.ollama.model}`);
  }
});
