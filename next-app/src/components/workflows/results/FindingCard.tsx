"use client";

import type { OutputLanguage } from "@/types";
import type { EvidenceReference as EvidenceRef } from "@/workflows/types";
import type { ReviewFinding } from "@/workflows/schemas/review";
import { t } from "@/workflows/copy";
import ConfidenceBadge from "./ConfidenceBadge";
import EvidenceReference from "./EvidenceReference";

interface FindingCardProps {
  language: OutputLanguage;
  finding: ReviewFinding;
  evidence: EvidenceRef[];
  streaming?: boolean;
  onOpenEvidence?: (ref: EvidenceRef) => void;
}

export default function FindingCard({
  language,
  finding,
  evidence,
  streaming = false,
  onOpenEvidence,
}: FindingCardProps) {
  return (
    <article className="rounded-xl border border-border bg-surface-1 px-4 py-3 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <ConfidenceBadge language={language} level={finding.importance} kind="importance" />
        <ConfidenceBadge language={language} level={finding.confidence} kind="confidence" />
      </div>
      <h3 className="text-sm font-medium text-text-primary">{finding.title}</h3>
      <p className="text-sm text-text-secondary leading-relaxed">
        {finding.explanation}
        {streaming ? (
          <span className="inline-block w-1.5 h-4 bg-accent/60 animate-pulse ml-0.5 align-text-bottom" />
        ) : null}
      </p>
      {evidence.length > 0 ? (
        <div>
          <p className="text-xs uppercase tracking-wide text-text-muted">
            {t(language, "result.evidence")}
          </p>
          <EvidenceReference evidence={evidence} onOpen={onOpenEvidence} />
        </div>
      ) : null}
    </article>
  );
}
