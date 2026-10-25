"use client";

import type { OutputLanguage } from "@/types";
import { t } from "@/workflows/copy";
import Card from "@/components/Card";
import RequestMoreAnalysesButton from "@/components/RequestMoreAnalysesButton";
import { isAnalysisLimitMessage } from "@/lib/analysisQuota";

export function EmptyResult({ language }: { language: OutputLanguage }) {
  return (
    <Card className="flex flex-col items-center justify-center py-16 text-center">
      <p className="text-sm text-text-secondary">{t(language, "result.empty")}</p>
    </Card>
  );
}

export function WorkflowError({
  language,
  message,
  onRerun,
}: {
  language: OutputLanguage;
  message?: string;
  onRerun?: () => void;
}) {
  return (
    <Card className="flex flex-col items-center justify-center py-12 text-center space-y-3">
      <p className="text-sm text-danger">{message || t(language, "result.error")}</p>
      {message && isAnalysisLimitMessage(message) ? (
        <RequestMoreAnalysesButton />
      ) : null}
      {onRerun ? (
        <button
          type="button"
          onClick={onRerun}
          className="text-sm text-accent hover:underline cursor-pointer"
        >
          {t(language, "result.rerun")}
        </button>
      ) : null}
    </Card>
  );
}
