"use client";

import type { OutputLanguage } from "@/types";
import { t } from "@/workflows/copy";
import FileUpload from "@/components/FileUpload";
import TextArea from "@/components/TextArea";

interface AnalyzerEmptyStateProps {
  language: OutputLanguage;
  onFile: (file: File) => void;
  pasteValue: string;
  onPasteChange: (value: string) => void;
  error: string | null;
}

export default function AnalyzerEmptyState({
  language,
  onFile,
  pasteValue,
  onPasteChange,
  error,
}: AnalyzerEmptyStateProps) {
  return (
    <div className="w-full space-y-6 animate-fade-in">
      <div className="space-y-2">
        <h2 className="font-display text-3xl text-text-primary tracking-tight">
          {t(language, "empty.title")}
        </h2>
        <p className="text-sm text-text-secondary leading-relaxed">
          {t(language, "empty.privacy")}
        </p>
      </div>

      <FileUpload onFile={onFile} data-tour-id="file-upload" />

      {error ? (
        <div className="px-4 py-3 bg-danger/10 border border-danger/20 rounded-lg text-sm text-danger">
          {error}
        </div>
      ) : null}

      <div className="relative">
        <div className="absolute inset-x-0 top-0 flex items-center justify-center -translate-y-1/2">
          <span className="bg-surface-0 px-3 text-xs text-text-muted">
            {t(language, "empty.paste")}
          </span>
        </div>
      </div>

      <TextArea
        value={pasteValue}
        onChange={(e) => onPasteChange(e.target.value)}
        placeholder={t(language, "empty.pastePlaceholder")}
        rows={8}
        data-tour-id="text-input"
      />
    </div>
  );
}
