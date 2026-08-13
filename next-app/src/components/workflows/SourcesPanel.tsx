"use client";

import { useRef } from "react";
import type { OutputLanguage } from "@/types";
import { t } from "@/workflows/copy";
import type { SessionDocument, CompareRoles } from "@/store/documentStore";
import { MAX_SESSION_DOCUMENTS } from "@/store/documentStore";
import Button from "@/components/Button";
import FileUpload from "@/components/FileUpload";
import TextArea from "@/components/TextArea";

interface SourcesPanelProps {
  language: OutputLanguage;
  documents: SessionDocument[];
  activeDocumentId: string | null;
  isHosted: boolean;
  showCompareRoles?: boolean;
  compareRoles?: CompareRoles;
  pasteValue: string;
  error: string | null;
  onSelect: (id: string) => void;
  onFile: (file: File) => void;
  onAdd: (file: File) => void;
  onReplace: (id: string, file: File) => void;
  onRemove: (id: string) => void;
  onClearAll: () => void;
  onPasteChange: (value: string) => void;
  onCompareRoleChange?: (side: "a" | "b", id: string) => void;
}

function FileGlyph({ fileName }: { fileName: string | null }) {
  const ext = (fileName ?? "").split(".").pop()?.toLowerCase();
  const label = ext === "pdf" ? "PDF" : ext === "md" ? "MD" : "TXT";
  return (
    <span
      className="shrink-0 w-8 h-8 rounded-md bg-surface-2 border border-border flex items-center justify-center
        text-[9px] font-mono font-medium uppercase text-text-muted"
    >
      {label}
    </span>
  );
}

