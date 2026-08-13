import { useState } from "react";
import Card from "./Card";
import Button from "./Button";

interface OutputPanelProps {
  content: string;
  isLoading: boolean;
  taskLabel: string;
  error?: string | null;
  onStop?: () => void;
}

export default function OutputPanel({
  content,
  isLoading,
  taskLabel,
  error,
  onStop,
}: OutputPanelProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!content) return;
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (error) {
    return (
      <Card className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-12 h-12 rounded-xl bg-danger/10 flex items-center justify-center text-danger mb-3">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        </div>
        <p className="text-sm text-danger">{error}</p>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs text-text-muted font-medium tracking-wide uppercase">
            <span className="inline-block w-2 h-2 rounded-full bg-accent animate-pulse" />
            Running {taskLabel}...
          </div>
          {onStop && (
            <Button variant="ghost" size="sm" onClick={onStop}>
              Stop
            </Button>
          )}
        </div>
        {content ? (
          <div className="text-sm text-text-primary leading-relaxed whitespace-pre-wrap font-body">
            {content}
            <span className="inline-block w-1.5 h-4 bg-accent/60 animate-pulse ml-0.5 align-text-bottom" />
          </div>
        ) : (
          <div className="space-y-2">
            <div className="skeleton h-4 w-full" />
            <div className="skeleton h-4 w-5/6" />
            <div className="skeleton h-4 w-4/6" />
          </div>
        )}
      </Card>
    );
  }

  if (!content) {
    return (
      <Card className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-12 h-12 rounded-xl bg-surface-2 flex items-center justify-center text-text-muted mb-3">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
        </div>
        <p className="text-sm text-text-secondary">Results will appear here</p>
      </Card>
    );
  }

  return (
    <Card className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-text-muted font-medium tracking-wide uppercase">
          {taskLabel} Result
        </span>
        <Button variant="ghost" size="sm" onClick={handleCopy}>
          {copied ? "Copied!" : "Copy"}
        </Button>
      </div>
      <div className="text-sm text-text-primary leading-relaxed whitespace-pre-wrap font-body">
        {content}
      </div>
    </Card>
  );
}
