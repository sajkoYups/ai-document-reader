"use client";

import type { OutputLanguage } from "@/types";
import { t } from "@/workflows/copy";
import Button from "@/components/Button";

interface EvidenceFinderQueryProps {
  language: OutputLanguage;
  value: string;
  onChange: (value: string) => void;
  onRun: () => void;
  disabled?: boolean;
}

export default function EvidenceFinderQuery({
  language,
  value,
  onChange,
  onRun,
  disabled,
}: EvidenceFinderQueryProps) {
  return (
    <div className="space-y-2 rounded-lg border border-border bg-surface-1 p-3">
      <p className="text-xs font-medium text-text-muted uppercase tracking-wide">
        {t(language, "advanced.evidenceQuery")}
      </p>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t(language, "advanced.evidenceQueryPlaceholder")}
        disabled={disabled}
        className="w-full bg-surface-0 border border-border rounded-lg px-3 py-2 text-sm
          text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/40"
      />
      <Button
        variant="secondary"
        size="sm"
        onClick={onRun}
        disabled={disabled || !value.trim()}
        className="w-full"
      >
        {t(language, "advanced.runEvidence")}
      </Button>
    </div>
  );
}
