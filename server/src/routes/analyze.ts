import { Router } from "express";
import { config } from "../config.js";
import { readClerkUserId } from "../middleware/auth.js";
import { decryptRequest } from "../middleware/encryption.js";
import { validateAnalyzeRequest } from "../middleware/validation.js";
import {
  streamDeepInference,
  toClientSafeInferenceError,
} from "../services/llmService.js";
import { encrypt, getSession } from "../services/cryptoService.js";
import {
  getMonthlyAnalysisQuota,
  quotaNotice,
  recordUsage,
  USAGE_CHECK_UNAVAILABLE,
} from "../services/usageService.js";
import {
  resolveTaskType,
  type StreamCompletionMeta,
} from "../types/index.js";
import { runEnforcedStream } from "./enforcedInference.js";

export const analyzeRouter = Router();

function resetStreamMeta(meta: StreamCompletionMeta) {
  delete meta.finishReason;
  delete meta.usage;
  delete meta.sawReasoning;
}

analyzeRouter.post("/", async (req, res) => {
  const userId = readClerkUserId(req.headers["x-clerk-user-id"]);
  const decrypted = decryptRequest(req.body, userId);
  if (!decrypted.success) {
    res.status(400).json({ error: decrypted.error });
    return;
  }

  const parsed = validateAnalyzeRequest(decrypted.data);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }

  const session = getSession(req.body.sessionId, userId);
  if (!session) {
    res.status(401).json({ error: "Invalid or expired session" });
    return;
  }

  const { taskType, documentText, outputLanguage, workflowId, jsonMode, workflowParams } =
    parsed.data;
  const resolvedType = resolveTaskType(workflowId, taskType);
  const metered = parsed.data.metered !== false;

  if (config.hostedQuotaEnforcement) {
    await runEnforcedStream({
      taskType: resolvedType,
      documentText,
      outputLanguage,
      workflowId,
      operation: parsed.data.operation,
      idempotencyKey: parsed.data.idempotencyKey,
      parentIdempotencyKey: parsed.data.parentIdempotencyKey,
      route: "analyze",
      clientPlan: parsed.data.plan,
      metered,
      jsonMode,
      customQuery: workflowParams?.customQuery,
      extractType: workflowParams?.extractType,
      aesKey: session.aesKey,
      res,
      retryEmpty: true,
      userId,
    });
    return;
  }

  if (metered) {
    if (!userId) {
      res.status(401).json({ error: "Sign in to use Deep Analysis." });
      return;
    }
    try {
      const quota = await getMonthlyAnalysisQuota(userId);
      if (quota.status === "blocked") {
        res.status(429).json({
          error:
            quotaNotice(quota) ??
            "You've reached this month's Deep Analysis limit.",
        });
        return;
      }
    } catch (err) {
      console.error("[analyze] usage check failed:", err);
      res.status(503).json({ error: USAGE_CHECK_UNAVAILABLE });
      return;
    }
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  let completionChars = 0;
  const streamMeta: StreamCompletionMeta = {};
  const inferenceOptions = {
    jsonMode,
    extractType: workflowParams?.extractType,
    customQuery: workflowParams?.customQuery,
    streamMeta,
  };

  try {
    const consume = async () => {
      for await (const token of streamDeepInference(
        resolvedType,
        documentText,
        undefined,
        undefined,
        outputLanguage,
        inferenceOptions,
      )) {
        completionChars += token.length;
        const encrypted = encrypt(session.aesKey, token);
        res.write(`data: ${JSON.stringify(encrypted)}\n\n`);
      }
    };

    await consume();
    if (completionChars === 0) {
      resetStreamMeta(streamMeta);
      await consume();
    }

    res.write("data: [DONE]\n\n");
    res.end();

    if (userId && completionChars > 0) {
      recordUsage(
        userId,
        documentText.length,
        completionChars,
        metered ? "analyze" : "analyze_assist",
      );
    }
  } catch (err) {
    const message = toClientSafeInferenceError(err);
    const encrypted = encrypt(session.aesKey, `__ERROR__:${message}`);
    res.write(`data: ${JSON.stringify(encrypted)}\n\n`);
    res.write("data: [DONE]\n\n");
    res.end();
  }
});
