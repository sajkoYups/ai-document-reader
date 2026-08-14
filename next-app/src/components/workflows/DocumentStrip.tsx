"use client";

import { useRef } from "react";
import type { OutputLanguage } from "@/types";
import { t } from "@/workflows/copy";
import type { SessionDocument, CompareRoles } from "@/store/documentStore";
import { MAX_SESSION_DOCUMENTS } from "@/store/documentStore";
import Button from "@/components/Button";

interface DocumentStripProps {
  language: OutputLanguage;
  documents: SessionDocument[];
  activeDocumentId: string | null;
  isHosted: boolean;
  showCompareRoles?: boolean;
  compareRoles?: CompareRoles;
  onSelect: (id: string) => void;
  onAdd: (file: File) => void;
  onReplace: (id: string, file: File) => void;
  onRemove: (id: string) => void;
  onClearAll: () => void;
  onCompareRoleChange?: (side: "a" | "b", id: string) => void;
}

export default function DocumentStrip({
  language,
  documents,
  activeDocumentId,
  isHosted,
  showCompareRoles,
  compareRoles,
  onSelect,
  onAdd,
  onReplace,
  onRemove,
  onClearAll,
  onCompareRoleChange,
}: DocumentStripProps) {
  const addInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const replaceTargetRef = useRef<string | null>(null);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 rounded-xl bg-surface-1 border border-border">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap gap-2">
            {documents.map((doc) => {
              const active = doc.id === activeDocumentId;
              const meta =
                doc.pageCount && doc.pageCount > 0
                  ? `${doc.pageCount} ${t(language, "doc.pages")}`
                  : `${doc.sections.length} ${t(language, "doc.sections")}`;
              return (
                <button
                  key={doc.id}
                  type="button"
                  onClick={() => onSelect(doc.id)}
                  className={`
                    group relative max-w-[220px] text-left px-3 py-2 rounded-lg border transition-colors cursor-pointer
                    ${active
                      ? "border-accent bg-accent-dim text-text-primary"
                      : "border-border bg-surface-2 text-text-secondary hover:border-accent-border"}
                  `}
                >
                  <p className="text-sm font-medium truncate">
                    {doc.fileName ?? "Document"}
                  </p>
                  <p className="text-xs text-text-muted mt-0.5">
                    {meta} · {t(language, "doc.ready")}
                  </p>
                  <div className="mt-1.5 flex gap-1">
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
                      className="text-xs text-accent hover:underline"
                    >
                      {t(language, "doc.replace")}
                    </span>
                    <span className="text-xs text-text-muted">·</span>
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
                      className="text-xs text-text-muted hover:text-danger"
                    >
                      {t(language, "doc.remove")}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
          <p className="text-xs text-text-secondary">
            {isHosted ? t(language, "doc.privateHosted") : t(language, "doc.privateOnDevice")}
            {documents.length > 1
              ? ` · ${documents.length}/${MAX_SESSION_DOCUMENTS} ${t(language, "doc.documents")}`
              : null}
          </p>
        </div>
        <div className="flex items-center gap-2">
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
          {documents.length < MAX_SESSION_DOCUMENTS ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => addInputRef.current?.click()}
            >
              {t(language, "doc.add")}
            </Button>
          ) : null}
          <Button variant="ghost" size="sm" onClick={onClearAll}>
            {t(language, "doc.clearAll")}
          </Button>
        </div>
      </div>

      {showCompareRoles && documents.length >= 2 && compareRoles && onCompareRoleChange ? (
        <div className="flex flex-wrap gap-3 px-1 text-sm text-text-secondary">
          <label className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wide text-text-muted">
              {t(language, "doc.compareA")}
            </span>
            <select
              value={compareRoles.a ?? ""}
              onChange={(e) => onCompareRoleChange("a", e.target.value)}
              className="bg-surface-1 border border-border rounded-md px-2 py-1 text-sm"
            >
              {documents.map((d) => (
                <option key={d.id} value={d.id} disabled={d.id === compareRoles.b}>
                  {d.fileName ?? "Document"}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wide text-text-muted">
              {t(language, "doc.compareB")}
            </span>
            <select
              value={compareRoles.b ?? ""}
              onChange={(e) => onCompareRoleChange("b", e.target.value)}
              className="bg-surface-1 border border-border rounded-md px-2 py-1 text-sm"
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
    </div>
  );
}
