import { useState } from "react";
import type { DocumentChunk } from "@/lib/documentChunker";
import type { AssembleContextMeta } from "@/lib/chatPipeline";

export type RetrievalMethod = "direct" | "spread" | "semantic" | "hybrid" | "keyword-fallback" | "fallback";

export interface RagDebugInfo {
  method: RetrievalMethod;
  query?: string;
  retrievedChunks: DocumentChunk[];
  contextMeta: AssembleContextMeta;
  totalDocChars: number;
  totalDocChunks: number;
  timestamp: number;
}

interface DebugPanelProps {
  debugInfo: RagDebugInfo | null;
}

function truncatePreview(text: string, maxLen = 100): string {
  const oneLine = text.replace(/\n+/g, " ").trim();
  if (oneLine.length <= maxLen) return oneLine;
  return oneLine.slice(0, maxLen) + "...";
}

const METHOD_LABELS: Record<RetrievalMethod, string> = {
  direct: "Direct (full text)",
  spread: "Spread sampling",
  semantic: "Semantic search",
  hybrid: "Hybrid (semantic + keyword)",
  "keyword-fallback": "Keyword (embeddings not ready)",
  fallback: "Fallback (full text)",
};

export default function DebugPanel({ debugInfo }: DebugPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (process.env.NODE_ENV !== "development") return null;
  if (!debugInfo) return null;

  const { method, query, retrievedChunks, contextMeta, totalDocChars, totalDocChunks } = debugInfo;
  const coveragePercent = totalDocChars > 0
    ? ((contextMeta.totalChars / totalDocChars) * 100).toFixed(1)
    : "0";

  return (
    <div className="mt-4 border border-amber-500/30 rounded-lg bg-amber-500/5 text-xs font-mono">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 text-amber-400 hover:bg-amber-500/10 transition-colors rounded-lg"
      >
        <span className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-400" />
          RAG Debug
        </span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`transition-transform ${isOpen ? "rotate-180" : ""}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {isOpen && (
        <div className="px-3 pb-3 space-y-3">
          {/* Stats grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <StatBox label="Method" value={METHOD_LABELS[method]} />
            <StatBox label="Doc size" value={`${totalDocChars.toLocaleString()} chars`} />
            <StatBox label="Doc chunks" value={String(totalDocChunks)} />
            <StatBox label="Context sent" value={`${contextMeta.totalChars.toLocaleString()} chars (${coveragePercent}%)`} />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <StatBox label="Chunks used" value={`${contextMeta.chunksIncluded} / ${totalDocChunks}`} />
            <StatBox label="Truncated" value={String(contextMeta.truncatedChunks)} />
            <StatBox label="Gap markers" value={String(contextMeta.gapMarkers)} />
            {query && <StatBox label="Query" value={truncatePreview(query, 60)} />}
          </div>

          {/* Chunk previews */}
          {retrievedChunks.length > 0 && (
            <div className="space-y-1">
              <p className="text-amber-400/70 uppercase tracking-wider text-[10px]">
                Retrieved chunks ({retrievedChunks.length})
              </p>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {retrievedChunks.map((chunk, i) => (
                  <div
                    key={`${chunk.index}-${i}`}
                    className="flex gap-2 px-2 py-1 rounded bg-surface-2/50 text-text-secondary"
                  >
                    <span className="text-amber-400/60 shrink-0">
                      #{chunk.index}
                    </span>
                    <span className="text-[11px] leading-snug">
                      [{chunk.startChar}-{chunk.endChar}] {truncatePreview(chunk.text)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-2 py-1.5 rounded bg-surface-2/50">
      <p className="text-amber-400/60 text-[10px] uppercase tracking-wider">{label}</p>
      <p className="text-text-secondary mt-0.5 break-all">{value}</p>
    </div>
  );
}
