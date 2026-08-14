"use client";

import type { OutputLanguage } from "@/types";
import type { EvidenceReference } from "@/workflows/types";
import { formatEvidenceLabel } from "@/workflows/evidence";
import { t } from "@/workflows/copy";
import Modal from "@/components/Modal";

interface SourceViewerProps {
  open: boolean;
  language: OutputLanguage;
  reference: EvidenceReference | null;
  onClose: () => void;
}

export default function SourceViewer({
  open,
  language,
  reference,
  onClose,
}: SourceViewerProps) {
  if (!reference) return null;
  return (
    <Modal open={open} onClose={onClose}>
      <div className="space-y-3">
        <h2 className="font-display text-xl text-text-primary pr-8">
          {t(language, "result.source")}
        </h2>
        <p className="text-xs text-accent">{formatEvidenceLabel(reference)}</p>
        {reference.documentName ? (
          <p className="text-xs text-text-muted">{reference.documentName}</p>
        ) : null}
        {reference.excerpt ? (
          <blockquote className="text-sm text-text-secondary leading-relaxed border-l-2 border-accent/40 pl-3 italic">
            {reference.excerpt}
          </blockquote>
        ) : null}
      </div>
    </Modal>
  );
}
