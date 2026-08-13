import { Router } from "express";
import { decryptRequest } from "../middleware/encryption.js";
import { validateAnalyzeRequest } from "../middleware/validation.js";
import {
  streamDeepInference,
  toClientSafeInferenceError,
} from "../services/llmService.js";
import { encrypt, getSession } from "../services/cryptoService.js";
import { recordUsage } from "../services/usageService.js";
import {
  resolveTaskType,
  type StreamCompletionMeta,
} from "../types/index.js";

export const analyzeRouter = Router();

const PREVIEW_CHARS = 800;

function previewText(text: string, max = PREVIEW_CHARS): string {
  const trimmed = text.replace(/\s+/g, " ").trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max)}…`;
}

function summarizeUsage(usage: Record<string, unknown> | null | undefined) {
  if (!usage) return null;
  const details = usage.completion_tokens_details;
  const detailRecord =
    details && typeof details === "object" && !Array.isArray(details)
      ? (details as Record<string, unknown>)
      : undefined;
  return {
    prompt_tokens: usage.prompt_tokens ?? null,
    completion_tokens: usage.completion_tokens ?? null,
    total_tokens: usage.total_tokens ?? null,
    reasoning_tokens:
      detailRecord?.reasoning_tokens ?? usage.reasoning_tokens ?? null,
  };
}

function snapshotStreamMeta(meta: StreamCompletionMeta) {
  return {
    finishReason: meta.finishReason ?? null,
    usage: summarizeUsage(meta.usage),
    sawReasoning: meta.sawReasoning === true,
  };
}

function resetStreamMeta(meta: StreamCompletionMeta) {
  delete meta.finishReason;
  delete meta.usage;
  delete meta.sawReasoning;
}

/** True for empty or dummy JSON that satisfies json_object but has no fields. */
function isDegenerateCompletion(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return true;
  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (parsed === null) return true;
    if (typeof parsed !== "object") return false;
    if (Array.isArray(parsed)) return parsed.length === 0;
    const keys = Object.keys(parsed);
    if (keys.length === 0) return true;
    return keys.length === 1 && keys[0] === "";
  } catch {
    return false;
  }
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
  const streamMeta: StreamCompletionMeta = {};
  const inferenceOptions = {
    jsonMode,
    extractType: workflowParams?.extractType,
    customQuery: workflowParams?.customQuery,
    streamMeta,
  };

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
        if (completion.length < PREVIEW_CHARS * 2) {
          completion += token;
        }
        const encrypted = encrypt(session.aesKey, token);
        res.write(`data: ${JSON.stringify(encrypted)}\n\n`);
      }
    };

    await consume();
    if (completionChars === 0) {
      console.warn("[analyze] empty completion, retrying once", {
        resolvedType,
        workflowId: workflowId ?? null,
        extractType: workflowParams?.extractType ?? null,
        ...snapshotStreamMeta(streamMeta),
      });
      resetStreamMeta(streamMeta);
      await consume();
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
      degenerateCompletion: isDegenerateCompletion(completion),
      ...snapshotStreamMeta(streamMeta),
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
      ...snapshotStreamMeta(streamMeta),
    });
    const encrypted = encrypt(session.aesKey, `__ERROR__:${message}`);
    res.write(`data: ${JSON.stringify(encrypted)}\n\n`);
    res.write("data: [DONE]\n\n");
    res.end();
  }
});
