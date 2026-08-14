"use client";

import type { OutputLanguage } from "@/types";
import type { ComparisonResult } from "@/workflows/schemas/compare";
import type { EvidenceReference } from "@/workflows/types";
import { t } from "@/workflows/copy";
import EvidenceReferenceChips from "./EvidenceReference";

interface ComparisonResultViewProps {
  language: OutputLanguage;
  result: ComparisonResult;
  resolveEvidence: (ids: string[]) => EvidenceReference[];
  onOpenEvidence?: (ref: EvidenceReference) => void;
}

function sideLabel(language: OutputLanguage, side: "a" | "b" | "both") {
  if (side === "a") return t(language, "compare.sideA");
  if (side === "b") return t(language, "compare.sideB");
  return t(language, "compare.sideBoth");
}

export default function ComparisonResultView({
  language,
  result,
  resolveEvidence,
  onOpenEvidence,
}: ComparisonResultViewProps) {
  const sections: Array<{
    key: string;
    title: string;
    items: ComparisonResult["similarities"];
  }> = [
    { key: "sim", title: t(language, "compare.similarities"), items: result.similarities },
    { key: "diff", title: t(language, "compare.differences"), items: result.differences },
    { key: "att", title: t(language, "compare.attention"), items: result.attention },
  ];

  return (
    <div className="space-y-5">
      {result.overview ? (
        <p className="text-sm text-text-secondary leading-relaxed">{result.overview}</p>
      ) : null}
      {sections.map((section) =>
        section.items.length > 0 ? (
          <div key={section.key} className="space-y-2">
            <h3 className="text-xs font-medium uppercase tracking-wide text-text-muted">
              {section.title}
            </h3>
            <ul className="space-y-2">
              {section.items.map((item, i) => (
                <li
                  key={`${section.key}-${i}`}
                  className="rounded-lg border border-border bg-surface-2 px-3 py-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm text-text-primary leading-relaxed">{item.text}</p>
                    <span className="shrink-0 text-xs uppercase tracking-wide text-accent">
                      {sideLabel(language, item.side)}
                    </span>
                  </div>
                  <EvidenceReferenceChips
                    evidence={resolveEvidence(item.evidenceIds)}
                    onOpen={onOpenEvidence}
                  />
                </li>
              ))}
            </ul>
          </div>
        ) : null,
      )}
    </div>
  );
}
