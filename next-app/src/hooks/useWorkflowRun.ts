import { useCallback, useRef, useState } from "react";
import { z } from "zod";
import { useAiStore } from "@/store/aiStore";
import { analyzeViaApi } from "@/lib/apiClient";
import { parsePartialJson, stripFences } from "@/workflows/parsePartial";
import { getRepairPrompt, getRefinePrompt, getSchemaHint } from "@/workflows/prompts";
import { hasMeaningfulResult, isDegenerateRawCompletion } from "@/workflows/resultQuality";
import { workflowToTaskType, type ExtractType, type WorkflowId } from "@/workflows/types";
import { SummaryResultSchema } from "@/workflows/schemas/summarize";
import type { TaskType } from "@/types";

const MAX_ERROR_CHARS = 280;

function truncateError(message: string): string {
  const trimmed = message.trim();
  if (trimmed.length <= MAX_ERROR_CHARS) return trimmed;
  return `${trimmed.slice(0, MAX_ERROR_CHARS - 1)}…`;
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

/** Keep last complete rows when the current array item is still streaming. */
function coerceStreamingResult(schema: z.ZodType, parsed: unknown): unknown | null {
  const direct = schema.safeParse(parsed);
  if (direct.success) return direct.data;
  if (!parsed || typeof parsed !== "object") return null;

  const obj = { ...(parsed as Record<string, unknown>) };
  let dropped = false;
  for (const key of Object.keys(obj)) {
    const value = obj[key];
    if (Array.isArray(value) && value.length > 0) {
      obj[key] = value.slice(0, -1);
      dropped = true;
    }
  }
  if (!dropped) return null;
  const retry = schema.safeParse(obj);
  return retry.success ? retry.data : null;
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
  const lastDataRef = useRef<unknown | null>(null);
  const cancelled = useRef(false);
  const rawRef = useRef("");

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
    rawRef.current += token;
    const next = rawRef.current;
    setRaw(next);
    const parsed = parsePartialJson(next);
    if (!parsed || typeof parsed !== "object") return;
    const schema = lastArgs.current?.schema;
    const nextPartial = schema ? coerceStreamingResult(schema, parsed) : parsed;
    if (!nextPartial) return;
    const workflowId = lastArgs.current?.workflowId;
    if (workflowId && !hasMeaningfulResult(workflowId, nextPartial)) {
      setPartial((prev: unknown | null) => prev ?? nextPartial);
      return;
    }
    setPartial(nextPartial);
  };

  const finishWith = (
    full: string,
    schema: z.ZodType,
    workflowId: WorkflowId,
    attempt: "first" | "repair",
  ) => {
    if (!full.trim() || isDegenerateRawCompletion(full)) {
      logWorkflow("finish:empty", {
        attempt,
        workflowId,
        rawChars: full.length,
      });
      return {
        ok: false as const,
        parsed: null,
        error: "The model returned an empty response",
      };
    }

    const parsed = parsePartialJson(full);
    logWorkflow("finish:raw", {
      attempt,
      workflowId,
      rawChars: full.length,
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
        lastDataRef.current = result.data;
        setIsProcessing(false);
        setIsRepairing(false);
        return { ok: true as const, data: result.data };
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
        lastDataRef.current = fallback;
        setIsProcessing(false);
        setIsRepairing(false);
        return { ok: true as const, data: fallback };
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
      rawRef.current = "";
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
          extractType: args.extractType ?? null,
        });
        const full = await streamOnce(args);
        if (cancelled.current) return;
        logWorkflow("run:stream-done", {
          attempt: "first",
          workflowId: args.workflowId,
          rawChars: full.length,
        });
        const first = finishWith(full, args.schema, args.workflowId, "first");
        if (first.ok) {
          logWorkflow("run:success", { attempt: "first", workflowId: args.workflowId });
          return { ok: true as const, data: first.data };
        }

        if (!full.trim()) {
          logWorkflow("run:failed", {
            workflowId: args.workflowId,
            firstError: first.error,
            skippedRepair: true,
          });
          const error = `This analysis could not be completed. ${first.error}`;
          failTerminal(error);
          return { ok: false as const, error };
        }

        logWorkflow("run:repair-start", {
          workflowId: args.workflowId,
          firstError: first.error,
        });
        setIsRepairing(true);
        rawRef.current = "";
        setRaw("");
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
        });
        const second = finishWith(repaired, args.schema, args.workflowId, "repair");
        if (second.ok) {
          logWorkflow("run:success", { attempt: "repair", workflowId: args.workflowId });
          return { ok: true as const, data: second.data };
        }
        logWorkflow("run:failed", {
          workflowId: args.workflowId,
          firstError: first.error,
          secondError: second.error,
        });
        const error = `This analysis could not be completed. ${second.error || first.error}`;
        failTerminal(error);
        return { ok: false as const, error };
      } catch (err) {
        if (cancelled.current) return;
        logWorkflow("run:exception", {
          workflowId: args.workflowId,
          error: err instanceof Error ? err.message : String(err),
        });
        const error = err instanceof Error ? err.message : String(err);
        failTerminal(error);
        return { ok: false as const, error };
      }
    },
    [streamOnce, processingMode],
  );

  const refine = useCallback(
    async (extraContext: string) => {
      const args = lastArgs.current;
      const draft = lastDataRef.current;
      if (!args || !draft || cancelled.current) return;
      if (processingMode !== "api") return { ok: true as const, data: draft };

      setIsRepairing(true);
      setIsProcessing(true);
      rawRef.current = "";
      setRaw("");
      try {
        const prompt = getRefinePrompt(JSON.stringify(draft), extraContext);
        const full = await streamOnce(args, prompt);
        if (cancelled.current) return;
        const finished = finishWith(full, args.schema, args.workflowId, "repair");
        if (finished.ok) return { ok: true as const, data: finished.data };
        // Keep the first-pass draft if refine fails.
        setValidated(draft);
        setPartial(draft);
        setIsProcessing(false);
        setIsRepairing(false);
        return { ok: true as const, data: draft };
      } catch {
        setValidated(draft);
        setPartial(draft);
        setIsProcessing(false);
        setIsRepairing(false);
        return { ok: true as const, data: draft };
      }
    },
    [streamOnce, processingMode],
  );

  const stop = useCallback(() => {
    cancelled.current = true;
    cancelTask();
    rawRef.current = "";
    setPartial(null);
    setValidated(null);
    setIsProcessing(false);
    setIsRepairing(false);
  }, [cancelTask]);

  const reset = useCallback(() => {
    cancelled.current = true;
    rawRef.current = "";
    lastDataRef.current = null;
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
    refine,
    stop,
    reset,
    rerun,
  };
}
