"use client";

import type { OutputLanguage } from "@/types";
import { t } from "@/workflows/copy";
import Button from "@/components/Button";
import Modal from "@/components/Modal";

interface CapabilityGateProps {
  open: boolean;
  workflowId: "review" | "extract";
  language: OutputLanguage;
  onContinue: () => void;
  onCancel: () => void;
}

export default function CapabilityGate({
  open,
  workflowId,
  language,
  onContinue,
  onCancel,
}: CapabilityGateProps) {
  const titleKey = workflowId === "extract" ? "gate.extract.title" : "gate.review.title";

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
