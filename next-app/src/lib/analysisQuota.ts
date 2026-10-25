/** Included Lite analyses per UTC calendar month. Warning starts here. */
export const LITE_INCLUDED_ANALYSES = 10;
/** Hard stop after this many metered runs in the UTC month (includes 2 extra). */
export const LITE_HARD_CAP_ANALYSES = 12;

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

/** Opening of the hard-stop message. Used to recognize the limit error in the result card. */
export const ANALYSIS_LIMIT_MESSAGE_PREFIX =
  "You've reached this month's Deep Analysis limit.";

export function isAnalysisLimitMessage(message: string): boolean {
  return message.startsWith(ANALYSIS_LIMIT_MESSAGE_PREFIX);
}

/** Keep in sync with server/src/services/usageService.ts. */
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
