"use client";

import type { OutputLanguage } from "@/types";
import { t } from "@/workflows/copy";

interface EvidenceFinderQueryProps {
  language: OutputLanguage;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export default function EvidenceFinderQuery({
  language,
  value,
  onChange,
  disabled,
}: EvidenceFinderQueryProps) {
  return (
    <div className="ml-2 border-l-2 border-accent/40 pl-3 space-y-2 py-1">
      <p className="text-xs font-medium text-text-muted tracking-wide">
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
    </div>
  );
}
