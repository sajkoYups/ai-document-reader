"use client";

import type { ReactNode } from "react";
import type { OutputLanguage } from "@/types";
import type { ExtractType, EvidenceReference as EvidenceRef } from "@/workflows/types";
import type { ExtractResult } from "@/workflows/schemas/extract";
import { t } from "@/workflows/copy";
import { formatEvidenceLabel } from "@/workflows/evidence";

interface ExtractionTableProps {
  language: OutputLanguage;
  extractType: ExtractType;
  result: ExtractResult;
  resolveEvidence: (ids: string[]) => EvidenceRef[];
  onOpenEvidence?: (ref: EvidenceRef) => void;
  streaming?: boolean;
}

function EvidenceCell({
  ids,
  resolveEvidence,
  onOpenEvidence,
}: {
  ids: string[];
  resolveEvidence: (ids: string[]) => EvidenceRef[];
  onOpenEvidence?: (ref: EvidenceRef) => void;
}) {
  const refs = resolveEvidence(ids);
  if (refs.length === 0) return <span className="text-text-muted">—</span>;
  return (
    <div className="flex flex-col gap-1">
      {refs.map((ref, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onOpenEvidence?.(ref)}
          className="text-left text-xs text-accent hover:underline cursor-pointer"
        >
          {formatEvidenceLabel(ref)}
        </button>
      ))}
    </div>
  );
}

function Table({
  headers,
  rows,
  keepMounted = false,
}: {
  headers: string[];
  rows: ReactNode[][];
  keepMounted?: boolean;
}) {
  if (rows.length === 0 && !keepMounted) return null;
  return (
    <div className="overflow-x-auto rounded-xl border border-border [overflow-anchor:none]">
      <table className="w-full text-sm text-left table-fixed">
        <thead className="bg-surface-2 text-xs uppercase tracking-wide text-text-muted">
          <tr>
            {headers.map((h) => (
              <th key={h} className="px-3 py-2 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={`${String(row[0])}-${i}`} className="border-t border-border-subtle">
              {row.map((cell, j) => (
                <td key={j} className="px-3 py-2 text-text-secondary align-top break-words">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ExtractionTable({
  language,
  extractType,
  result,
  resolveEvidence,
  onOpenEvidence,
  streaming = false,
}: ExtractionTableProps) {
  const ev = (ids: string[]) => (
    <EvidenceCell ids={ids} resolveEvidence={resolveEvidence} onOpenEvidence={onOpenEvidence} />
  );

  const sections: ReactNode[] = [];

  if (extractType === "key-information" || result.keyFields.length > 0) {
    sections.push(
      <Table
        key="fields"
        keepMounted={streaming && extractType === "key-information"}
        headers={[t(language, "table.field"), t(language, "table.value"), t(language, "table.source")]}
        rows={result.keyFields.map((row) => [row.field, row.value, ev(row.evidenceIds)])}
      />,
    );
  }
  if (extractType === "dates" || (extractType === "key-information" && result.dates.length > 0)) {
    sections.push(
      <Table
        key="dates"
        keepMounted={streaming && extractType === "dates"}
        headers={[t(language, "table.date"), t(language, "table.event"), t(language, "table.source")]}
        rows={result.dates.map((row) => [row.date, row.event, ev(row.evidenceIds)])}
      />,
    );
  }
  if (extractType === "entities" || (extractType === "key-information" && result.entities.length > 0)) {
    sections.push(
      <Table
        key="entities"
        keepMounted={streaming && extractType === "entities"}
        headers={[
          t(language, "table.entity"),
          t(language, "table.type"),
          t(language, "table.role"),
          t(language, "table.source"),
        ]}
        rows={result.entities.map((row) => [row.entity, row.type, row.role, ev(row.evidenceIds)])}
      />,
    );
  }
  if (extractType === "amounts" || (extractType === "key-information" && result.amounts.length > 0)) {
    sections.push(
      <Table
        key="amounts"
        keepMounted={streaming && extractType === "amounts"}
        headers={[
          t(language, "table.amount"),
          t(language, "table.currency"),
          t(language, "table.meaning"),
          t(language, "table.source"),
        ]}
        rows={result.amounts.map((row) => [row.amount, row.currency, row.meaning, ev(row.evidenceIds)])}
      />,
    );
  }
  if (extractType === "obligations" || (extractType === "key-information" && result.obligations.length > 0)) {
    sections.push(
      <Table
        key="obligations"
        keepMounted={streaming && extractType === "obligations"}
        headers={[
          t(language, "table.party"),
          t(language, "table.obligation"),
          t(language, "table.deadline"),
          t(language, "table.condition"),
          t(language, "table.source"),
        ]}
        rows={result.obligations.map((row) => [
          row.party,
          row.obligation,
          row.deadline || t(language, "result.notSpecified"),
          row.condition,
          ev(row.evidenceIds),
        ])}
      />,
    );
  }
  if (extractType === "requirements" || (extractType === "key-information" && result.requirements.length > 0)) {
    sections.push(
      <Table
        key="req"
        keepMounted={streaming && extractType === "requirements"}
        headers={[
          t(language, "table.requirement"),
          t(language, "table.mandatory"),
          t(language, "table.deadline"),
          t(language, "table.source"),
        ]}
        rows={result.requirements.map((row) => [
          row.requirement,
          row.mandatory,
          row.deadline || t(language, "result.notSpecified"),
          ev(row.evidenceIds),
        ])}
      />,
    );
  }
  if (extractType === "contacts" || (extractType === "key-information" && result.contacts.length > 0)) {
    sections.push(
      <Table
        key="contacts"
        keepMounted={streaming && extractType === "contacts"}
        headers={[
          t(language, "table.name"),
          t(language, "table.role"),
          t(language, "table.contact"),
          t(language, "table.source"),
        ]}
        rows={result.contacts.map((row) => [row.name, row.role, row.contact, ev(row.evidenceIds)])}
      />,
    );
  }
  if (extractType === "custom" || result.customRows.length > 0) {
    sections.push(
      <Table
        key="custom"
        keepMounted={streaming && extractType === "custom"}
        headers={[t(language, "table.item"), t(language, "table.detail"), t(language, "table.source")]}
        rows={result.customRows.map((row) => [row.item, row.detail, ev(row.evidenceIds)])}
      />,
    );
  }

  const visible = sections.filter(Boolean);
  if (visible.length === 0) {
    return <p className="text-sm text-text-secondary">{t(language, "result.empty")}</p>;
  }

  return <div className="space-y-6">{visible}</div>;
}
