"use client";

import { useState } from "react";
import type { OutputLanguage } from "@/types";
import { EXTRACT_TYPE_KEYS, type ExtractType } from "@/workflows/types";
import { t } from "@/workflows/copy";
import Button from "@/components/Button";

interface ExtractSubmenuProps {
  language: OutputLanguage;
  selected: ExtractType | null;
  customQuery: string;
  onSelect: (type: ExtractType) => void;
  onCustomQueryChange: (value: string) => void;
  onRunCustom: () => void;
}

export default function ExtractSubmenu({
  language,
  selected,
  customQuery,
  onSelect,
  onCustomQueryChange,
  onRunCustom,
}: ExtractSubmenuProps) {
  const [showCustom, setShowCustom] = useState(selected === "custom");
  const types = Object.keys(EXTRACT_TYPE_KEYS) as ExtractType[];

  return (
    <div className="space-y-2 pl-1">
      {types.map((type) => {
        const keys = EXTRACT_TYPE_KEYS[type];
        const isSelected = selected === type;
        return (
          <button
            key={type}
            type="button"
            onClick={() => {
              onSelect(type);
              setShowCustom(type === "custom");
            }}
            className={`
              w-full text-left rounded-md px-3 py-2 text-sm cursor-pointer transition-colors
              ${
                isSelected
                  ? "bg-accent-dim text-accent border border-accent-border"
                  : "text-text-secondary hover:bg-surface-2 hover:text-text-primary"
              }
            `}
          >
            <span className="block font-medium">{t(language, keys.nameKey)}</span>
            <span className="block text-xs text-text-muted mt-0.5">
              {t(language, keys.descriptionKey)}
            </span>
          </button>
        );
      })}
      {showCustom ? (
        <div className="flex gap-2 pt-1">
          <input
            type="text"
            value={customQuery}
            onChange={(e) => onCustomQueryChange(e.target.value)}
            placeholder={t(language, "extract.custom.placeholder")}
            className="flex-1 bg-surface-0 border border-border rounded-lg px-3 py-2 text-sm
              text-text-primary placeholder:text-text-muted
              focus:outline-none focus:border-accent/40"
          />
          <Button
            variant="primary"
            size="sm"
            onClick={onRunCustom}
            disabled={!customQuery.trim()}
          >
            {t(language, "extract.custom.run")}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
