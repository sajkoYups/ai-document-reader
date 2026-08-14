"use client";

import type { ReactNode, SVGProps } from "react";
import type { OutputLanguage } from "@/types";
import { t } from "@/workflows/copy";
import type { WorkflowDefinition, WorkflowId } from "@/workflows/types";

interface WorkflowSelectorProps {
  workflows: WorkflowDefinition[];
  selectedId: WorkflowId;
  language: OutputLanguage;
  onSelect: (id: WorkflowId) => void;
  compact?: boolean;
  afterSelected?: ReactNode;
}

function Icon({ children, ...props }: SVGProps<SVGSVGElement> & { children: ReactNode }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

function WorkflowIcon({ id }: { id: WorkflowId }) {
  switch (id) {
    case "summarize":
      return (
        <Icon>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="8" y1="13" x2="16" y2="13" />
          <line x1="8" y1="17" x2="13" y2="17" />
        </Icon>
      );
    case "review":
      return (
        <Icon>
          <path d="M9 11l3 3L22 4" />
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </Icon>
      );
    case "extract":
      return (
        <Icon>
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <line x1="3" y1="9" x2="21" y2="9" />
          <line x1="9" y1="21" x2="9" y2="9" />
        </Icon>
      );
    case "compare":
      return (
        <Icon>
          <rect x="3" y="4" width="7" height="16" rx="1" />
          <rect x="14" y="4" width="7" height="16" rx="1" />
        </Icon>
      );
    case "timeline":
      return (
        <Icon>
          <circle cx="12" cy="12" r="9" />
          <polyline points="12 7 12 12 16 14" />
        </Icon>
      );
    case "ask":
      return (
        <Icon>
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </Icon>
      );
    default:
      return (
        <Icon>
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        </Icon>
      );
  }
}

export default function WorkflowSelector({
  workflows,
  selectedId,
  language,
  onSelect,
  compact = false,
  afterSelected,
}: WorkflowSelectorProps) {
  const selectedInList = workflows.some((workflow) => workflow.id === selectedId);

  if (compact) {
    return (
      <div className="flex flex-col gap-0.5">
        {workflows.map((workflow) => {
          const selected = workflow.id === selectedId;
          const disabled = workflow.status === "coming_soon";
          return (
            <div key={workflow.id} className="flex flex-col">
              <button
                type="button"
                onClick={() => onSelect(workflow.id)}
                disabled={disabled}
                className={`
                  group relative flex items-center gap-2.5 w-full text-left rounded-md
                  px-2.5 py-2 transition-colors duration-150 cursor-pointer
                  disabled:opacity-60 disabled:cursor-not-allowed
                  ${
                    selected
                      ? "bg-surface-2 text-text-primary"
                      : "text-text-secondary hover:text-text-primary hover:bg-surface-2/70"
                  }
                `}
              >
                {selected ? (
                  <span
                    className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-accent"
                    aria-hidden="true"
                  />
                ) : null}
                <span className={selected ? "text-accent" : "text-text-muted group-hover:text-text-secondary"}>
                  <WorkflowIcon id={workflow.id} />
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  {t(language, workflow.nameKey)}
                </span>
                {disabled ? (
                  <span className="text-xs uppercase tracking-wide text-text-muted shrink-0">
                    {t(language, "comingSoon")}
                  </span>
                ) : null}
              </button>
              {selected ? afterSelected : null}
            </div>
          );
        })}
        {!selectedInList ? afterSelected : null}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {workflows.map((workflow) => {
        const selected = workflow.id === selectedId;
        const disabled = workflow.status === "coming_soon";
        return (
          <div key={workflow.id} className="flex flex-col gap-1">
            <button
              type="button"
              onClick={() => onSelect(workflow.id)}
              disabled={disabled}
              className={`
                text-left rounded-lg px-3.5 py-2.5 transition-all duration-150 cursor-pointer
                disabled:opacity-60 disabled:cursor-not-allowed
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
                  <span className={`text-xs uppercase tracking-wide ${selected ? "text-surface-0/80" : "text-text-muted"}`}>
                    {t(language, "comingSoon")}
                  </span>
                ) : null}
              </span>
              <span className={`block text-xs mt-0.5 leading-snug ${selected ? "text-surface-0/80" : "text-text-secondary"}`}>
                {t(language, workflow.shortDescriptionKey)}
              </span>
            </button>
            {selected ? afterSelected : null}
          </div>
        );
      })}
      {!selectedInList ? afterSelected : null}
    </div>
  );
}
