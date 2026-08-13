"use client";

import type { OutputLanguage } from "@/types";
import type { EvidenceReference as EvidenceRef } from "@/workflows/types";
import type { SummaryResult } from "@/workflows/schemas/summarize";
import { t } from "@/workflows/copy";
import EvidenceReference from "./EvidenceReference";

interface SummaryResultViewProps {
  language: OutputLanguage;
  result: SummaryResult;
  resolveEvidence: (ids: string[]) => EvidenceRef[];
  streaming?: boolean;
  onOpenEvidence?: (ref: EvidenceRef) => void;
}

function Section({
  title,
  items,
  resolveEvidence,
  onOpenEvidence,
  numbered = false,
}: {
  title: string;
  items: { text: string; evidenceIds: string[] }[];
  resolveEvidence: (ids: string[]) => EvidenceRef[];
  onOpenEvidence?: (ref: EvidenceRef) => void;
  numbered?: boolean;
}) {
  if (items.length === 0) return null;
  return (
    <section className="space-y-3">
      <h3 className="text-xs font-medium text-text-muted tracking-wide uppercase">
        {title}
      </h3>
      <ol className={numbered ? "space-y-3" : "space-y-3"}>
        {items.map((item, i) => (
          <li key={`${item.text}-${i}`} className="flex gap-3">
            {numbered ? (
              <span className="font-mono text-xs text-text-muted w-6 shrink-0 pt-0.5">
                {String(i + 1).padStart(2, "0")}
              </span>
            ) : null}
            <div>
              <p className="text-sm text-text-primary leading-relaxed">{item.text}</p>
              <EvidenceReference
                evidence={resolveEvidence(item.evidenceIds)}
                onOpen={onOpenEvidence}
              />
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

export default function SummaryResultView({
  language,
  result,
  resolveEvidence,
  streaming = false,
  onOpenEvidence,
}: SummaryResultViewProps) {
  return (
    <div className="space-y-8">
      <section className="space-y-2">
        <h2 className="text-xs font-medium text-text-muted tracking-wide uppercase">
          {t(language, "result.summary")}
        </h2>
        <p className="text-base text-text-primary leading-relaxed">
          {result.overview}
          {streaming && !result.keyPoints.length ? (
            <span className="inline-block w-1.5 h-4 bg-accent/60 animate-pulse ml-0.5 align-text-bottom" />
          ) : null}
        </p>
      </section>

      <Section
        title={t(language, "result.keyPoints")}
        items={result.keyPoints}
        resolveEvidence={resolveEvidence}
        onOpenEvidence={onOpenEvidence}
        numbered
      />
      <Section
        title={t(language, "result.numbers")}
        items={result.numbers}
        resolveEvidence={resolveEvidence}
        onOpenEvidence={onOpenEvidence}
      />
      <Section
        title={t(language, "result.peopleOrgs")}
        items={result.peopleOrgs}
        resolveEvidence={resolveEvidence}
        onOpenEvidence={onOpenEvidence}
      />
      <Section
        title={t(language, "result.dates")}
        items={result.dates}
        resolveEvidence={resolveEvidence}
        onOpenEvidence={onOpenEvidence}
      />
      <Section
        title={t(language, "result.attention")}
        items={result.attention}
        resolveEvidence={resolveEvidence}
        onOpenEvidence={onOpenEvidence}
      />
    </div>
  );
}
