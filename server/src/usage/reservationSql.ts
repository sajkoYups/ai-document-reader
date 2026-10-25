import type { EntitlementView } from "./plans.js";
import { accessForHosted, limitsMatchCatalog } from "./plans.js";
import {
  applySettlement,
  adjustSettlement,
  reserve,
  trustedOperation,
  type HostedOperation,
  type Reservation,
  type ReservationStatus,
  type SettlementPatch,
  type UsageAccount,
} from "./reservation.js";

export interface Queryable {
  query: (text: string, params?: unknown[]) => Promise<{ rows: Array<Record<string, unknown>> }>;
}

export const SQL = {
  begin: "BEGIN",
  commit: "COMMIT",
  rollback: "ROLLBACK",
  lockEntitlement: `SELECT id, clerk_user_id, plan_code, status, payment_status, period_mode, period_anchor, period_end, expires_at
FROM entitlements
WHERE clerk_user_id = $1 AND status = 'active'
ORDER BY created_at DESC
LIMIT 1
FOR UPDATE`,
  upsertPeriod: `INSERT INTO usage_periods (entitlement_id, period_start, period_end, slots_used, tokens_settled)
VALUES ($1, $2, $3, 0, 0)
ON CONFLICT (entitlement_id, period_start)
DO UPDATE SET period_end = EXCLUDED.period_end
RETURNING id, entitlement_id, period_start, period_end, slots_used, tokens_settled`,
  loadReservations: `SELECT id, idempotency_key, workflow_id, operation, status, reserved_tokens,
  settled_prompt_tokens, settled_completion_tokens, cached_tokens, reasoning_tokens, provider_cost,
  model, provider_name, generation_id, consumes_slot, slot_counted, over_reservation, unreconciled, created_at
FROM ai_reservations
WHERE period_id = $1 AND (status IN ('reserved', 'submitted', 'streaming') OR idempotency_key = $2)`,
  loadPlan: `SELECT code, analysis_slot_limit, hosted_token_limit
FROM plan_definitions
WHERE code = $1`,
  loadParent: `SELECT idempotency_key, workflow_id, operation, status
FROM ai_reservations
WHERE entitlement_id = $1 AND idempotency_key = $2
ORDER BY created_at DESC
LIMIT 1`,
  insertReservation: `INSERT INTO ai_reservations (
  id, period_id, entitlement_id, period_start, idempotency_key, workflow_id, operation, status,
  reserved_tokens, consumes_slot, created_at
) VALUES ($1, $2, $3, $4, $5, $6, $7, 'reserved', $8, $9, $10)`,
  lockReservation: `SELECT id, period_id, status, reserved_tokens, consumes_slot, slot_counted,
  settled_prompt_tokens, settled_completion_tokens, generation_id
FROM ai_reservations WHERE id = $1 FOR UPDATE`,
  lockPeriod: `SELECT id, slots_used, tokens_settled FROM usage_periods WHERE id = $1 FOR UPDATE`,
  updateReservation: `UPDATE ai_reservations
SET status = $2, settled_prompt_tokens = $3, settled_completion_tokens = $4, cached_tokens = $5,
    reasoning_tokens = $6, provider_cost = $7, model = $8, provider_name = $9, generation_id = $10,
    over_reservation = $11, unreconciled = $12, slot_counted = $13, updated_at = $14
WHERE id = $1`,
  updatePeriod: `UPDATE usage_periods SET slots_used = $2, tokens_settled = $3 WHERE id = $1`,
  markSubmitted: `UPDATE ai_reservations
SET status = 'submitted', updated_at = $2
WHERE id = $1 AND status = 'reserved'
RETURNING id`,
  markStreaming: `UPDATE ai_reservations
SET status = 'streaming', generation_id = COALESCE($2, generation_id), updated_at = $3
WHERE id = $1 AND status IN ('reserved', 'submitted')`,
  adjustReservation: `UPDATE ai_reservations
SET settled_prompt_tokens = $2, settled_completion_tokens = $3, slot_counted = $4,
    over_reservation = $5, unreconciled = false, status = $6, updated_at = $7
WHERE id = $1`,
} as const;

function asDate(value: unknown): Date | null {
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}

function asLimit(value: unknown): number | null {
  if (value == null) return null;
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}

