import { Router } from "express";
import { decryptRequest } from "../middleware/encryption.js";
import { validateAnalyzeRequest } from "../middleware/validation.js";
import {
  streamDeepInference,
  toClientSafeInferenceError,
} from "../services/llmService.js";
import { encrypt, getSession } from "../services/cryptoService.js";
import { recordUsage } from "../services/usageService.js";
import { resolveTaskType } from "../types/index.js";

export const analyzeRouter = Router();

const PREVIEW_CHARS = 800;

function previewText(text: string, max = PREVIEW_CHARS): string {
  const trimmed = text.replace(/\s+/g, " ").trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max)}…`;
}

analyzeRouter.post("/", async (req, res) => {
  const decrypted = decryptRequest(req.body);
  if (!decrypted.success) {
    res.status(400).json({ error: decrypted.error });
    return;
  }

  const parsed = validateAnalyzeRequest(decrypted.data);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error });
    return;
  }

  const session = getSession(req.body.sessionId);
  if (!session) {
    res.status(401).json({ error: "Invalid or expired session" });
    return;
  }

  const { taskType, documentText, outputLanguage, workflowId, jsonMode, workflowParams } =
    parsed.data;
  const resolvedType = resolveTaskType(workflowId, taskType);
  const userId = (req.headers["x-clerk-user-id"] as string | undefined) ?? "";

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  let completionChars = 0;
  let completion = "";
  const startedAt = Date.now();

  console.info("[analyze] start", {
    resolvedType,
    workflowId: workflowId ?? null,
    jsonMode: jsonMode ?? null,
    extractType: workflowParams?.extractType ?? null,
    outputLanguage,
    documentChars: documentText.length,
    documentPreview: previewText(documentText, 240),
  });

  try {
    for await (const token of streamDeepInference(
      resolvedType,
      documentText,
      undefined,
      undefined,
      outputLanguage,
      {
        jsonMode,
        extractType: workflowParams?.extractType,
        customQuery: workflowParams?.customQuery,
      },
    )) {
      completionChars += token.length;
      if (completion.length < PREVIEW_CHARS * 2) {
        completion += token;
      }
      const encrypted = encrypt(session.aesKey, token);
      res.write(`data: ${JSON.stringify(encrypted)}\n\n`);
    }
    res.write("data: [DONE]\n\n");
    res.end();

    console.info("[analyze] complete", {
      resolvedType,
      workflowId: workflowId ?? null,
      ms: Date.now() - startedAt,
      documentChars: documentText.length,
      completionChars,
      completionPreview: previewText(completion),
      emptyCompletion: completionChars === 0,
    });

    if (userId) {
      recordUsage(userId, documentText.length, completionChars, "analyze");
    }
  } catch (err) {
    const message = toClientSafeInferenceError(err);
    console.warn("[analyze] error", {
      resolvedType,
      workflowId: workflowId ?? null,
      ms: Date.now() - startedAt,
      documentChars: documentText.length,
      completionChars,
      completionPreview: previewText(completion),
      error: message,
      raw: err instanceof Error ? err.message : String(err),
    });
    const encrypted = encrypt(session.aesKey, `__ERROR__:${message}`);
    res.write(`data: ${JSON.stringify(encrypted)}\n\n`);
    res.write("data: [DONE]\n\n");
    res.end();
  }
});
