"use client";

import { useRef, useState, type ReactNode } from "react";
import type { OutputLanguage } from "@/types";
import type { ExtractType, EvidenceReference as EvidenceRef, WorkflowId } from "@/workflows/types";
import type { SummaryResult } from "@/workflows/schemas/summarize";
import type { ReviewResult } from "@/workflows/schemas/review";
import type { ExtractResult } from "@/workflows/schemas/extract";
import type { ComparisonResult } from "@/workflows/schemas/compare";
import type { TimelineResult } from "@/workflows/schemas/timeline";
import type {
  ActionItemsResult,
  ContradictionsResult,
  DocumentMapResult,
  EvidenceFinderResult,
  MissingInformationResult,
} from "@/workflows/schemas/advanced";
import { SummaryResultSchema } from "@/workflows/schemas/summarize";
import { ReviewResultSchema } from "@/workflows/schemas/review";
import { ExtractResultSchema } from "@/workflows/schemas/extract";
import { ComparisonResultSchema } from "@/workflows/schemas/compare";
import { TimelineResultSchema } from "@/workflows/schemas/timeline";
import {
  ActionItemsResultSchema,
  ContradictionsResultSchema,
  DocumentMapResultSchema,
  EvidenceFinderResultSchema,
  MissingInformationResultSchema,
} from "@/workflows/schemas/advanced";
import { resolveEvidenceIds } from "@/workflows/evidence";
import { hasMeaningfulResult } from "@/workflows/resultQuality";
import { getWorkflow } from "@/workflows/registry";
import { t } from "@/workflows/copy";
import Card from "@/components/Card";
import Button from "@/components/Button";
import SummaryResultView from "./SummaryResult";
import ReviewResultView from "./ReviewResult";
import ExtractionTable from "./ExtractionTable";
import ComparisonResultView from "./ComparisonResult";
import TimelineResultView from "./TimelineResult";
import {
  ActionItemsResultView,
  ContradictionsResultView,
  DocumentMapResultView,
  EvidenceFinderResultView,
  MissingInformationResultView,
} from "./AdvancedResults";
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
  documentNames?: Record<string, string>;
  onRerun: () => void;
  onStop?: () => void;
  onAsk: (message: string) => void;
  onFollowUp: (text: string) => void;
}

function parseForWorkflow(workflowId: WorkflowId, incoming: unknown): unknown | null {
  if (!incoming) return null;
  const schemas: Partial<Record<WorkflowId, { safeParse: (v: unknown) => { success: boolean; data?: unknown } }>> = {
    summarize: SummaryResultSchema,
    review: ReviewResultSchema,
    extract: ExtractResultSchema,
    compare: ComparisonResultSchema,
    timeline: TimelineResultSchema,
    contradictions: ContradictionsResultSchema,
    "missing-information": MissingInformationResultSchema,
    "evidence-finder": EvidenceFinderResultSchema,
    "action-items": ActionItemsResultSchema,
    "document-map": DocumentMapResultSchema,
  };
  const schema = schemas[workflowId];
  if (!schema) return null;
  const parsed = schema.safeParse(incoming);
  return parsed.success ? parsed.data : null;
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
  documentNames,
  onRerun,
  onStop,
  onAsk,
  onFollowUp,
}: WorkflowResultRouterProps) {
  const [source, setSource] = useState<EvidenceRef | null>(null);
  const lastGoodRef = useRef<{ workflowId: WorkflowId; data: unknown } | null>(null);
  const incoming = validated ?? partial;

  const parsedData = parseForWorkflow(workflowId, incoming);
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
  const def = getWorkflow(workflowId);
  const title = def ? t(language, def.nameKey) : workflowId;

  if (error && !isProcessing) {
    return <WorkflowError language={language} message={error} onRerun={onRerun} />;
  }

  if (!data && !isProcessing) {
    return <EmptyResult language={language} />;
  }

  let body: ReactNode = null;

  if (workflowId === "summarize" && data && (isProcessing || hasMeaningfulResult("summarize", data))) {
    body = (
      <SummaryResultView
        language={language}
        result={data as SummaryResult}
        resolveEvidence={resolve}
        streaming={isProcessing}
        onOpenEvidence={setSource}
      />
    );
  } else if (workflowId === "review" && data && (isProcessing || hasMeaningfulResult("review", data))) {
    body = (
      <ReviewResultView
        language={language}
        result={data as ReviewResult}
        resolveEvidence={resolve}
        streaming={isProcessing}
        onOpenEvidence={setSource}
      />
    );
  } else if (workflowId === "extract" && data && (isProcessing || hasMeaningfulResult("extract", data))) {
    body = (
      <ExtractionTable
        language={language}
        extractType={extractType}
        result={data as ExtractResult}
        resolveEvidence={resolve}
        onOpenEvidence={setSource}
      />
    );
  } else if (workflowId === "compare" && data && (isProcessing || hasMeaningfulResult("compare", data))) {
    body = (
      <ComparisonResultView
        language={language}
        result={data as ComparisonResult}
        resolveEvidence={resolve}
        onOpenEvidence={setSource}
      />
    );
  } else if (workflowId === "timeline" && data && (isProcessing || hasMeaningfulResult("timeline", data))) {
    body = (
      <TimelineResultView
        language={language}
        result={data as TimelineResult}
        resolveEvidence={resolve}
        onOpenEvidence={setSource}
        documentNames={documentNames}
      />
    );
  } else if (workflowId === "contradictions" && data && (isProcessing || hasMeaningfulResult("contradictions", data))) {
    body = (
      <ContradictionsResultView
        language={language}
        result={data as ContradictionsResult}
        resolveEvidence={resolve}
        onOpenEvidence={setSource}
      />
    );
  } else if (
    workflowId === "missing-information" &&
    data &&
    (isProcessing || hasMeaningfulResult("missing-information", data))
  ) {
    body = (
      <MissingInformationResultView
        language={language}
        result={data as MissingInformationResult}
        resolveEvidence={resolve}
        onOpenEvidence={setSource}
      />
    );
  } else if (
    workflowId === "evidence-finder" &&
    data &&
    (isProcessing || hasMeaningfulResult("evidence-finder", data))
  ) {
    body = (
      <EvidenceFinderResultView
        language={language}
        result={data as EvidenceFinderResult}
        resolveEvidence={resolve}
        onOpenEvidence={setSource}
      />
    );
  } else if (workflowId === "action-items" && data && (isProcessing || hasMeaningfulResult("action-items", data))) {
    body = (
      <ActionItemsResultView
        language={language}
        result={data as ActionItemsResult}
        resolveEvidence={resolve}
        onOpenEvidence={setSource}
      />
    );
  } else if (workflowId === "document-map" && data && (isProcessing || hasMeaningfulResult("document-map", data))) {
    body = (
      <DocumentMapResultView
        language={language}
        result={data as DocumentMapResult}
        resolveEvidence={resolve}
        onOpenEvidence={setSource}
      />
    );
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
          {isRepairing ? t(language, "run.preparing") : title}
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
