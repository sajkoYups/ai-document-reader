import { useState, useRef, useEffect } from "react";
import type { ChatMessage } from "@/types";
import Button from "./Button";

interface ChatPanelProps {
  messages: ChatMessage[];
  isGenerating: boolean;
  onSend: (message: string) => void;
  onClear: () => void;
  disabled?: boolean;
}

export default function ChatPanel({
  messages,
  isGenerating,
  onSend,
  onClear,
  disabled = false,
}: ChatPanelProps) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = () => {
    const trimmed = input.trim();
    if (!trimmed || isGenerating) return;
    onSend(trimmed);
    setInput("");
  };

  return (
    <div className="flex flex-col h-full bg-surface-1 border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
        <span className="text-xs font-medium text-text-muted tracking-wide uppercase">
          Chat with Document
        </span>
        {messages.length > 0 && (
          <Button variant="ghost" size="sm" onClick={onClear}>
            Clear
          </Button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <p className="text-sm text-text-muted">
              Ask a question about your document
            </p>
            <p className="text-xs text-text-muted/60 mt-1">
              e.g., &ldquo;What are the key obligations?&rdquo;
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`
                max-w-[85%] rounded-xl px-4 py-2.5 text-sm leading-relaxed
                ${
                  msg.role === "user"
                    ? "bg-accent text-surface-0 rounded-br-sm"
                    : "bg-surface-2 text-text-secondary rounded-bl-sm"
                }
              `}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>

              {msg.evidence && msg.evidence.length > 0 && (
                <div className="mt-2 pt-2 border-t border-white/10 space-y-1.5">
                  {msg.evidence.map((snippet, j) => (
                    <blockquote
                      key={j}
                      className="text-xs pl-2 border-l-2 border-accent/40 text-text-muted italic"
                    >
                      {snippet}
                    </blockquote>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {isGenerating && (
          <div className="flex justify-start">
            <div className="bg-surface-2 rounded-xl rounded-bl-sm px-4 py-3 flex items-center gap-1.5">
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
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-border-subtle">
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
                handleSubmit();
              }
            }}
            placeholder={
              disabled
                ? "Load a document first..."
                : "Ask about your document..."
            }
            disabled={disabled || isGenerating}
            className="flex-1 bg-surface-0 border border-border rounded-lg px-3 py-2 text-sm
              text-text-primary placeholder:text-text-muted
              focus:outline-none focus:border-accent/40 focus:ring-1 focus:ring-accent/20
              disabled:opacity-40 transition-colors"
          />
          <Button
            variant="primary"
            size="md"
            onClick={handleSubmit}
            disabled={!input.trim() || isGenerating || disabled}
          >
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}
