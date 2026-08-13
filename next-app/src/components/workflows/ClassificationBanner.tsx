"use client";

import type { OutputLanguage } from "@/types";
import { t } from "@/workflows/copy";
import { getWorkflow } from "@/workflows/registry";
import type { WorkflowId } from "@/workflows/types";

interface ClassificationBannerProps {
  language: OutputLanguage;
  label: string;
  recommendedIds: WorkflowId[];
  onSelect: (id: WorkflowId) => void;
}

export default function ClassificationBanner({
  language,
  label,
  recommendedIds,
  onSelect,
}: ClassificationBannerProps) {
  return (
    <div className="rounded-xl border border-border bg-surface-1 px-4 py-3 space-y-2">
      <p className="text-sm text-text-secondary">
        {t(language, "classify.looksLike", { label })}
      </p>
      {recommendedIds.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs uppercase tracking-wide text-text-muted">
            {t(language, "classify.recommended")}
          </span>
          {recommendedIds.map((id) => {
            const workflow = getWorkflow(id);
            if (!workflow || workflow.status !== "ready") return null;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onSelect(id)}
                className="px-2.5 py-1 rounded-md text-xs font-medium bg-surface-2 border border-border text-text-secondary hover:text-text-primary hover:bg-surface-3 cursor-pointer"
              >
                {t(language, workflow.nameKey)}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
