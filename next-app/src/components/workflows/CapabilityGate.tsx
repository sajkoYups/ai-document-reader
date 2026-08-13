"use client";

import type { OutputLanguage } from "@/types";
import type { WorkflowId } from "@/workflows/types";
import { t } from "@/workflows/copy";
import Button from "@/components/Button";
import Modal from "@/components/Modal";

interface CapabilityGateProps {
  open: boolean;
  workflowId: WorkflowId;
  language: OutputLanguage;
  onContinue: () => void;
  onCancel: () => void;
}

const TITLE_KEYS: Partial<Record<WorkflowId, string>> = {
  review: "gate.review.title",
  extract: "gate.extract.title",
  compare: "gate.compare.title",
  timeline: "gate.timeline.title",
  contradictions: "gate.contradictions.title",
  "missing-information": "gate.missingInformation.title",
  "evidence-finder": "gate.evidenceFinder.title",
  "action-items": "gate.actionItems.title",
};

export default function CapabilityGate({
  open,
  workflowId,
  language,
  onContinue,
  onCancel,
}: CapabilityGateProps) {
  const titleKey = TITLE_KEYS[workflowId] ?? "gate.generic.title";

  return (
    <Modal open={open} onClose={onCancel}>
      <div className="space-y-4">
        <h2 className="font-display text-2xl text-text-primary pr-8">
          {t(language, titleKey)}
        </h2>
        <p className="text-sm text-text-secondary leading-relaxed">
          {t(language, "gate.body")}
        </p>
        <div className="flex flex-wrap gap-2 pt-2">
          <Button variant="primary" onClick={onContinue}>
            {t(language, "gate.continue")}
          </Button>
          <Button variant="secondary" onClick={onCancel}>
            {t(language, "gate.cancel")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
