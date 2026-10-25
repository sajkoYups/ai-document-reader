import "dotenv/config";
import express from "express";
import { config, isOpenRouterConfigured } from "./config.js";
import { assertHostedProvider } from "./providerPolicy.js";
import { applySecurity } from "./middleware/security.js";
import { requireTrustedProxy } from "./middleware/auth.js";
import { analyzeRouter } from "./routes/analyze.js";
import { chatRouter } from "./routes/chat.js";
import { sessionRouter } from "./routes/session.js";
import { healthRouter } from "./routes/health.js";
import { ocrRouter } from "./routes/ocr.js";
import { startSessionCleanup } from "./services/cryptoService.js";
import { startHostedSweep } from "./usage/sweep.js";

const app = express();

applySecurity(app);

if (!config.trustedProxy.secret) {
  throw new Error(
    "Missing TRUSTED_PROXY_SECRET. Backend API shielding requires this secret.",
  );
}

assertHostedProvider(process.env.DEEP_ANALYSIS_LLM_PROVIDER);
if (!isOpenRouterConfigured()) {
  throw new Error(
    "DEEP_ANALYSIS_LLM_PROVIDER=openrouter requires OPENROUTER_API_KEY.",
  );
}

app.use("/api", requireTrustedProxy);

app.use("/api/health", healthRouter);
app.use("/api/session", sessionRouter);
app.use("/api/analyze", analyzeRouter);
app.use("/api/chat", chatRouter);
app.use("/api/ocr", ocrRouter);

startSessionCleanup();
startHostedSweep();

app.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
  console.log(
    `Trusted proxy header: ${config.trustedProxy.headerName} (enabled)`,
  );
  console.log("Deep provider: openrouter");
  console.log(`OpenRouter model: ${config.openrouter.model}`);
  console.log(
    `OpenRouter providers: ${config.openrouter.providerOnly.join(",") || "(any)"}`,
  );
  console.log(
    `Hosted quota enforcement: ${config.hostedQuotaEnforcement ? "on" : "off"}`,
  );
});
