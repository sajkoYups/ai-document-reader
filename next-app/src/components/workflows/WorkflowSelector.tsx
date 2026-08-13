"use client";

import type { OutputLanguage } from "@/types";
import { t } from "@/workflows/copy";
import type { WorkflowDefinition, WorkflowId } from "@/workflows/types";

interface WorkflowSelectorProps {
  workflows: WorkflowDefinition[];
  selectedId: WorkflowId;
  language: OutputLanguage;
  onSelect: (id: WorkflowId) => void;
  compact?: boolean;
}

export default function WorkflowSelector({
  workflows,
  selectedId,
  language,
  onSelect,
  compact = false,
}: WorkflowSelectorProps) {
  return (
    <div className={compact ? "flex flex-col gap-1" : "grid grid-cols-1 sm:grid-cols-2 gap-2"}>
      {workflows.map((workflow) => {
        const selected = workflow.id === selectedId;
        const disabled = workflow.status === "coming_soon";
        return (
          <button
            key={workflow.id}
            type="button"
            onClick={() => onSelect(workflow.id)}
            disabled={disabled}
            className={`
              text-left rounded-lg px-3.5 py-2.5 transition-all duration-150 cursor-pointer
              disabled:opacity-45 disabled:cursor-not-allowed
              ${
                selected
                  ? "bg-accent text-surface-0 shadow-[0_0_12px_rgba(45,212,191,0.15)]"
                  : "bg-surface-2 text-text-secondary border border-border hover:text-text-primary hover:bg-surface-3"
              }
            `}
          >
            <span className="flex items-baseline justify-between gap-2">
              <span className="text-sm font-medium">{t(language, workflow.nameKey)}</span>
              {disabled ? (
                <span className={`text-[10px] uppercase tracking-wide ${selected ? "opacity-70" : "text-text-muted"}`}>
                  {t(language, "comingSoon")}
                </span>
              ) : null}
            </span>
            <span className={`block text-xs mt-0.5 leading-snug ${selected ? "opacity-80" : "text-text-muted"}`}>
              {t(language, workflow.shortDescriptionKey)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
