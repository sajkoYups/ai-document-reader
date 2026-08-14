"use client";

import type { OutputLanguage } from "@/types";
import { t } from "@/workflows/copy";

interface SuggestedFollowUpsProps {
  language: OutputLanguage;
  keys: string[];
  extra?: string[];
  onSelect: (text: string) => void;
}

export default function SuggestedFollowUps({
  language,
  keys,
  extra = [],
  onSelect,
}: SuggestedFollowUpsProps) {
  const seen = new Set<string>();
  const items = [...keys.map((key) => t(language, key)), ...extra].filter(
    (item): item is string => {
      if (!item || seen.has(item)) return false;
      seen.add(item);
      return true;
    },
  );
  if (items.length === 0) return null;
  return (
    <div className="space-y-2">
      <p className="text-xs uppercase tracking-wide text-text-muted">
        {t(language, "result.followUps")}
      </p>
      <div className="flex flex-wrap gap-2">
        {items.map((item, index) => (
          <button
            key={`${index}-${item}`}
            type="button"
            onClick={() => onSelect(item)}
            className="px-2.5 py-1 rounded-md text-xs bg-surface-2 border border-border text-text-secondary hover:text-text-primary cursor-pointer"
          >
            {item}
          </button>
        ))}
      </div>
    </div>
  );
}