function asNumber(value: unknown): number {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : 0;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function mapEntitlement(row: Record<string, unknown>): EntitlementView {
  return {
    id: asString(row.id),
    clerkUserId: asString(row.clerk_user_id),
    planCode: asString(row.plan_code),
    status: asString(row.status),
    paymentStatus: asString(row.payment_status),
    periodMode: asString(row.period_mode),
    periodAnchor: asDate(row.period_anchor),
    periodEnd: asDate(row.period_end),
    expiresAt: asDate(row.expires_at),
  };
}

function mapReservation(row: Record<string, unknown>): Reservation {
  return {
    id: asString(row.id),
    idempotencyKey: asString(row.idempotency_key),
    workflowId: typeof row.workflow_id === "string" ? row.workflow_id : null,
    operation: asString(row.operation) as HostedOperation,
    status: asString(row.status) as ReservationStatus,
    hold: asNumber(row.reserved_tokens),
    consumesSlot: row.consumes_slot === true,
    slotCounted: row.slot_counted === true,
    settledPrompt: asNumber(row.settled_prompt_tokens),
    settledCompletion: asNumber(row.settled_completion_tokens),
    cachedTokens: row.cached_tokens == null ? null : asNumber(row.cached_tokens),
    reasoningTokens: row.reasoning_tokens == null ? null : asNumber(row.reasoning_tokens),
    cost: row.provider_cost == null ? null : asNumber(row.provider_cost),
    model: typeof row.model === "string" ? row.model : null,
    providerName: typeof row.provider_name === "string" ? row.provider_name : null,
    generationId: typeof row.generation_id === "string" ? row.generation_id : null,
    overReservation: row.over_reservation === true,
    unreconciled: row.unreconciled === true,
    createdAt: asDate(row.created_at)?.getTime() ?? 0,
  };
}

export type ReserveCallResult =
  | {
      ok: true;
      duplicate: boolean;
      reservationId: string;
      status: ReservationStatus;
      hold: number;
      consumesSlot: boolean;
      operation: HostedOperation;
      inputCharge: number;
    }
  | { ok: false; reason: string };

async function rollback(query: Queryable): Promise<void> {
  await query.query(SQL.rollback);
}

export async function reserveWithClient(
  query: Queryable,
  input: {
    userId: string;
    workflowId: string | null;
    operation: HostedOperation;
    idempotencyKey: string;
    parentIdempotencyKey?: string;
    route?: "analyze" | "chat";
    hold: number;
    inputCharge: number;
    now: Date;
  },
): Promise<ReserveCallResult> {
  await query.query(SQL.begin);
  try {
    const locked = await query.query(SQL.lockEntitlement, [input.userId]);
    const row = locked.rows[0];
    if (!row) {
      await rollback(query);
      return { ok: false, reason: "no_entitlement" };
    }
    const view = mapEntitlement(row);
    const access = accessForHosted(view, input.now);
    if (!access.ok && access.reason !== "unconfigured_limits") {
      await rollback(query);
      return { ok: false, reason: access.reason };
    }
    const planRows = await query.query(SQL.loadPlan, [view.planCode]);
    const plan = planRows.rows[0];
    const match = limitsMatchCatalog(
      view.planCode,
      plan
        ? {
            slots: asLimit(plan.analysis_slot_limit),
            tokens: asLimit(plan.hosted_token_limit),
          }
        : null,
    );
    if (match !== "ok") {
      await rollback(query);
      return { ok: false, reason: match };
    }
    if (!access.ok) {
      await rollback(query);
      return { ok: false, reason: access.reason };
    }
    const periodRows = await query.query(SQL.upsertPeriod, [
      row.id,
      access.periodStart,
      access.periodEnd,
    ]);
    const period = periodRows.rows[0];
    if (!period) {
      await rollback(query);
      return { ok: false, reason: "db" };
    }
    const existing = await query.query(SQL.loadReservations, [
      period.id,
      input.idempotencyKey,
    ]);
    const account: UsageAccount = {
      slotsUsed: asNumber(period.slots_used),
      tokensSettled: asNumber(period.tokens_settled),
      reservations: existing.rows.map(mapReservation),
    };
    let parent: { workflowId: string | null; operation: string; status: string } | null = null;
    if (input.parentIdempotencyKey) {
      const parentRows = await query.query(SQL.loadParent, [row.id, input.parentIdempotencyKey]);
      const parentRow = parentRows.rows[0];
      if (parentRow) {
        parent = {
          workflowId: typeof parentRow.workflow_id === "string" ? parentRow.workflow_id : null,
          operation: asString(parentRow.operation),
          status: asString(parentRow.status),
        };
      }
    }
    const operation = trustedOperation({
      route: input.route ?? "analyze",
      requested: input.operation,
      workflowId: input.workflowId,
      parent,
    });
    const decision = reserve(account, access.allowance, {
      idempotencyKey: input.idempotencyKey,
      workflowId: input.workflowId,
      operation,
      hold: input.hold,
      now: input.now.getTime(),
    });
    if (!decision.ok) {
      await rollback(query);
      return { ok: false, reason: decision.reason };
    }
    if (!decision.duplicate) {
      await query.query(SQL.insertReservation, [
        decision.reservation.id,
        period.id,
        row.id,
        access.periodStart,
        decision.reservation.idempotencyKey,
        decision.reservation.workflowId,
        decision.reservation.operation,
        decision.reservation.hold,
        decision.reservation.consumesSlot,
        new Date(decision.reservation.createdAt),
      ]);
    }
    await query.query(SQL.commit);
    return {
      ok: true,
      duplicate: decision.duplicate,
      reservationId: decision.reservation.id,
      status: decision.reservation.status,
      hold: decision.reservation.hold,
      consumesSlot: decision.reservation.consumesSlot,
      operation: decision.reservation.operation,
      inputCharge: input.inputCharge,
    };
  } catch (error) {
    await rollback(query).catch(() => undefined);
    throw error;
  }
}

export async function settleWithClient(
  query: Queryable,
  reservationId: string,
  patch: SettlementPatch,
  now: Date,
): Promise<void> {
  await query.query(SQL.begin);
  try {
    const locked = await query.query(SQL.lockReservation, [reservationId]);
    const row = locked.rows[0];
    if (!row) {
      await rollback(query);
      return;
    }
    const current = mapReservation(row);
    if (
      current.status === "completed" ||
      current.status === "partial" ||
      current.status === "released"
    ) {
      await query.query(SQL.commit);
      return;
    }
    const periodRows = await query.query(SQL.lockPeriod, [row.period_id]);
    const period = periodRows.rows[0];
    if (!period) {
      await rollback(query);
      return;
    }
    const next = applySettlement(
      {
        slotsUsed: asNumber(period.slots_used),
        tokensSettled: asNumber(period.tokens_settled),
        reservations: [current],
      },
      reservationId,
      patch,
    );
    const saved = next.reservations[0] ?? current;
    await query.query(SQL.updateReservation, [
      reservationId,
      saved.status,
      saved.settledPrompt,
      saved.settledCompletion,
      saved.cachedTokens,
      saved.reasoningTokens,
      saved.cost,
      saved.model,
      saved.providerName,
      saved.generationId,
      saved.overReservation,
      saved.unreconciled,
      saved.slotCounted,
      now,
    ]);
    await query.query(SQL.updatePeriod, [period.id, next.slotsUsed, next.tokensSettled]);
    await query.query(SQL.commit);
  } catch (error) {
    await rollback(query).catch(() => undefined);
    throw error;
  }
}

export async function markStreamingWithClient(
  query: Queryable,
  reservationId: string,
  generationId: string | null,
  now: Date,
): Promise<void> {
  await query.query(SQL.begin);
  try {
    await query.query(SQL.markStreaming, [reservationId, generationId, now]);
    await query.query(SQL.commit);
  } catch (error) {
    await rollback(query).catch(() => undefined);
    throw error;
  }
}

export async function markSubmittedWithClient(
  query: Queryable,
  reservationId: string,
  now: Date,
): Promise<boolean> {
  await query.query(SQL.begin);
  try {
    const updated = await query.query(SQL.markSubmitted, [reservationId, now]);
    await query.query(SQL.commit);
    return updated.rows.length > 0;
  } catch (error) {
    await rollback(query).catch(() => undefined);
    throw error;
  }
}

/** Replaces a settled total with a later provider lookup. A missing row is left unchanged. */
export async function correctReservationUsage(
  query: Queryable,
  reservationId: string,
  prompt: number,
  completion: number,
  now: Date,
): Promise<boolean> {
  await query.query(SQL.begin);
  try {
    const locked = await query.query(SQL.lockReservation, [reservationId]);
    const row = locked.rows[0];
    if (!row) {
      await rollback(query);
      return false;
    }
    const periodRows = await query.query(SQL.lockPeriod, [row.period_id]);
    const period = periodRows.rows[0];
    if (!period) {
      await rollback(query);
      return false;
    }
    const current = mapReservation(row);
    const next = adjustSettlement(
      {
        slotsUsed: asNumber(period.slots_used),
        tokensSettled: asNumber(period.tokens_settled),
        reservations: [current],
      },
      reservationId,
      prompt,
      completion,
    );
    const saved = next.reservations[0] ?? current;
    await query.query(SQL.adjustReservation, [
      reservationId,
      saved.settledPrompt,
      saved.settledCompletion,
      saved.slotCounted,
      saved.overReservation,
      saved.status,
      now,
    ]);
    await query.query(SQL.updatePeriod, [period.id, next.slotsUsed, next.tokensSettled]);
    await query.query(SQL.commit);
    return true;
  } catch (error) {
    await rollback(query).catch(() => undefined);
    throw error;
  }
}
