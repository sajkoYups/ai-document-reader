"use client";

import type { OutputLanguage } from "@/types";
import { t } from "@/workflows/copy";
import Button from "@/components/Button";

interface DocumentReadyBarProps {
  language: OutputLanguage;
  fileName: string | null;
  pageCount: number | null;
  sectionCount: number;
  isHosted: boolean;
  onReplace: () => void;
  onRemove: () => void;
  replaceInputRef?: React.RefObject<HTMLInputElement | null>;
  onFile: (file: File) => void;
}

export default function DocumentReadyBar({
  language,
  fileName,
  pageCount,
  sectionCount,
  isHosted,
  onReplace,
  onRemove,
  replaceInputRef,
  onFile,
}: DocumentReadyBarProps) {
  const meta =
    pageCount && pageCount > 0
      ? `${pageCount} ${t(language, "doc.pages")}`
      : `${sectionCount} ${t(language, "doc.sections")}`;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-xl bg-surface-1 border border-border">
      <div className="min-w-0">
        <p className="text-sm text-text-primary font-medium truncate">
          {fileName ?? "Document"}
        </p>
        <p className="text-xs text-text-secondary mt-0.5">
          {meta} · {t(language, "doc.ready")}
        </p>
        <p className="text-xs text-text-secondary mt-1">
          {isHosted ? t(language, "doc.privateHosted") : t(language, "doc.privateOnDevice")}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <input
          ref={replaceInputRef}
          type="file"
          accept=".pdf,.txt,.md"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onFile(file);
            e.target.value = "";
          }}
        />
        <Button variant="ghost" size="sm" onClick={onReplace}>
          {t(language, "doc.replace")}
        </Button>
        <Button variant="ghost" size="sm" onClick={onRemove}>
          {t(language, "doc.remove")}
        </Button>
      </div>
    </div>
  );
}
