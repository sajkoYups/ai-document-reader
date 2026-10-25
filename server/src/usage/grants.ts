import type { Queryable } from "./reservationSql.js";

export interface GrantPreview {
  writes: false;
  planCode: "lite";
  paymentStatus: "unpaid";
  source: "manual";
  userIds: string[];
}

function cleanIds(ids: string[]): string[] {
  return [...new Set(ids.map((id) => id.trim()).filter((id) => id.length > 0))].sort();
}

export function previewTesterGrants(
  usageUserIds: string[],
  explicitIds: string[],
): GrantPreview {
  return {
    writes: false,
    planCode: "lite",
    paymentStatus: "unpaid",
    source: "manual",
    userIds: cleanIds([...usageUserIds, ...explicitIds]),
  };
}

export function usersMissingLiteGrant(
  usageUserIds: string[],
  activeLiteUserIds: string[],
): string[] {
  const active = new Set(activeLiteUserIds);
  return cleanIds(usageUserIds).filter((id) => !active.has(id));
}

export interface BoundStatement {
  text: string;
  params: unknown[];
}

export type GrantDecision =
  | { action: "insert" }
  | { action: "skip"; reason: "active_lite" | "active_other"; planCode: string };

/** An existing active grant is left untouched. Only a user with no active row is inserted. */
export function decideGrant(
  active: { planCode: string; status: string } | null,
): GrantDecision {
  if (!active || active.status !== "active") return { action: "insert" };
  if (active.planCode === "lite") {
    return { action: "skip", reason: "active_lite", planCode: "lite" };
  }
  return { action: "skip", reason: "active_other", planCode: active.planCode };
}

export const GRANT_SQL = {
  lockActive: `SELECT id, plan_code, status
FROM entitlements
WHERE clerk_user_id = $1 AND status = 'active'
ORDER BY created_at DESC
LIMIT 1
FOR UPDATE`,
  insert: `INSERT INTO entitlements (
  clerk_user_id, plan_code, status, payment_status, source, period_mode
) VALUES ($1, 'lite', 'active', 'unpaid', 'manual', 'calendar_utc_month')
RETURNING id`,
} as const;

export function grantStatements(userId: string): { insert: BoundStatement } {
  return {
    insert: { text: GRANT_SQL.insert, params: [userId] },
  };
}

export interface GrantApplyResult {
  inserted: string[];
  skippedLite: string[];
  skippedOther: Array<{ userId: string; planCode: string }>;
}

/**
 * Inserts a Lite grant only when the user has no active entitlement.
 * Caller owns the transaction. Does not update usage periods.
 */
export async function applyTesterGrants(
  query: Queryable,
  userIds: string[],
): Promise<GrantApplyResult> {
  const result: GrantApplyResult = { inserted: [], skippedLite: [], skippedOther: [] };
  for (const userId of cleanIds(userIds)) {
    const locked = await query.query(GRANT_SQL.lockActive, [userId]);
    const row = locked.rows[0];
    const decision = decideGrant(
      row
        ? { planCode: String(row.plan_code ?? ""), status: String(row.status ?? "") }
        : null,
    );
    if (decision.action === "skip" && decision.reason === "active_lite") {
      result.skippedLite.push(userId);
      continue;
    }
    if (decision.action === "skip") {
      result.skippedOther.push({ userId, planCode: decision.planCode });
      continue;
    }
    await query.query(GRANT_SQL.insert, [userId]);
    result.inserted.push(userId);
  }
  return result;
}

export const PLAN_SEED_SQL = `INSERT INTO plan_definitions (code, analysis_slot_limit, hosted_token_limit) VALUES
  ('free', NULL, NULL),
  ('lite', 12, 2000000),
  ('starter', NULL, NULL),
  ('pro', NULL, NULL),
  ('business', NULL, NULL)
ON CONFLICT (code) DO UPDATE SET
  analysis_slot_limit = EXCLUDED.analysis_slot_limit,
  hosted_token_limit = EXCLUDED.hosted_token_limit`;
