"use client";

import type { OutputLanguage } from "@/types";
import type { TimelineResult } from "@/workflows/schemas/timeline";
import type { EvidenceReference } from "@/workflows/types";
import { t } from "@/workflows/copy";
import EvidenceReferenceChips from "./EvidenceReference";

interface TimelineResultViewProps {
  language: OutputLanguage;
  result: TimelineResult;
  resolveEvidence: (ids: string[]) => EvidenceReference[];
  onOpenEvidence?: (ref: EvidenceReference) => void;
  documentNames?: Record<string, string>;
}

function sortKey(date: string): number {
  const parsed = Date.parse(date);
  if (!Number.isNaN(parsed)) return parsed;
  return Number.POSITIVE_INFINITY;
}

export default function TimelineResultView({
  language,
  result,
  resolveEvidence,
  onOpenEvidence,
  documentNames,
}: TimelineResultViewProps) {
  const dated = result.events
    .filter((e) => e.date.trim() && !/^unknown|undated|n\/?a$/i.test(e.date.trim()))
    .slice()
    .sort((a, b) => sortKey(a.date) - sortKey(b.date));
  const undated = result.events.filter(
    (e) => !e.date.trim() || /^unknown|undated|n\/?a$/i.test(e.date.trim()),
  );

  const renderEvent = (event: TimelineResult["events"][number], i: number) => (
    <li key={`${event.date}-${event.label}-${i}`} className="relative pl-4 border-l border-accent-border">
      <span className="absolute -left-1 top-1.5 w-2 h-2 rounded-full bg-accent" />
      <p className="text-xs text-accent font-medium">{event.date || t(language, "timeline.undated")}</p>
      <p className="text-sm text-text-primary mt-0.5">{event.label}</p>
      {event.description ? (
        <p className="text-sm text-text-secondary mt-1 leading-relaxed">{event.description}</p>
      ) : null}
      {event.documentId && documentNames?.[event.documentId] ? (
        <p className="text-[11px] text-text-muted mt-1">{documentNames[event.documentId]}</p>
      ) : null}
      <EvidenceReferenceChips
        evidence={resolveEvidence(event.evidenceIds)}
        onOpen={onOpenEvidence}
      />
    </li>
  );

  return (
    <div className="space-y-5">
      {result.overview ? (
        <p className="text-sm text-text-secondary leading-relaxed">{result.overview}</p>
      ) : null}
      {dated.length > 0 ? (
        <ol className="space-y-4">{dated.map(renderEvent)}</ol>
      ) : null}
      {undated.length > 0 ? (
        <div className="space-y-2">
          <h3 className="text-xs font-medium uppercase tracking-wide text-text-muted">
            {t(language, "timeline.undated")}
          </h3>
          <ol className="space-y-4">{undated.map(renderEvent)}</ol>
        </div>
      ) : null}
    </div>
  );
}
