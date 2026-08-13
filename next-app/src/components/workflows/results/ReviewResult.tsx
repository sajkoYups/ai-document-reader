"use client";

import type { OutputLanguage } from "@/types";
import type { EvidenceReference as EvidenceRef } from "@/workflows/types";
import type { ReviewResult } from "@/workflows/schemas/review";
import { t } from "@/workflows/copy";
import FindingCard from "./FindingCard";

interface ReviewResultViewProps {
  language: OutputLanguage;
  result: ReviewResult;
  resolveEvidence: (ids: string[]) => EvidenceRef[];
  streaming?: boolean;
  onOpenEvidence?: (ref: EvidenceRef) => void;
}

const assessmentKey = {
  low_attention: "result.lowAttention",
  medium_attention: "result.mediumAttention",
  high_attention: "result.highAttention",
} as const;

export default function ReviewResultView({
  language,
  result,
  resolveEvidence,
  streaming = false,
  onOpenEvidence,
}: ReviewResultViewProps) {
  const lastIndex = result.findings.length - 1;
  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h2 className="text-xs font-medium text-text-muted tracking-wide uppercase">
          {t(language, "result.assessment")}
        </h2>
        <p className="text-sm font-medium text-text-primary">
          {t(language, assessmentKey[result.assessment] ?? "result.mediumAttention")}
        </p>
        {result.overview ? (
          <p className="text-sm text-text-secondary leading-relaxed">{result.overview}</p>
        ) : null}
      </section>

      <section className="space-y-3">
        <h3 className="text-xs font-medium text-text-muted tracking-wide uppercase">
          {t(language, "result.findings")}
        </h3>
        {result.findings.map((finding, i) => (
          <FindingCard
            key={finding.id ?? `${finding.title}-${i}`}
            language={language}
            finding={finding}
            evidence={resolveEvidence(finding.evidenceIds)}
            streaming={streaming && i === lastIndex && !finding.explanation}
            onOpenEvidence={onOpenEvidence}
          />
        ))}
      </section>
    </div>
  );
}
