import { neon } from "@neondatabase/serverless";

const DB_URL = process.env.DATABASE_URL;

/**
 * Record token usage for a single Deep Analysis call.
 * Uses a fire-and-forget pattern — errors are logged but never thrown to callers.
 *
 * @param userId    Clerk userId (e.g. "user_abc123") — not sensitive PII
 * @param promptChars     plaintext char count of the prompt/document sent to the LLM
 * @param completionChars plaintext char count of the generated response
 * @param callType  'analyze' | 'chat'
 */
export async function recordUsage(
  userId: string,
  promptChars: number,
  completionChars: number,
  callType: "analyze" | "chat",
): Promise<void> {
  if (!userId || !DB_URL) return;

  const estimatedTokens = Math.ceil((promptChars + completionChars) / 4);

  try {
    const sql = neon(DB_URL);
    await sql`
      INSERT INTO token_usage (user_id, estimated_tokens, call_type)
      VALUES (${userId}, ${estimatedTokens}, ${callType})
    `;
  } catch (err) {
    console.error("[usageService] Failed to record token usage:", err);
  }
}
