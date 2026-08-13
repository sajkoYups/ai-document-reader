"use client";

import type { OutputLanguage } from "@/types";
import { EXTRACT_TYPE_KEYS, type ExtractType } from "@/workflows/types";
import { t } from "@/workflows/copy";

interface ExtractSubmenuProps {
  language: OutputLanguage;
  selected: ExtractType | null;
  customQuery: string;
  onSelect: (type: ExtractType) => void;
  onCustomQueryChange: (value: string) => void;
}

export default function ExtractSubmenu({
  language,
  selected,
  customQuery,
  onSelect,
  onCustomQueryChange,
}: ExtractSubmenuProps) {
  const types = Object.keys(EXTRACT_TYPE_KEYS) as ExtractType[];

  return (
    <div className="ml-2 border-l-2 border-accent/40 pl-3 space-y-1">
      <p className="text-xs font-medium text-text-muted tracking-wide pt-1">
        {t(language, "extract.chooseType")}
      </p>
      {types.map((type) => {
        const keys = EXTRACT_TYPE_KEYS[type];
        const isSelected = selected === type;
        return (
          <button
            key={type}
            type="button"
            onClick={() => onSelect(type)}
            className={`
              w-full text-left rounded-md px-2.5 py-1.5 text-sm cursor-pointer transition-colors
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
      {selected === "custom" ? (
        <input
          type="text"
          value={customQuery}
          onChange={(e) => onCustomQueryChange(e.target.value)}
          placeholder={t(language, "extract.custom.placeholder")}
          className="w-full bg-surface-0 border border-border rounded-lg px-3 py-2 text-sm
            text-text-primary placeholder:text-text-muted
            focus:outline-none focus:border-accent/40"
        />
      ) : null}
    </div>
  );
}
