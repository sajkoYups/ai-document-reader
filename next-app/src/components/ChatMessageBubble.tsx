import type { ChatMessage } from "@/types";
import type { EvidenceReference as EvidenceRef } from "@/workflows/types";
import EvidenceReference from "@/components/workflows/results/EvidenceReference";

export function TypingDots() {
  return (
    <div className="flex items-center gap-1.5" aria-hidden="true">
      <span className="w-1.5 h-1.5 rounded-full bg-text-muted animate-pulse" />
      <span
        className="w-1.5 h-1.5 rounded-full bg-text-muted animate-pulse"
        style={{ animationDelay: "0.2s" }}
      />
      <span
        className="w-1.5 h-1.5 rounded-full bg-text-muted animate-pulse"
        style={{ animationDelay: "0.4s" }}
      />
    </div>
  );
}

interface ChatMessageBubbleProps {
  message: ChatMessage;
  streaming?: boolean;
  onOpenEvidence?: (ref: EvidenceRef) => void;
}

export default function ChatMessageBubble({
  message,
  streaming = false,
  onOpenEvidence,
}: ChatMessageBubbleProps) {
  const isUser = message.role === "user";
  const emptyStreaming = streaming && message.role === "assistant" && !message.content.trim();

  if (emptyStreaming) {
    return (
      <div className="flex justify-start">
        <div className="bg-surface-2 rounded-xl rounded-bl-sm px-4 py-3">
          <TypingDots />
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`
          max-w-[85%] rounded-xl px-4 py-2.5 text-sm leading-relaxed
          ${
            isUser
              ? "bg-accent text-surface-0 rounded-br-sm"
              : "bg-surface-2 text-text-secondary rounded-bl-sm"
          }
        `}
      >
        <p className="whitespace-pre-wrap">
          {message.content}
          {streaming && message.role === "assistant" ? (
            <span className="inline-block w-1.5 h-4 bg-accent/60 animate-pulse ml-0.5 align-text-bottom" />
          ) : null}
        </p>

        {message.evidenceRefs && message.evidenceRefs.length > 0 ? (
          <EvidenceReference evidence={message.evidenceRefs} onOpen={onOpenEvidence} />
        ) : message.evidence && message.evidence.length > 0 ? (
          <div className="mt-2 pt-2 border-t border-white/10 space-y-1.5">
            {message.evidence.map((snippet, j) => (
              <blockquote
                key={j}
                className="text-xs pl-2 border-l-2 border-accent/40 text-text-muted italic"
              >
                {snippet}
              </blockquote>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
