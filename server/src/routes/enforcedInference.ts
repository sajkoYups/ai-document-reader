import type { Response } from "express";
import { config } from "../config.js";
import { MESSAGE_TOKEN_OVERHEAD, estimateHold } from "../usage/plans.js";
import { beginHostedCall, finishHostedCall, noteStreaming } from "../usage/hostedCall.js";
import { withDbClient } from "../usage/db.js";
import { markSubmittedWithClient } from "../usage/reservationSql.js";
import { readProviderUsage, type FinishInput } from "../usage/reservation.js";
import { lookupGenerationUsage, toProviderNumbers } from "../usage/generationLookup.js";
import { buildInferenceMessages } from "../services/ollamaService.js";
import { getOpenrouterTaskMaxTokens } from "../services/openrouterService.js";
import {
  streamDeepInference,
  toClientSafeInferenceError,
} from "../services/llmService.js";
import { encrypt } from "../services/cryptoService.js";
import type { OutputLanguage, StreamCompletionMeta, TaskType } from "../types/index.js";

interface StreamBody {
  taskType: TaskType;
  documentText: string;
  userMessage?: string;
  conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>;
  outputLanguage: OutputLanguage;
  workflowId?: string;
  operation?: string;
  idempotencyKey?: string;
  parentIdempotencyKey?: string;
  route?: "analyze" | "chat";
  clientPlan?: string;
  metered?: boolean;
  jsonMode?: boolean;
  customQuery?: string;
  extractType?: string;
  aesKey: Buffer;
  res: Response;
  retryEmpty: boolean;
  userId: string;
}

function promptCharge(
  messages: Array<{ content: string }>,
): { inputBytes: number; inputCharge: number } {
  const inputBytes = messages.reduce(
    (sum, message) => sum + Buffer.byteLength(message.content),
    0,
  );
  return {
    inputBytes,
    inputCharge: inputBytes + MESSAGE_TOKEN_OVERHEAD * messages.length,
  };
}

async function lookup(id: string) {
  const found = await lookupGenerationUsage({
    id,
    apiKey: config.openrouter.apiKey,
    baseUrl: config.openrouter.baseUrl,
    fetchImpl: fetch,
  });
  return found ? toProviderNumbers(found) : null;
}

