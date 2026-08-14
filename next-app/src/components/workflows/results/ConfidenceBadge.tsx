"use client";

import type { OutputLanguage } from "@/types";
import { t } from "@/workflows/copy";
import type { ConfidenceLevel, ImportanceLevel } from "@/workflows/types";

interface ConfidenceBadgeProps {
  language: OutputLanguage;
  level: ConfidenceLevel | ImportanceLevel;
  kind?: "confidence" | "importance";
}

const styles: Record<string, string> = {
  high: "text-accent border-accent-border bg-accent-dim",
  medium: "text-warning border-warning/30 bg-warning/10",
  low: "text-text-muted border-border bg-surface-2",
};

export default function ConfidenceBadge({
  language,
  level,
  kind = "confidence",
}: ConfidenceBadgeProps) {
  const key =
    kind === "importance"
      ? `result.importance.${level}`
      : `result.confidence.${level}`;
  return (
    <span
      className={`inline-flex text-xs uppercase tracking-wide px-2 py-0.5 rounded-full border ${styles[level] ?? styles.medium}`}
    >
      {t(language, key)}
    </span>
  );
}
