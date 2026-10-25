import { knownWorkflow } from "./workflows.js";
import type { HostedOperation } from "./reservation.js";
import { resolveFinish, type FinishInput, type SettlementPatch } from "./reservation.js";
import {
  markStreamingWithClient,
  reserveWithClient,
  settleWithClient,
  type Queryable,
  type ReserveCallResult,
} from "./reservationSql.js";

export type BeginResult =
  | (ReserveCallResult & { ok: true })
  | { ok: false; status: number; error: string; reason: string };

export function resolveOperation(value: string | undefined): HostedOperation | null {
  if (
    value === "analysis" ||
    value === "repair" ||
    value === "refine" ||
    value === "chat"
  ) {
    return value;
  }
  return null;
}

export function beginFailure(reason: string): BeginResult {
  if (reason === "analysis_limit") {
    return {
      ok: false,
      status: 429,
      reason,
      error: "You've reached this month's Deep Analysis limit.",
    };
  }
  if (reason === "token_limit") {
    return {
      ok: false,
      status: 429,
      reason,
      error: "You've reached this month's hosted usage limit.",
    };
  }
  if (
    reason === "bad_operation" ||
    reason === "bad_workflow" ||
    reason === "missing_key" ||
    reason === "missing_user"
  ) {
    return { ok: false, status: 400, reason, error: "Invalid request" };
  }
  if (reason === "db") {
    return {
      ok: false,
      status: 503,
      reason,
      error: "Deep Analysis is unavailable until usage can be checked. Try again in a moment.",
    };
  }
  return {
    ok: false,
    status: 403,
    reason,
    error: "Deep Analysis isn't available on this account.",
  };
}

export async function beginHostedCall(
  input: {
    userId: string;
    workflowId?: string;
    operation?: string;
    idempotencyKey?: string;
    parentIdempotencyKey?: string;
    route?: "analyze" | "chat";
    clientPlan?: string;
    metered?: boolean;
    hold: number;
    inputCharge: number;
    now: Date;
  },
  query: Queryable,
): Promise<BeginResult> {
  if (input.clientPlan !== undefined || input.metered !== undefined) {
    // The browser's plan name and metered flag are not consulted.
  }
  if (!input.userId) return beginFailure("missing_user");
  if (!knownWorkflow(input.workflowId)) return beginFailure("bad_workflow");
  if (!input.idempotencyKey || input.idempotencyKey.length < 8) {
    return beginFailure("missing_key");
  }
  const requested = resolveOperation(input.operation);
  try {
    const reserved = await reserveWithClient(query, {
      userId: input.userId,
      workflowId: input.workflowId ?? null,
      operation: requested ?? "analysis",
      idempotencyKey: input.idempotencyKey,
      parentIdempotencyKey: input.parentIdempotencyKey,
      route: input.route ?? "analyze",
      hold: input.hold,
      inputCharge: input.inputCharge,
      now: input.now,
    });
    if (!reserved.ok) return beginFailure(reserved.reason);
    if (reserved.duplicate) {
      return {
        ok: false,
        status: 409,
        reason: "duplicate",
        error: "This request was already processed.",
      };
    }
    return reserved;
  } catch (error) {
    console.error("[quota] reservation failed", error);
    return beginFailure("db");
  }
}

export async function finishHostedCall(
  query: Queryable,
  reservationId: string,
  input: FinishInput,
  now: Date,
): Promise<SettlementPatch> {
  const patch = await resolveFinish(input);
  await settleWithClient(query, reservationId, patch, now);
  return patch;
}

export async function noteStreaming(
  query: Queryable,
  reservationId: string,
  generationId: string | null,
  now: Date,
): Promise<void> {
  await markStreamingWithClient(query, reservationId, generationId, now);
}
