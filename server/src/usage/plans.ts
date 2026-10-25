export const LITE_ANALYSIS_SLOTS = 12;
export const LITE_HOSTED_TOKENS = 2_000_000;
export const MESSAGE_TOKEN_OVERHEAD = 32;
export const RESERVATION_TTL_MS = 120_000;

export const PLAN_CODES = ["free", "lite", "starter", "pro", "business"] as const;
export type PlanCode = (typeof PLAN_CODES)[number];

export interface PlanAllowance {
  slots: number | null;
  tokens: number | null;
}

export const PLAN_CATALOG: Record<PlanCode, PlanAllowance> = {
  free: { slots: null, tokens: null },
  lite: { slots: LITE_ANALYSIS_SLOTS, tokens: LITE_HOSTED_TOKENS },
  starter: { slots: null, tokens: null },
  pro: { slots: null, tokens: null },
  business: { slots: null, tokens: null },
};

export interface EntitlementView {
  id: string;
  clerkUserId: string;
  planCode: string;
  status: string;
  paymentStatus: string;
  periodMode: string;
  periodAnchor: Date | null;
  periodEnd: Date | null;
  expiresAt: Date | null;
}

export type AccessDenial =
  | "no_entitlement"
  | "inactive"
  | "expired"
  | "unknown_plan"
  | "unconfigured_limits"
  | "period_closed";

export function accessForHosted(
  entitlement: EntitlementView | null,
  now: Date,
):
  | { ok: true; allowance: { slots: number; tokens: number }; periodStart: Date; periodEnd: Date }
  | { ok: false; reason: AccessDenial } {
  if (!entitlement) return { ok: false, reason: "no_entitlement" };
  if (entitlement.status !== "active") return { ok: false, reason: "inactive" };
  if (entitlement.expiresAt && entitlement.expiresAt.getTime() <= now.getTime()) {
    return { ok: false, reason: "expired" };
  }
  if (!Object.prototype.hasOwnProperty.call(PLAN_CATALOG, entitlement.planCode)) {
    return { ok: false, reason: "unknown_plan" };
  }
  const allowance = PLAN_CATALOG[entitlement.planCode as PlanCode];
  if (allowance.slots === null || allowance.tokens === null) {
    return { ok: false, reason: "unconfigured_limits" };
  }
  const period = resolvePeriod(entitlement, now);
  if (!period) return { ok: false, reason: "period_closed" };
  return { ok: true, allowance: { slots: allowance.slots, tokens: allowance.tokens }, ...period };
}

export function resolvePeriod(
  entitlement: EntitlementView,
  now: Date,
): { periodStart: Date; periodEnd: Date } | null {
  if (entitlement.periodMode === "calendar_utc_month") {
    const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const periodEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
    return { periodStart, periodEnd };
  }
  if (entitlement.periodMode !== "subscription_period") return null;
  if (!entitlement.periodAnchor || !entitlement.periodEnd) return null;
  const span = entitlement.periodEnd.getTime() - entitlement.periodAnchor.getTime();
  if (span <= 0) return null;
  const startMs = entitlement.periodAnchor.getTime();
  if (now.getTime() < startMs) return null;
  const steps = Math.floor((now.getTime() - startMs) / span);
  const periodStart = new Date(startMs + steps * span);
  const periodEnd = new Date(periodStart.getTime() + span);
  return { periodStart, periodEnd };
}

export function estimateHold(
  inputBytes: number,
  messageCount: number,
  maxOutputTokens: number,
): number {
  return inputBytes + MESSAGE_TOKEN_OVERHEAD * messageCount + maxOutputTokens;
}

export function hostedReservationRequired(mode: "api" | "local"): boolean {
  return mode === "api";
}

export function isPlanCode(value: string): value is PlanCode {
  return Object.prototype.hasOwnProperty.call(PLAN_CATALOG, value);
}

/**
 * PLAN_CATALOG is the only legal allowance. The database row must match it.
 * Null catalog entries and any disagreement fail closed, so a table edit cannot
 * invent a Pro allowance or change Lite.
 */
export function limitsMatchCatalog(
  planCode: string,
  row: { slots: number | null; tokens: number | null } | null,
): "ok" | "unknown_plan" | "unconfigured_limits" {
  if (!isPlanCode(planCode)) return "unknown_plan";
  const catalog = PLAN_CATALOG[planCode];
  if (!row || row.slots !== catalog.slots || row.tokens !== catalog.tokens) {
    return "unconfigured_limits";
  }
  if (catalog.slots === null || catalog.tokens === null) return "unconfigured_limits";
  return "ok";
}
