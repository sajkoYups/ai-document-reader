import { neon } from "@neondatabase/serverless";

const DB_URL = process.env.DATABASE_URL;

/** Included Lite analyses per UTC calendar month. Warning starts here. */
export const LITE_INCLUDED_ANALYSES = 10;
/** Hard stop after this many metered runs in the UTC month (includes 2 extra). */
export const LITE_HARD_CAP_ANALYSES = 12;

export const USAGE_CHECK_UNAVAILABLE =
  "Deep Analysis is unavailable until usage can be checked. Try again in a moment.";

export type UsageCallType = "analyze" | "analyze_assist" | "chat";
export type AnalysisQuotaStatus = "ok" | "warning" | "blocked";

export interface AnalysisQuota {
  monthlyAnalyses: number;
  included: number;
  hardCap: number;
  remainingUntilStop: number;
  status: AnalysisQuotaStatus;
  resetsAt: string;
}

export function quotaFromCount(monthlyAnalyses: number, now = new Date()): AnalysisQuota {
  const resetsAt = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1),
  );
  const status: AnalysisQuotaStatus =
    monthlyAnalyses >= LITE_HARD_CAP_ANALYSES
      ? "blocked"
      : monthlyAnalyses >= LITE_INCLUDED_ANALYSES
        ? "warning"
        : "ok";

  return {
    monthlyAnalyses,
    included: LITE_INCLUDED_ANALYSES,
    hardCap: LITE_HARD_CAP_ANALYSES,
    remainingUntilStop: Math.max(0, LITE_HARD_CAP_ANALYSES - monthlyAnalyses),
    status,
    resetsAt: resetsAt.toISOString(),
  };
}

export function formatQuotaResetDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(iso));
}

/** User-facing warning or hard-stop copy. Keep in sync with next-app/src/lib/analysisQuota.ts. */
export function quotaNotice(quota: AnalysisQuota): string | null {
  const reset = formatQuotaResetDate(quota.resetsAt);
  if (quota.status === "blocked") {
    return `You've reached this month's Deep Analysis limit. It resets on ${reset}. Private Mode still works.`;
  }
  if (quota.status === "warning") {
    if (quota.remainingUntilStop === 1) {
      return `You can run 1 more Deep Analysis this month. After that it pauses until ${reset}.`;
    }
    return `You've used your ${quota.included} Lite analyses this month. You can run ${quota.remainingUntilStop} more, then Deep Analysis pauses until ${reset}.`;
  }
  return null;
}

/**
 * Record token usage for a single Deep Analysis call.
 * Uses a fire-and-forget pattern — errors are logged but never thrown to callers.
 *
 * `analyze` counts toward the monthly cap. `analyze_assist` is an automatic
 * repair or refine and does not. `chat` is Ask and does not.
 */
export async function recordUsage(
  userId: string,
  promptChars: number,
  completionChars: number,
  callType: UsageCallType,
): Promise<void> {
  if (!userId || !DB_URL) return;
  if (completionChars <= 0) return;

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

/** Metered Deep Analysis runs since 00:00 UTC on the first of this month. */
export async function getMonthlyAnalysisQuota(userId: string): Promise<AnalysisQuota> {
  if (!DB_URL) {
    throw new Error("DATABASE_URL is not set");
  }

  const sql = neon(DB_URL);
  const rows = await sql`
    SELECT COUNT(*)::int AS count
    FROM token_usage
    WHERE user_id = ${userId}
      AND call_type = 'analyze'
      AND created_at >= date_trunc('month', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'
  `;
  const count = Number(rows[0]?.count ?? 0);
  return quotaFromCount(Number.isFinite(count) ? count : 0);
}
