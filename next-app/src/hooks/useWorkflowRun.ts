import { useCallback, useRef, useState } from "react";
import { z } from "zod";
import { useAiStore } from "@/store/aiStore";
import { analyzeViaApi } from "@/lib/apiClient";
import { parsePartialJson, stripFences } from "@/workflows/parsePartial";
import { getRepairPrompt, getSchemaHint } from "@/workflows/prompts";
import { hasMeaningfulResult } from "@/workflows/resultQuality";
import { workflowToTaskType, type ExtractType, type WorkflowId } from "@/workflows/types";
import { SummaryResultSchema } from "@/workflows/schemas/summarize";
import type { TaskType } from "@/types";

const MAX_ERROR_CHARS = 280;
const LOG_PREVIEW_CHARS = 600;

function truncateError(message: string): string {
  const trimmed = message.trim();
  if (trimmed.length <= MAX_ERROR_CHARS) return trimmed;
  return `${trimmed.slice(0, MAX_ERROR_CHARS - 1)}…`;
}

function previewText(text: string, max = LOG_PREVIEW_CHARS): string {
  const trimmed = text.replace(/\s+/g, " ").trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max)}…`;
}

function summarizeParsed(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object") {
    return { type: typeof value };
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj);
  return {
    keys,
    overviewLen:
      typeof obj.overview === "string" ? obj.overview.trim().length : null,
    keyPointsLen: Array.isArray(obj.keyPoints) ? obj.keyPoints.length : null,
    findingsLen: Array.isArray(obj.findings) ? obj.findings.length : null,
    assessment: typeof obj.assessment === "string" ? obj.assessment : null,
  };
}

function logWorkflow(
  event: string,
  details: Record<string, unknown>,
): void {
  console.info(`[workflow] ${event}`, details);
}

export function proseToSummary(text: string) {
  const cleaned = stripFences(text).trim();
  const lines = cleaned.split("\n").map((l) => l.trim()).filter(Boolean);
  const keyPoints: { text: string; evidenceIds: string[] }[] = [];
  const overviewParts: string[] = [];
  for (const line of lines) {
    const numbered = line.match(/^\d+[\.)]\s+(.*)$/);
    const bullet = line.match(/^[-*]\s+(.*)$/);
    if (numbered) keyPoints.push({ text: numbered[1]!, evidenceIds: [] });
    else if (bullet) keyPoints.push({ text: bullet[1]!, evidenceIds: [] });
    else if (!/^#{1,6}\s/.test(line) && !/^overview$/i.test(line) && !/^key points?$/i.test(line)) {
      overviewParts.push(line.replace(/\*\*/g, ""));
    }
  }
  return SummaryResultSchema.parse({
    overview: overviewParts.slice(0, 3).join(" "),
    keyPoints,
    numbers: [],
    peopleOrgs: [],
    dates: [],
    attention: [],
  });
}

interface RunArgs {
  workflowId: WorkflowId;
  documentText: string;
  schema: z.ZodType;
  extractType?: ExtractType;
  customQuery?: string;
}

export function useWorkflowRun() {
  const [raw, setRaw] = useState("");
  const [partial, setPartial] = useState<unknown | null>(null);
  const [validated, setValidated] = useState<unknown | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRepairing, setIsRepairing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastArgs = useRef<RunArgs | null>(null);
  const cancelled = useRef(false);

  const runTask = useAiStore((s) => s.runTask);
  const cancelTask = useAiStore((s) => s.cancelTask);
  const processingMode = useAiStore((s) => s.processingMode);
  const outputLanguage = useAiStore((s) => s.outputLanguage);

  const failTerminal = (message: string) => {
    setPartial(null);
    setValidated(null);
    setError(truncateError(message));
    setIsProcessing(false);
    setIsRepairing(false);
  };

  const applyToken = (token: string) => {
    setRaw((prev) => {
      const next = prev + token;
      const parsed = parsePartialJson(next);
      if (parsed && typeof parsed === "object") setPartial(parsed);
      return next;
    });
  };

  const finishWith = (
    full: string,
    schema: z.ZodType,
    workflowId: WorkflowId,
    attempt: "first" | "repair",
  ) => {
    const parsed = parsePartialJson(full);
    logWorkflow("finish:raw", {
      attempt,
      workflowId,
      rawChars: full.length,
      rawPreview: previewText(full),
      parsed: parsed ? summarizeParsed(parsed) : null,
    });

    if (parsed) {
      const result = schema.safeParse(parsed);
      if (result.success) {
        const meaningful = hasMeaningfulResult(workflowId, result.data);
        logWorkflow("finish:zod-ok", {
          attempt,
          workflowId,
          meaningful,
          parsed: summarizeParsed(result.data),
        });
        if (!meaningful) {
          return {
            ok: false as const,
            parsed,
            error: "Result was empty or incomplete",
          };
        }
        setValidated(result.data);
        setPartial(result.data);
        setIsProcessing(false);
        setIsRepairing(false);
        return { ok: true as const };
      }
      logWorkflow("finish:zod-fail", {
        attempt,
        workflowId,
        error: result.error.message,
        parsed: summarizeParsed(parsed),
      });
      return { ok: false as const, parsed, error: result.error.message };
    }
    if (workflowId === "summarize") {
      try {
        const fallback = proseToSummary(full);
        const meaningful = hasMeaningfulResult("summarize", fallback);
        logWorkflow("finish:prose-fallback", {
          attempt,
          meaningful,
          parsed: summarizeParsed(fallback),
        });
        if (!meaningful) {
          return {
            ok: false as const,
            parsed: null,
            error: "Result was empty or incomplete",
          };
        }
        setValidated(fallback);
        setPartial(fallback);
        setIsProcessing(false);
        setIsRepairing(false);
        return { ok: true as const };
      } catch (err) {
        logWorkflow("finish:prose-fallback-error", {
          attempt,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
    logWorkflow("finish:unparsed", { attempt, workflowId, rawChars: full.length });
    return { ok: false as const, parsed: null, error: "Could not parse structured result" };
  };

  const streamOnce = useCallback(
    async (args: RunArgs, repairOf?: string) => {
      const taskType = workflowToTaskType(args.workflowId);
      const documentText = repairOf
        ? `${args.documentText}\n\n${repairOf}`
        : args.documentText;

      if (processingMode === "api") {
        const full = await analyzeViaApi(
          taskType as TaskType,
          documentText,
          outputLanguage,
          applyToken,
          {
            workflowId: args.workflowId,
            jsonMode: true,
            workflowParams: {
              extractType: args.extractType,
              customQuery: args.customQuery,
            },
          },
        );
        return full;
      }

      return new Promise<string>((resolve, reject) => {
        let acc = "";
        runTask(
          taskType,
          documentText,
          undefined,
          (token) => {
            acc += token;
            applyToken(token);
          },
          (result) => resolve(result || acc),
          (err) => reject(new Error(err)),
        );
      });
    },
    [processingMode, outputLanguage, runTask],
  );

  const run = useCallback(
    async (args: RunArgs) => {
      lastArgs.current = args;
      cancelled.current = false;
      setRaw("");
      setPartial(null);
      setValidated(null);
      setError(null);
      setIsProcessing(true);
      setIsRepairing(false);

      try {
        logWorkflow("run:start", {
          workflowId: args.workflowId,
          processingMode,
          documentChars: args.documentText.length,
          documentPreview: previewText(args.documentText, 240),
          extractType: args.extractType ?? null,
        });
        const full = await streamOnce(args);
        if (cancelled.current) return;
        logWorkflow("run:stream-done", {
          attempt: "first",
          workflowId: args.workflowId,
          rawChars: full.length,
          rawPreview: previewText(full),
        });
        const first = finishWith(full, args.schema, args.workflowId, "first");
        if (first.ok) {
          logWorkflow("run:success", { attempt: "first", workflowId: args.workflowId });
          return;
        }

        logWorkflow("run:repair-start", {
          workflowId: args.workflowId,
          firstError: first.error,
        });
        setIsRepairing(true);
        setRaw("");
        setPartial(null);
        const repair = getRepairPrompt(
          getSchemaHint(args.workflowId, args.extractType, args.customQuery),
          first.error,
          full,
        );
        const repaired = await streamOnce(args, repair);
        if (cancelled.current) return;
        logWorkflow("run:stream-done", {
          attempt: "repair",
          workflowId: args.workflowId,
          rawChars: repaired.length,
          rawPreview: previewText(repaired),
        });
        const second = finishWith(repaired, args.schema, args.workflowId, "repair");
        if (second.ok) {
          logWorkflow("run:success", { attempt: "repair", workflowId: args.workflowId });
          return;
        }
        logWorkflow("run:failed", {
          workflowId: args.workflowId,
          firstError: first.error,
          secondError: second.error,
        });
        failTerminal(
          `This analysis could not be completed. ${second.error || first.error}`,
        );
      } catch (err) {
        if (cancelled.current) return;
        logWorkflow("run:exception", {
          workflowId: args.workflowId,
          error: err instanceof Error ? err.message : String(err),
        });
        failTerminal(err instanceof Error ? err.message : String(err));
      }
    },
    [streamOnce, processingMode],
  );

  const stop = useCallback(() => {
    cancelled.current = true;
    cancelTask();
    setPartial(null);
    setValidated(null);
    setIsProcessing(false);
    setIsRepairing(false);
  }, [cancelTask]);

  const reset = useCallback(() => {
    cancelled.current = true;
    setRaw("");
    setPartial(null);
    setValidated(null);
    setError(null);
    setIsProcessing(false);
    setIsRepairing(false);
  }, []);

  const rerun = useCallback(() => {
    if (lastArgs.current) void run(lastArgs.current);
  }, [run]);

  return {
    raw,
    partial,
    validated,
    isProcessing,
    isRepairing,
    error,
    run,
    stop,
    reset,
    rerun,
  };
}
