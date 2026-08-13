"use client";

import type { OutputLanguage } from "@/types";
import { t } from "@/workflows/copy";
import { listPrimary } from "@/workflows/registry";
import type { WorkflowId } from "@/workflows/types";
import FileUpload from "@/components/FileUpload";
import TextArea from "@/components/TextArea";
import WorkflowSelector from "./WorkflowSelector";

interface AnalyzerEmptyStateProps {
  language: OutputLanguage;
  selectedId: WorkflowId;
  onSelect: (id: WorkflowId) => void;
  onFile: (file: File) => void;
  pasteValue: string;
  onPasteChange: (value: string) => void;
  onMore: () => void;
  error: string | null;
}

export default function AnalyzerEmptyState({
  language,
  selectedId,
  onSelect,
  onFile,
  pasteValue,
  onPasteChange,
  onMore,
  error,
}: AnalyzerEmptyStateProps) {
  const workflows = listPrimary();

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-fade-in py-4">
      <div className="text-center space-y-2">
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
        rows={6}
        data-tour-id="text-input"
      />

      <div className="space-y-3" data-tour-id="task-selector">
        <p className="text-xs font-medium text-text-secondary tracking-wide uppercase">
          {t(language, "empty.whatToDo")}
        </p>
        <WorkflowSelector
          workflows={workflows}
          selectedId={selectedId}
          language={language}
          onSelect={onSelect}
        />
        <button
          type="button"
          onClick={onMore}
          className="text-sm text-accent hover:underline cursor-pointer"
        >
          {t(language, "empty.more")} →
        </button>
      </div>
    </div>
  );
}
