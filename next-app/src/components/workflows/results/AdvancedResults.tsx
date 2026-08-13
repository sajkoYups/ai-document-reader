"use client";

import type { OutputLanguage } from "@/types";
import type {
  ActionItemsResult,
  ContradictionsResult,
  DocumentMapResult,
  EvidenceFinderResult,
  MissingInformationResult,
} from "@/workflows/schemas/advanced";
import type { EvidenceReference } from "@/workflows/types";
import { t } from "@/workflows/copy";
import ConfidenceBadge from "./ConfidenceBadge";
import EvidenceReferenceChips from "./EvidenceReference";

interface SharedProps {
  language: OutputLanguage;
  resolveEvidence: (ids: string[]) => EvidenceReference[];
  onOpenEvidence?: (ref: EvidenceReference) => void;
}

export function ContradictionsResultView({
  language,
  result,
  resolveEvidence,
  onOpenEvidence,
}: SharedProps & { result: ContradictionsResult }) {
  return (
    <div className="space-y-4">
      {result.overview ? (
        <p className="text-sm text-text-secondary leading-relaxed">{result.overview}</p>
      ) : null}
      {result.contradictions.map((item, i) => (
        <div key={item.id || i} className="rounded-lg border border-border bg-surface-2 px-3 py-3 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-medium text-text-primary">{item.title}</h3>
            <ConfidenceBadge level={item.confidence} language={language} />
          </div>
          <p className="text-xs text-text-muted uppercase tracking-wide">{t(language, "advanced.claimA")}</p>
          <p className="text-sm text-text-secondary">{item.claimA}</p>
          <p className="text-xs text-text-muted uppercase tracking-wide">{t(language, "advanced.claimB")}</p>
          <p className="text-sm text-text-secondary">{item.claimB}</p>
          {item.explanation ? (
            <p className="text-sm text-text-secondary leading-relaxed">{item.explanation}</p>
          ) : null}
          <EvidenceReferenceChips evidence={resolveEvidence(item.evidenceIds)} onOpen={onOpenEvidence} />
        </div>
      ))}
    </div>
  );
}

export function MissingInformationResultView({
  language,
  result,
  resolveEvidence,
  onOpenEvidence,
}: SharedProps & { result: MissingInformationResult }) {
  return (
    <div className="space-y-4">
      {result.overview ? (
        <p className="text-sm text-text-secondary leading-relaxed">{result.overview}</p>
      ) : null}
      {result.missing.map((item, i) => (
        <div key={item.id || i} className="rounded-lg border border-border bg-surface-2 px-3 py-3 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-medium text-text-primary">{item.title}</h3>
            <span className="text-[10px] uppercase text-text-muted">{item.importance}</span>
          </div>
          <p className="text-sm text-text-secondary leading-relaxed">{item.explanation}</p>
          <EvidenceReferenceChips evidence={resolveEvidence(item.evidenceIds)} onOpen={onOpenEvidence} />
        </div>
      ))}
    </div>
  );
}

export function EvidenceFinderResultView({
  language,
  result,
  resolveEvidence,
  onOpenEvidence,
}: SharedProps & { result: EvidenceFinderResult }) {
  return (
    <div className="space-y-4">
      {result.query ? (
        <p className="text-xs text-text-muted">
          {t(language, "advanced.query")}: <span className="text-text-secondary">{result.query}</span>
        </p>
      ) : null}
      {result.overview ? (
        <p className="text-sm text-text-secondary leading-relaxed">{result.overview}</p>
      ) : null}
      {result.passages.map((p, i) => (
        <div key={p.id || i} className="rounded-lg border border-border bg-surface-2 px-3 py-3 space-y-2">
          <h3 className="text-sm font-medium text-text-primary">{p.title}</h3>
          <blockquote className="text-sm text-text-secondary italic border-l-2 border-accent/40 pl-3">
            {p.passage}
          </blockquote>
          {p.whyRelevant ? (
            <p className="text-sm text-text-secondary">{p.whyRelevant}</p>
          ) : null}
          <EvidenceReferenceChips evidence={resolveEvidence(p.evidenceIds)} onOpen={onOpenEvidence} />
        </div>
      ))}
    </div>
  );
}

export function ActionItemsResultView({
  language,
  result,
  resolveEvidence,
  onOpenEvidence,
}: SharedProps & { result: ActionItemsResult }) {
  return (
    <div className="space-y-4">
      {result.overview ? (
        <p className="text-sm text-text-secondary leading-relaxed">{result.overview}</p>
      ) : null}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-text-muted border-b border-border">
              <th className="py-2 pr-3">{t(language, "advanced.action")}</th>
              <th className="py-2 pr-3">{t(language, "advanced.owner")}</th>
              <th className="py-2 pr-3">{t(language, "advanced.deadline")}</th>
              <th className="py-2">{t(language, "result.source")}</th>
            </tr>
          </thead>
          <tbody>
            {result.items.map((item, i) => (
              <tr key={i} className="border-b border-border-subtle align-top">
                <td className="py-2.5 pr-3 text-text-primary">{item.action}</td>
                <td className="py-2.5 pr-3 text-text-secondary">{item.owner}</td>
                <td className="py-2.5 pr-3 text-text-secondary">{item.deadline}</td>
                <td className="py-2.5">
                  <EvidenceReferenceChips
                    evidence={resolveEvidence(item.evidenceIds)}
                    onOpen={onOpenEvidence}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function DocumentMapResultView({
  language,
  result,
  resolveEvidence,
  onOpenEvidence,
}: SharedProps & { result: DocumentMapResult }) {
  return (
    <div className="space-y-4">
      {result.overview ? (
        <p className="text-sm text-text-secondary leading-relaxed">{result.overview}</p>
      ) : null}
      <ol className="space-y-3">
        {result.sections.map((section, i) => (
          <li key={i} className="rounded-lg border border-border bg-surface-2 px-3 py-2.5">
            <p className="text-sm font-medium text-text-primary">
              {i + 1}. {section.heading || t(language, "advanced.section")}
            </p>
            {section.summary ? (
              <p className="text-sm text-text-secondary mt-1 leading-relaxed">{section.summary}</p>
            ) : null}
            <EvidenceReferenceChips
              evidence={resolveEvidence(section.evidenceIds)}
              onOpen={onOpenEvidence}
            />
          </li>
        ))}
      </ol>
    </div>
  );
}
