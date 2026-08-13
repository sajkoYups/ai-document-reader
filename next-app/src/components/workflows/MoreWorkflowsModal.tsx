"use client";

import { useMemo, useState } from "react";
import type { OutputLanguage } from "@/types";
import { t } from "@/workflows/copy";
import { searchWorkflows, getWorkflow } from "@/workflows/registry";
import type { WorkflowCategory, WorkflowId } from "@/workflows/types";
import Modal from "@/components/Modal";

interface MoreWorkflowsModalProps {
  open: boolean;
  onClose: () => void;
  language: OutputLanguage;
  suggestedIds: WorkflowId[];
  onSelect: (id: WorkflowId) => void;
}

const GROUPS: { id: string; labelKey: string; categories: WorkflowCategory[] }[] = [
  { id: "suggested", labelKey: "more.suggested", categories: [] },
  { id: "document", labelKey: "more.documentAnalysis", categories: ["core", "document"] },
  { id: "legal", labelKey: "more.legal", categories: ["legal"] },
];

export default function MoreWorkflowsModal({
  open,
  onClose,
  language,
  suggestedIds,
  onSelect,
}: MoreWorkflowsModalProps) {
  const [query, setQuery] = useState("");
  const results = useMemo(
    () => searchWorkflows(query, language),
    [query, language],
  );

  return (
    <Modal open={open} onClose={onClose}>
      <div className="space-y-4">
        <h2 className="font-display text-2xl text-text-primary pr-8">
          {t(language, "more.title")}
        </h2>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t(language, "more.search")}
          className="w-full bg-surface-0 border border-border rounded-lg px-3 py-2 text-sm
            text-text-primary placeholder:text-text-muted
            focus:outline-none focus:border-accent/40"
        />

        <div className="max-h-[60vh] overflow-y-auto space-y-5 pr-1">
          {query.trim() ? (
            results.length === 0 ? (
              <p className="text-sm text-text-muted">{t(language, "more.empty")}</p>
            ) : (
              <WorkflowList
                language={language}
                ids={results.map((w) => w.id)}
                onSelect={onSelect}
              />
            )
          ) : (
            GROUPS.map((group) => {
              const ids =
                group.id === "suggested"
                  ? suggestedIds
                  : results
                      .filter((w) => group.categories.includes(w.category))
                      .map((w) => w.id);
              const unique = [...new Set(ids)];
              if (unique.length === 0) return null;
              return (
                <div key={group.id} className="space-y-2">
                  <p className="text-xs font-medium text-text-muted tracking-wide uppercase">
                    {t(language, group.labelKey)}
                  </p>
                  <WorkflowList language={language} ids={unique} onSelect={onSelect} />
                </div>
              );
            })
          )}
        </div>
      </div>
    </Modal>
  );
}

function WorkflowList({
  language,
  ids,
  onSelect,
}: {
  language: OutputLanguage;
  ids: WorkflowId[];
  onSelect: (id: WorkflowId) => void;
}) {
  return (
    <div className="space-y-1">
      {ids.map((id) => {
        const workflow = getWorkflow(id);
        if (!workflow) return null;
        const disabled = workflow.status === "coming_soon";
        return (
          <button
            key={id}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(id)}
            className="w-full text-left rounded-lg px-3 py-2 hover:bg-surface-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="flex items-baseline justify-between gap-2">
              <span className="text-sm text-text-primary">{t(language, workflow.nameKey)}</span>
              {disabled ? (
                <span className="text-[10px] uppercase tracking-wide text-text-muted">
                  {t(language, "comingSoon")}
                </span>
              ) : null}
            </span>
            <span className="block text-xs text-text-muted mt-0.5">
              {t(language, workflow.shortDescriptionKey)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
