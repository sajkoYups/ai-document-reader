import {
  ESTIMATED_CHARS_PER_TOKEN,
  estimateTokenCount,
} from "@/lib/tokenEstimate";

/**
 * Must match server default (RUNPOD_CONTEXT_WINDOW / LLM_CONTEXT_WINDOW).
 * Override with NEXT_PUBLIC_DEEP_ANALYSIS_CONTEXT_WINDOW for local tuning.
 */
export const DEEP_ANALYSIS_CONTEXT_WINDOW_TOKENS = (() => {
  const raw = process.env.NEXT_PUBLIC_DEEP_ANALYSIS_CONTEXT_WINDOW;
  if (raw === undefined || raw === "") return 8192;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : 8192;
})();

/**
 * Reserved for max completion — align with server RUNPOD_MAX_TOKENS (all deep tasks).
 * Override with NEXT_PUBLIC_DEEP_ANALYSIS_COMPLETION_RESERVE when tuning.
 */
const DEEP_ANALYSIS_COMPLETION_RESERVE_TOKENS = (() => {
  const raw = process.env.NEXT_PUBLIC_DEEP_ANALYSIS_COMPLETION_RESERVE;
  if (raw === undefined || raw === "") return 2048;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : 2048;
})();

/**
 * Conservative reserve for system prompt, document markers, and language cues
 * (actual size depends on language; server re-checks with the real prompt).
 */
const DEEP_ANALYSIS_CHAT_OVERHEAD_TOKENS = 3200;

/** Max prior chat messages (user + assistant) sent to Deep Analysis chat API. */
export const MAX_API_CHAT_HISTORY_MESSAGES = 24;

export function capChatHistoryForApi(
  history: Array<{ role: string; content: string }>,
): Array<{ role: string; content: string }> {
  if (history.length <= MAX_API_CHAT_HISTORY_MESSAGES) return history;
  return history.slice(-MAX_API_CHAT_HISTORY_MESSAGES);
}

export function apiChatNeedsRetrievedOrTruncatedContext(
  documentText: string,
  history: Array<{ role: string; content: string }>,
  userMessage: string,
): boolean {
  const docT = estimateTokenCount(documentText);
  const histT = history.reduce(
    (a, m) => a + estimateTokenCount(m.content),
    0,
  );
  const msgT = estimateTokenCount(userMessage);
  const estimatedTotal =
    docT +
    histT +
    msgT +
    DEEP_ANALYSIS_CHAT_OVERHEAD_TOKENS +
    DEEP_ANALYSIS_COMPLETION_RESERVE_TOKENS;
  return estimatedTotal > DEEP_ANALYSIS_CONTEXT_WINDOW_TOKENS;
}

/**
 * Max characters to place in the document section after reserving history,
 * user message, completion, and system overhead.
 */
export function maxAssembledDocumentCharsForApiChat(
  history: Array<{ role: string; content: string }>,
  userMessage: string,
): number {
  const histT = history.reduce(
    (a, m) => a + estimateTokenCount(m.content),
    0,
  );
  const msgT = estimateTokenCount(userMessage);
  const availableTokens =
    DEEP_ANALYSIS_CONTEXT_WINDOW_TOKENS -
    DEEP_ANALYSIS_CHAT_OVERHEAD_TOKENS -
    DEEP_ANALYSIS_COMPLETION_RESERVE_TOKENS -
    histT -
    msgT;
  const tokenBudget = Math.max(2000, availableTokens);
  return Math.floor(tokenBudget * ESTIMATED_CHARS_PER_TOKEN);
}

export function truncateDocumentForApiChat(
  documentText: string,
  maxChars: number,
): string {
  if (documentText.length <= maxChars) return documentText;
  return (
    documentText.slice(0, maxChars) +
    "\n\n[... document truncated to fit model context ...]"
  );
}
