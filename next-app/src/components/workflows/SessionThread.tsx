"use client";

import { useEffect, useRef, useState } from "react";
import type { OutputLanguage } from "@/types";
import type { ExtractType, EvidenceReference, WorkflowId } from "@/workflows/types";
import { t } from "@/workflows/copy";
import { getWorkflow } from "@/workflows/registry";
import Button from "@/components/Button";
import ChatMessageBubble from "@/components/ChatMessageBubble";
import { EmptyResult } from "@/components/workflows/results/EmptyResult";
import SourceViewer from "@/components/workflows/results/SourceViewer";
import WorkflowResultRouter from "@/components/workflows/results/WorkflowResultRouter";
import type { SessionEntry } from "@/store/sessionStore";

interface SessionThreadProps {
  language: OutputLanguage;
  entries: SessionEntry[];
  liveWorkflowId: WorkflowId;
  liveExtractType: ExtractType;
  isProcessing: boolean;
  isRepairing: boolean;
  isGenerating: boolean;
  liveError: string | null;
  livePartial: unknown | null;
  liveValidated: unknown | null;
  liveEvidenceById: Record<string, EvidenceReference>;
  extraQuestions?: string[];
  showAskComposer: boolean;
  composerDisabled?: boolean;
  composerDisabledReason?: string;
  onSend: (message: string) => void;
  onClear: () => void;
  onStop?: () => void;
  onAsk: (message: string) => void;
  onFollowUp: (text: string) => void;
  onRerun: (workflowId: WorkflowId, extractType?: ExtractType) => void;
}

export default function SessionThread({
  language,
  entries,
  liveWorkflowId,
  liveExtractType,
  isProcessing,
  isRepairing,
  isGenerating,
  liveError,
  livePartial,
  liveValidated,
  liveEvidenceById,
  extraQuestions,
  showAskComposer,
  composerDisabled = false,
  composerDisabledReason,
  onSend,
  onClear,
  onStop,
  onAsk,
  onFollowUp,
  onRerun,
}: SessionThreadProps) {
  const [input, setInput] = useState("");
  const [source, setSource] = useState<EvidenceReference | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const showLive = isProcessing || isRepairing;
  const empty = entries.length === 0 && !showLive;

  useEffect(() => {
    endRef.current?.scrollIntoView({
      behavior: isProcessing || isGenerating ? "auto" : "smooth",
      block: "end",
    });
  }, [entries, isProcessing, isRepairing, isGenerating, livePartial, liveValidated]);

  const lastWorkflowIndex = entries.reduce((last, entry, i) => {
    if (entry.kind === "workflow" && entry.result && !entry.error) return i;
    return last;
  }, -1);

  const submit = () => {
    const trimmed = input.trim();
    if (!trimmed || composerDisabled || isGenerating || isProcessing) return;
    onSend(trimmed);
    setInput("");
  };

  return (
    <div className="flex flex-col min-h-[400px] h-full bg-surface-1 border border-border rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
        <span className="text-xs font-medium text-text-muted tracking-wide uppercase">
          {t(language, "session.thread")}
        </span>
        {entries.length > 0 ? (
          <Button variant="ghost" size="sm" onClick={onClear}>
            {t(language, "ask.clearConversation")}
          </Button>
        ) : null}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {empty ? <EmptyResult language={language} /> : null}

        {entries.map((entry, i) => {
          if (entry.kind === "chat") {
            const isLastAssistant =
              isGenerating &&
              i === entries.length - 1 &&
              entry.role === "assistant";
            return (
              <ChatMessageBubble
                key={entry.id}
                message={{
                  role: entry.role,
                  content: entry.content,
                  evidence: entry.evidence,
                  evidenceRefs: entry.evidenceRefs,
                }}
                streaming={isLastAssistant}
                onOpenEvidence={setSource}
              />
            );
          }

          const def = getWorkflow(entry.workflowId);
          return (
            <WorkflowResultRouter
              key={entry.id}
              language={language}
              workflowId={entry.workflowId}
              extractType={entry.extractType ?? "key-information"}
              isProcessing={false}
              isRepairing={false}
              error={entry.error ?? null}
              partial={null}
              validated={entry.result ?? null}
              evidenceById={entry.evidenceById}
              followUpKeys={def?.suggestedFollowUpKeys ?? []}
              extraQuestions={extraQuestions}
              includeFollowUps={i === lastWorkflowIndex && i === entries.length - 1}
              onRerun={() => onRerun(entry.workflowId, entry.extractType)}
              onAsk={onAsk}
              onFollowUp={onFollowUp}
            />
          );
        })}

        {showLive ? (
          <WorkflowResultRouter
            language={language}
            workflowId={liveWorkflowId}
            extractType={liveExtractType}
            isProcessing={isProcessing}
            isRepairing={isRepairing}
            error={liveError}
            partial={livePartial}
            validated={liveValidated}
            evidenceById={liveEvidenceById}
            followUpKeys={[]}
            includeFollowUps={false}
            onRerun={() => onRerun(liveWorkflowId, liveExtractType)}
            onStop={onStop}
            onAsk={onAsk}
            onFollowUp={onFollowUp}
          />
        ) : null}

        <div ref={endRef} />
      </div>

      <SourceViewer
        open={source !== null}
        language={language}
        reference={source}
        onClose={() => setSource(null)}
      />

      {showAskComposer ? (
        <div className="p-3 border-t border-border-subtle">
          {composerDisabled && composerDisabledReason ? (
            <p className="mb-2 text-xs text-text-muted" role="status">
              {composerDisabledReason}
            </p>
          ) : null}
          <div className="flex gap-2">
            <input
              type="text"
              autoComplete="off"
              spellCheck={false}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
              placeholder={t(language, "ask.placeholder")}
              disabled={composerDisabled || isGenerating || isProcessing}
              className="flex-1 bg-surface-0 border border-border rounded-lg px-3 py-2 text-sm
                text-text-primary placeholder:text-text-muted
                focus:outline-none focus:border-accent/40 focus:ring-1 focus:ring-accent/20
                disabled:opacity-40 transition-colors"
            />
            <Button
              variant="primary"
              size="md"
              onClick={submit}
              disabled={
                !input.trim() || composerDisabled || isGenerating || isProcessing
              }
            >
              {t(language, "ask.send")}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