export async function runEnforcedStream(body: StreamBody): Promise<void> {
  const messages = buildInferenceMessages(
    body.taskType,
    body.documentText,
    body.userMessage,
    body.conversationHistory,
    body.outputLanguage,
    {
      jsonMode: body.jsonMode,
      extractType: body.extractType,
      customQuery: body.customQuery,
    },
  );
  const charge = promptCharge(messages);
  const maxOutputTokens = getOpenrouterTaskMaxTokens(body.taskType);
  const hold = estimateHold(charge.inputBytes, messages.length, maxOutputTokens);
  const now = new Date();

  const begun = await withDbClient((query) =>
    beginHostedCall(
      {
        userId: body.userId,
        workflowId: body.workflowId,
        operation: body.operation,
        idempotencyKey: body.idempotencyKey,
        parentIdempotencyKey: body.parentIdempotencyKey,
        route: body.route ?? "analyze",
        clientPlan: body.clientPlan,
        metered: body.metered,
        hold,
        inputCharge: charge.inputCharge,
        now,
      },
      query,
    ),
  );
  if (!begun.ok) {
    body.res.status(begun.status).json({ error: begun.error });
    return;
  }

  const submitted = await withDbClient((query) =>
    markSubmittedWithClient(query, begun.reservationId, new Date()),
  );
  if (!submitted) {
    await withDbClient((query) =>
      finishHostedCall(
        query,
        begun.reservationId,
        {
          outcome: "error_before_provider",
          providerAttempted: false,
          hold,
          consumesSlot: begun.consumesSlot,
          inputCharge: charge.inputCharge,
          outputBytes: 0,
          usage: null,
          generationId: null,
          lookup: async () => null,
        },
        new Date(),
      ),
    ).catch((error: unknown) => {
      console.error("[quota] could not release an unsubmitted reservation", error);
    });
    body.res.status(503).json({
      error: "Deep Analysis is unavailable until usage can be checked. Try again in a moment.",
    });
    return;
  }

  body.res.setHeader("Content-Type", "text/event-stream");
  body.res.setHeader("Cache-Control", "no-cache");
  body.res.setHeader("Connection", "keep-alive");
  body.res.setHeader("X-Accel-Buffering", "no");

  const runOnce = async (reservationId: string) => {
    const streamMeta: StreamCompletionMeta = {};
    let completion = "";
    let outputBytes = 0;
    let marked = false;
    let failed: unknown = null;
    try {
      for await (const token of streamDeepInference(
        body.taskType,
        body.documentText,
        body.userMessage,
        body.conversationHistory,
        body.outputLanguage,
        {
          jsonMode: body.jsonMode,
          extractType: body.extractType,
          customQuery: body.customQuery,
          streamMeta,
        },
      )) {
        if (!marked) {
          marked = true;
          await withDbClient((query) =>
            noteStreaming(query, reservationId, streamMeta.generationId ?? null, new Date()),
          ).catch((error: unknown) => {
            console.error("[quota] could not mark streaming", error);
          });
        }
        outputBytes += Buffer.byteLength(token);
        completion += token;
        const encrypted = encrypt(body.aesKey, token);
        body.res.write(`data: ${JSON.stringify(encrypted)}\n\n`);
        if (outputBytes >= maxOutputTokens) break;
      }
    } catch (error) {
      failed = error;
    }

    const outcome: FinishInput["outcome"] = failed
      ? streamMeta.generationId || outputBytes > 0
        ? "interrupted"
        : "error_before_provider"
      : "completed";
    const usage = readProviderUsage(streamMeta.usage);
    if (streamMeta.model) usage.model = streamMeta.model;
    await withDbClient((query) =>
      finishHostedCall(
        query,
        reservationId,
        {
          outcome,
          providerAttempted: true,
          hold,
          consumesSlot: begun.consumesSlot,
          inputCharge: charge.inputCharge,
          outputBytes,
          usage: streamMeta.usage ? usage : null,
          generationId: streamMeta.generationId ?? null,
          lookup: () => lookup(streamMeta.generationId ?? ""),
        },
        new Date(),
      ),
    ).catch((error: unknown) => {
      console.error("[quota] settlement failed", error);
    });
    return { completion, failed };
  };

  const first = await runOnce(begun.reservationId);
  if (!first.failed && first.completion.length === 0 && body.retryEmpty && body.idempotencyKey) {
    const retry = await withDbClient((query) =>
      beginHostedCall(
        {
          userId: body.userId,
          workflowId: body.workflowId,
          operation: body.operation,
          idempotencyKey: `${body.idempotencyKey}:retry`,
          parentIdempotencyKey: body.parentIdempotencyKey,
          route: body.route ?? "analyze",
          clientPlan: body.clientPlan,
          metered: body.metered,
          hold,
          inputCharge: charge.inputCharge,
          now: new Date(),
        },
        query,
      ),
    );
    if (retry.ok) {
      const second = await runOnce(retry.reservationId);
      if (second.failed) {
        const message = toClientSafeInferenceError(second.failed);
        const encrypted = encrypt(body.aesKey, `__ERROR__:${message}`);
        body.res.write(`data: ${JSON.stringify(encrypted)}\n\n`);
      }
    }
  } else if (first.failed) {
    const message = toClientSafeInferenceError(first.failed);
    const encrypted = encrypt(body.aesKey, `__ERROR__:${message}`);
    body.res.write(`data: ${JSON.stringify(encrypted)}\n\n`);
  }

  body.res.write("data: [DONE]\n\n");
  body.res.end();
}
