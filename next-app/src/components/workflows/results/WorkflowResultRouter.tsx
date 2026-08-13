"use client";

import { useRef, useState, type ReactNode } from "react";
import type { OutputLanguage } from "@/types";
import type { ExtractType, EvidenceReference as EvidenceRef, WorkflowId } from "@/workflows/types";
import type { SummaryResult } from "@/workflows/schemas/summarize";
import type { ReviewResult } from "@/workflows/schemas/review";
import type { ExtractResult } from "@/workflows/schemas/extract";
import { SummaryResultSchema } from "@/workflows/schemas/summarize";
import { ReviewResultSchema } from "@/workflows/schemas/review";
import { ExtractResultSchema } from "@/workflows/schemas/extract";
import { resolveEvidenceIds } from "@/workflows/evidence";
import { hasMeaningfulResult } from "@/workflows/resultQuality";
import { t } from "@/workflows/copy";
import Card from "@/components/Card";
import Button from "@/components/Button";
import SummaryResultView from "./SummaryResult";
import ReviewResultView from "./ReviewResult";
import ExtractionTable from "./ExtractionTable";
import { EmptyResult, WorkflowError } from "./EmptyResult";
import SourceViewer from "./SourceViewer";
import SuggestedFollowUps from "./SuggestedFollowUps";
import FollowUpBar from "./FollowUpBar";

interface WorkflowResultRouterProps {
  language: OutputLanguage;
  workflowId: WorkflowId;
  extractType: ExtractType;
  isProcessing: boolean;
  isRepairing: boolean;
  error: string | null;
  partial: unknown | null;
  validated: unknown | null;
  evidenceById: Record<string, EvidenceRef>;
  followUpKeys: string[];
  extraQuestions?: string[];
  includeFollowUps?: boolean;
  onRerun: () => void;
  onStop?: () => void;
  onAsk: (message: string) => void;
  onFollowUp: (text: string) => void;
}

export default function WorkflowResultRouter({
  language,
  workflowId,
  extractType,
  isProcessing,
  isRepairing,
  error,
  partial,
  validated,
  evidenceById,
  followUpKeys,
  extraQuestions,
  includeFollowUps = true,
  onRerun,
  onStop,
  onAsk,
  onFollowUp,
}: WorkflowResultRouterProps) {
  const [source, setSource] = useState<EvidenceRef | null>(null);
  const lastGoodRef = useRef<{ workflowId: WorkflowId; data: unknown } | null>(null);
  const incoming = validated ?? partial;

  let parsedData: unknown | null = null;
  if (workflowId === "summarize" && incoming) {
    const parsed = SummaryResultSchema.safeParse(incoming);
    if (parsed.success) parsedData = parsed.data;
  } else if (workflowId === "review" && incoming) {
    const parsed = ReviewResultSchema.safeParse(incoming);
    if (parsed.success) parsedData = parsed.data;
  } else if (workflowId === "extract" && incoming) {
    const parsed = ExtractResultSchema.safeParse(incoming);
    if (parsed.success) parsedData = parsed.data;
  }

  if (parsedData) {
    lastGoodRef.current = { workflowId, data: parsedData };
  }

  const sticky =
    isProcessing && lastGoodRef.current?.workflowId === workflowId
      ? lastGoodRef.current.data
      : null;
  const data = parsedData ?? sticky;
  const meaningful = data !== null && hasMeaningfulResult(workflowId, data);
  const resolve = (ids: string[]) => resolveEvidenceIds(ids, evidenceById);

  // Terminal errors beat hollow shells left by mid-stream aborts.
  if (error && !isProcessing) {
    return <WorkflowError language={language} message={error} onRerun={onRerun} />;
  }

  if (!data && !isProcessing) {
    return <EmptyResult language={language} />;
  }

  let body: ReactNode = null;

  if (workflowId === "summarize" && data) {
    const parsed = SummaryResultSchema.safeParse(data);
    if (parsed.success && (isProcessing || hasMeaningfulResult("summarize", parsed.data))) {
      body = (
        <SummaryResultView
          language={language}
          result={parsed.data as SummaryResult}
          resolveEvidence={resolve}
          streaming={isProcessing}
          onOpenEvidence={setSource}
        />
      );
    }
  } else if (workflowId === "review" && data) {
    const parsed = ReviewResultSchema.safeParse(data);
    if (parsed.success && (isProcessing || hasMeaningfulResult("review", parsed.data))) {
      body = (
        <ReviewResultView
          language={language}
          result={parsed.data as ReviewResult}
          resolveEvidence={resolve}
          streaming={isProcessing}
          onOpenEvidence={setSource}
        />
      );
    }
  } else if (workflowId === "extract" && data) {
    const parsed = ExtractResultSchema.safeParse(data);
    if (parsed.success && (isProcessing || hasMeaningfulResult("extract", parsed.data))) {
      body = (
        <ExtractionTable
          language={language}
          extractType={extractType}
          result={parsed.data as ExtractResult}
          resolveEvidence={resolve}
          onOpenEvidence={setSource}
        />
      );
    }
  }

  if (!body && isProcessing) {
    body = (
      <div className="space-y-2">
        <div className="skeleton h-4 w-full" />
        <div className="skeleton h-4 w-5/6" />
        <div className="skeleton h-4 w-4/6" />
      </div>
    );
  }

  if (!body && error) {
    return <WorkflowError language={language} message={error} onRerun={onRerun} />;
  }

  if (!body) {
    return <EmptyResult language={language} />;
  }

  const showFollowUps = includeFollowUps && !isProcessing && !error && meaningful;

  return (
    <Card className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-text-muted font-medium tracking-wide uppercase">
          {isRepairing
            ? t(language, "run.preparing")
            : t(language, `workflow.${workflowId}.name`)}
        </span>
        {isProcessing && onStop ? (
          <Button variant="ghost" size="sm" onClick={onStop}>
            {t(language, "run.stop")}
          </Button>
        ) : null}
      </div>
      {body}
      {showFollowUps ? (
        <div className="space-y-4 pt-2 border-t border-border-subtle">
          <FollowUpBar language={language} onAsk={onAsk} />
          <SuggestedFollowUps
            language={language}
            keys={followUpKeys}
            extra={extraQuestions}
            onSelect={onFollowUp}
          />
        </div>
      ) : null}
      <SourceViewer
        open={source !== null}
        language={language}
        reference={source}
        onClose={() => setSource(null)}
      />
    </Card>
  );
}