export default function SourcesPanel({
  language,
  documents,
  activeDocumentId,
  isHosted,
  showCompareRoles,
  compareRoles,
  pasteValue,
  error,
  onSelect,
  onFile,
  onAdd,
  onReplace,
  onRemove,
  onClearAll,
  onPasteChange,
  onCompareRoleChange,
}: SourcesPanelProps) {
  const addInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const replaceTargetRef = useRef<string | null>(null);
  const empty = documents.length === 0;

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="shrink-0 flex items-center justify-between gap-2 px-3 py-3 border-b border-border-subtle">
        <div className="min-w-0">
          <p className="text-xs font-medium text-text-muted tracking-wide uppercase">
            {t(language, "workspace.sources")}
          </p>
          {empty ? null : (
            <p className="text-[11px] text-text-muted mt-0.5">
              {documents.length}/{MAX_SESSION_DOCUMENTS} {t(language, "doc.documents")}
            </p>
          )}
        </div>
        {empty ? null : (
          <div className="flex items-center gap-1">
            <input
              ref={addInputRef}
              type="file"
              accept=".pdf,.txt,.md"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onAdd(file);
                e.target.value = "";
              }}
            />
            {documents.length < MAX_SESSION_DOCUMENTS ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => addInputRef.current?.click()}
                data-tour-id="file-upload"
              >
                {t(language, "doc.add")}
              </Button>
            ) : (
              <span data-tour-id="file-upload" className="sr-only">
                {t(language, "workspace.sources")}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-3 py-3 space-y-3">
        {empty ? (
          <>
            <FileUpload onFile={onFile} compact data-tour-id="file-upload" />
            {error ? (
              <div className="px-3 py-2 bg-danger/10 border border-danger/20 rounded-lg text-xs text-danger">
                {error}
              </div>
            ) : null}
            <p className="text-[11px] text-center text-text-muted uppercase tracking-wide">
              {t(language, "empty.paste")}
            </p>
            <TextArea
              value={pasteValue}
              onChange={(e) => onPasteChange(e.target.value)}
              placeholder={t(language, "empty.pastePlaceholder")}
              rows={5}
              data-tour-id="text-input"
              className="px-3 py-2 text-xs"
            />
          </>
        ) : (
          <>
            <input
              ref={replaceInputRef}
              type="file"
              accept=".pdf,.txt,.md"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                const id = replaceTargetRef.current;
                if (file && id) onReplace(id, file);
                e.target.value = "";
                replaceTargetRef.current = null;
              }}
            />
            <ul className="space-y-1">
              {documents.map((doc) => {
                const active = doc.id === activeDocumentId;
                const meta =
                  doc.pageCount && doc.pageCount > 0
                    ? `${doc.pageCount} ${t(language, "doc.pages")}`
                    : `${doc.sections.length} ${t(language, "doc.sections")}`;
                return (
                  <li key={doc.id}>
                    <button
                      type="button"
                      onClick={() => onSelect(doc.id)}
                      className={`
                        group w-full flex items-start gap-2.5 text-left rounded-lg px-2 py-2
                        transition-colors cursor-pointer
                        ${
                          active
                            ? "bg-accent-dim text-text-primary"
                            : "text-text-secondary hover:bg-surface-2 hover:text-text-primary"
                        }
                      `}
                    >
                      <FileGlyph fileName={doc.fileName} />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium truncate">
                          {doc.fileName ?? "Document"}
                        </span>
                        <span className="block text-[11px] text-text-muted mt-0.5">
                          {meta} · {t(language, "doc.ready")}
                        </span>
                        <span className="mt-1.5 flex gap-1.5">
                          <span
                            role="button"
                            tabIndex={0}
                            onClick={(e) => {
                              e.stopPropagation();
                              replaceTargetRef.current = doc.id;
                              replaceInputRef.current?.click();
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.stopPropagation();
                                replaceTargetRef.current = doc.id;
                                replaceInputRef.current?.click();
                              }
                            }}
                            className="text-[10px] text-accent hover:underline"
                          >
                            {t(language, "doc.replace")}
                          </span>
                          <span className="text-[10px] text-text-muted">·</span>
                          <span
                            role="button"
                            tabIndex={0}
                            onClick={(e) => {
                              e.stopPropagation();
                              onRemove(doc.id);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.stopPropagation();
                                onRemove(doc.id);
                              }
                            }}
                            className="text-[10px] text-text-muted hover:text-danger"
                          >
                            {t(language, "doc.remove")}
                          </span>
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>

            {showCompareRoles && documents.length >= 2 && compareRoles && onCompareRoleChange ? (
              <div className="space-y-2 pt-1">
                <label className="flex flex-col gap-1 text-sm text-text-secondary">
                  <span className="text-[10px] uppercase tracking-wide text-text-muted">
                    {t(language, "doc.compareA")}
                  </span>
                  <select
                    value={compareRoles.a ?? ""}
                    onChange={(e) => onCompareRoleChange("a", e.target.value)}
                    className="bg-surface-1 border border-border rounded-md px-2 py-1.5 text-sm"
                  >
                    {documents.map((d) => (
                      <option key={d.id} value={d.id} disabled={d.id === compareRoles.b}>
                        {d.fileName ?? "Document"}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-sm text-text-secondary">
                  <span className="text-[10px] uppercase tracking-wide text-text-muted">
                    {t(language, "doc.compareB")}
                  </span>
                  <select
                    value={compareRoles.b ?? ""}
                    onChange={(e) => onCompareRoleChange("b", e.target.value)}
                    className="bg-surface-1 border border-border rounded-md px-2 py-1.5 text-sm"
                  >
                    {documents.map((d) => (
                      <option key={d.id} value={d.id} disabled={d.id === compareRoles.a}>
                        {d.fileName ?? "Document"}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            ) : null}
          </>
        )}
      </div>

      <div className="shrink-0 px-3 py-3 border-t border-border-subtle space-y-2">
        <p className="text-[11px] text-text-muted leading-snug">
          {isHosted ? t(language, "doc.privateHosted") : t(language, "doc.privateOnDevice")}
        </p>
        {empty ? null : (
          <Button variant="ghost" size="sm" onClick={onClearAll} className="w-full">
            {t(language, "doc.clearAll")}
          </Button>
        )}
      </div>
    </div>
  );
}
