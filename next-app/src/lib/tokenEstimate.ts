/** Approximate chars per token for Qwen-style tokenizers (used for on-device limit). */
export const ESTIMATED_CHARS_PER_TOKEN = 4;

/** Max estimated tokens allowed for on-device analysis; above this we block Run and suggest Deep Analysis. */
export const MAX_ON_DEVICE_TOKENS = 4900;

export function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / ESTIMATED_CHARS_PER_TOKEN);
}
