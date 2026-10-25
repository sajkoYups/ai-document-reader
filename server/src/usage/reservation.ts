import { randomUUID } from "node:crypto";

export type HostedOperation = "analysis" | "repair" | "refine" | "chat";
export type ReservationStatus =
  | "reserved"
  | "submitted"
  | "streaming"
  | "completed"
  | "partial"
  | "released";

export interface Reservation {
  id: string;
  idempotencyKey: string;
  workflowId: string | null;
  operation: HostedOperation;
  status: ReservationStatus;
  hold: number;
  consumesSlot: boolean;
  slotCounted: boolean;
  settledPrompt: number;
  settledCompletion: number;
  cachedTokens: number | null;
  reasoningTokens: number | null;
  cost: number | null;
  model: string | null;
  providerName: string | null;
  generationId: string | null;
  overReservation: boolean;
  unreconciled: boolean;
  createdAt: number;
}

export interface UsageAccount {
  slotsUsed: number;
  tokensSettled: number;
  reservations: Reservation[];
}

export function emptyAccount(): UsageAccount {
  return { slotsUsed: 0, tokensSettled: 0, reservations: [] };
}

function isOpenStatus(status: ReservationStatus): boolean {
  return status === "reserved" || status === "submitted" || status === "streaming";
}

export function openTokenHold(account: UsageAccount): number {
  return account.reservations
    .filter((row) => isOpenStatus(row.status))
    .reduce((sum, row) => sum + row.hold, 0);
}

export function openSlotHold(account: UsageAccount): number {
  return (
    account.slotsUsed +
    account.reservations.filter(
      (row) =>
        isOpenStatus(row.status) && row.consumesSlot,
    ).length
  );
}

export interface ReserveRequest {
  idempotencyKey: string;
  workflowId: string | null;
  operation: HostedOperation;
  hold: number;
  now: number;
  id?: string;
}

export type ReserveResult =
  | { ok: true; duplicate: boolean; reservation: Reservation; account: UsageAccount }
  | { ok: false; reason: "analysis_limit" | "token_limit"; account: UsageAccount };

export function reserve(
  account: UsageAccount,
  allowance: { slots: number; tokens: number },
  request: ReserveRequest,
): ReserveResult {
  const existing = account.reservations.find(
    (row) => row.idempotencyKey === request.idempotencyKey,
  );
  if (existing) {
    return { ok: true, duplicate: true, reservation: existing, account };
  }

  const consumesSlot = request.operation === "analysis";
  if (consumesSlot && openSlotHold(account) + 1 > allowance.slots) {
    return { ok: false, reason: "analysis_limit", account };
  }
  if (openTokenHold(account) + account.tokensSettled + request.hold > allowance.tokens) {
    return { ok: false, reason: "token_limit", account };
  }

  const reservation: Reservation = {
    id: request.id ?? randomUUID(),
    idempotencyKey: request.idempotencyKey,
    workflowId: request.workflowId,
    operation: request.operation,
    status: "reserved",
    hold: request.hold,
    consumesSlot,
    slotCounted: false,
    settledPrompt: 0,
    settledCompletion: 0,
    cachedTokens: null,
    reasoningTokens: null,
    cost: null,
    model: null,
    providerName: null,
    generationId: null,
    overReservation: false,
    unreconciled: false,
    createdAt: request.now,
  };
  return {
    ok: true,
    duplicate: false,
    reservation,
    account: {
      ...account,
      reservations: [...account.reservations, reservation],
    },
  };
}

export interface SettlementPatch {
  status: "completed" | "partial" | "released";
  prompt: number;
  completion: number;
  cached: number | null;
  reasoning: number | null;
  cost: number | null;
  model: string | null;
  providerName: string | null;
  generationId: string | null;
  over: boolean;
  unreconciled: boolean;
  countSlot: boolean;
}

function terminal(status: ReservationStatus): boolean {
  return status === "completed" || status === "partial" || status === "released";
}

export function applySettlement(
  account: UsageAccount,
  reservationId: string,
  patch: SettlementPatch,
): UsageAccount {
  const current = account.reservations.find((row) => row.id === reservationId);
  if (!current || terminal(current.status)) return account;

  const countSlot = patch.countSlot && current.consumesSlot && !current.slotCounted;
  const settledTotal = Math.max(0, patch.prompt + patch.completion);
  const next: Reservation = {
    ...current,
    status: patch.status,
    settledPrompt: Math.max(0, patch.prompt),
    settledCompletion: Math.max(0, patch.completion),
    cachedTokens: patch.cached,
    reasoningTokens: patch.reasoning,
    cost: patch.cost,
    model: patch.model,
    providerName: patch.providerName,
    generationId: patch.generationId ?? current.generationId,
    overReservation: patch.over,
    unreconciled: patch.unreconciled,
    slotCounted: current.slotCounted || countSlot,
  };
  return {
    slotsUsed: account.slotsUsed + (countSlot ? 1 : 0),
    tokensSettled: account.tokensSettled + (patch.status === "released" ? 0 : settledTotal),
    reservations: account.reservations.map((row) => (row.id === reservationId ? next : row)),
  };
}

export function adjustSettlement(
  account: UsageAccount,
  reservationId: string,
  nextPrompt: number,
  nextCompletion: number,
): UsageAccount {
  const current = account.reservations.find((row) => row.id === reservationId);
  if (!current) return account;
  const previous = current.settledPrompt + current.settledCompletion;
  const prompt = Math.max(0, nextPrompt);
  const completion = Math.max(0, nextCompletion);
  const delta = prompt + completion - previous;
  let slotsUsed = account.slotsUsed;
  let slotCounted = current.slotCounted;
  if (current.consumesSlot && completion > 0 && !slotCounted) {
    slotsUsed += 1;
    slotCounted = true;
  } else if (current.consumesSlot && completion === 0 && slotCounted) {
    slotsUsed = Math.max(0, slotsUsed - 1);
    slotCounted = false;
  }
  const next: Reservation = {
    ...current,
    settledPrompt: prompt,
    settledCompletion: completion,
    slotCounted,
    overReservation: prompt + completion > current.hold,
    unreconciled: false,
    status: current.status === "released" ? "partial" : current.status,
  };
  return {
    slotsUsed,
    tokensSettled: Math.max(0, account.tokensSettled + delta),
    reservations: account.reservations.map((row) => (row.id === reservationId ? next : row)),
  };
}

export function trustedOperation(input: {
  route: "analyze" | "chat";
  requested: HostedOperation | null;
  workflowId: string | null;
  parent: { workflowId: string | null; operation: string; status: string } | null;
}): HostedOperation {
  if (input.route === "chat") return "chat";
  const followUp = input.requested === "repair" || input.requested === "refine";
  const parentSettled =
    input.parent !== null &&
    input.parent.operation === "analysis" &&
    (input.parent.status === "completed" || input.parent.status === "partial") &&
    input.workflowId !== null &&
    input.parent.workflowId === input.workflowId;
  if (followUp && parentSettled && (input.requested === "repair" || input.requested === "refine")) {
    return input.requested;
  }
  return "analysis";
}

export function markStreaming(
  account: UsageAccount,
  reservationId: string,
  generationId: string | null,
): UsageAccount {
  return {
    ...account,
    reservations: account.reservations.map((row) => {
      if (row.id !== reservationId || (row.status !== "reserved" && row.status !== "submitted")) {
        return row;
      }
      return { ...row, status: "streaming", generationId: generationId ?? row.generationId };
    }),
  };
}

export type StaleAction = "keep" | "release" | "reconcile";

export function classifyStaleReservation(
  row: Pick<Reservation, "status" | "generationId" | "createdAt">,
  now: number,
  ttlMs: number,
): StaleAction {
  if (now - row.createdAt < ttlMs) return "keep";
  if (row.status === "reserved" && !row.generationId) return "release";
  if (
    row.status === "submitted" ||
    row.status === "streaming" ||
    (row.status === "reserved" && row.generationId)
  ) {
    return "reconcile";
  }
  return "keep";
}

export interface ProviderNumbers {
  promptTokens: number | null;
  completionTokens: number | null;
  cachedTokens: number | null;
  reasoningTokens: number | null;
  cost: number | null;
  model: string | null;
  providerName: string | null;
}

export interface FinishInput {
  outcome: "error_before_provider" | "completed" | "interrupted";
  /** True once this process has handed the reservation to the provider. */
  providerAttempted?: boolean;
  hold: number;
  consumesSlot: boolean;
  inputCharge: number;
  outputBytes: number;
  usage: ProviderNumbers | null;
  generationId: string | null;
  lookup: () => Promise<ProviderNumbers | null>;
}

function numbersFrom(usage: ProviderNumbers | null): { prompt: number; completion: number } | null {
  if (!usage) return null;
  if (usage.promptTokens === null || usage.completionTokens === null) return null;
  return { prompt: usage.promptTokens, completion: usage.completionTokens };
}

function byteSplit(hold: number, inputCharge: number, outputBytes: number): {
  prompt: number;
  completion: number;
} {
  const total = Math.min(hold, Math.max(0, inputCharge) + Math.max(0, outputBytes));
  const prompt = Math.min(total, Math.max(0, inputCharge));
  return { prompt, completion: total - prompt };
}

export async function resolveFinish(input: FinishInput): Promise<SettlementPatch> {
  const base = {
    cached: input.usage?.cachedTokens ?? null,
    reasoning: input.usage?.reasoningTokens ?? null,
    cost: input.usage?.cost ?? null,
    model: input.usage?.model ?? null,
    providerName: input.usage?.providerName ?? null,
    generationId: input.generationId,
  };

  if (input.outcome === "error_before_provider" && !input.providerAttempted) {
    return {
      ...base,
      status: "released",
      prompt: 0,
      completion: 0,
      over: false,
      unreconciled: false,
      countSlot: false,
    };
  }

  const direct = numbersFrom(input.usage);
  const lookedUp = direct ? null : input.generationId ? await input.lookup() : null;
  const reconciled = direct ?? numbersFrom(lookedUp);
  if (reconciled) {
    const total = reconciled.prompt + reconciled.completion;
    return {
      ...base,
      cached: input.usage?.cachedTokens ?? lookedUp?.cachedTokens ?? null,
      reasoning: input.usage?.reasoningTokens ?? lookedUp?.reasoningTokens ?? null,
      cost: input.usage?.cost ?? lookedUp?.cost ?? null,
      model: input.usage?.model ?? lookedUp?.model ?? null,
      providerName: input.usage?.providerName ?? lookedUp?.providerName ?? null,
      status: input.outcome === "interrupted" ? "partial" : "completed",
      prompt: reconciled.prompt,
      completion: reconciled.completion,
      over: total > input.hold,
      unreconciled: false,
      countSlot: input.consumesSlot && reconciled.completion > 0,
    };
  }

  if (
    input.outcome === "interrupted" ||
    (input.outcome === "error_before_provider" && input.providerAttempted)
  ) {
    return {
      ...base,
      status: "partial",
      prompt: 0,
      completion: input.hold,
      over: false,
      unreconciled: true,
      countSlot: input.consumesSlot,
    };
  }

  const split = byteSplit(input.hold, input.inputCharge, input.outputBytes);
  return {
    ...base,
    status: "completed",
    prompt: split.prompt,
    completion: split.completion,
    over: false,
    unreconciled: false,
    countSlot: input.consumesSlot && split.completion > 0,
  };
}

export function readProviderUsage(usage: Record<string, unknown> | null | undefined): ProviderNumbers {
  const details = (key: string): Record<string, unknown> | null => {
    const value = usage?.[key];
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
    return null;
  };
  const num = (value: unknown): number | null =>
    typeof value === "number" && Number.isFinite(value) ? value : null;
  const promptDetails = details("prompt_tokens_details");
  const completionDetails = details("completion_tokens_details");
  return {
    promptTokens: num(usage?.prompt_tokens),
    completionTokens: num(usage?.completion_tokens),
    cachedTokens: num(promptDetails?.cached_tokens) ?? num(usage?.cached_tokens),
    reasoningTokens:
      num(completionDetails?.reasoning_tokens) ?? num(usage?.reasoning_tokens),
    cost: num(usage?.cost),
    model: typeof usage?.model === "string" ? usage.model : null,
    providerName: typeof usage?.provider_name === "string" ? usage.provider_name : null,
  };
}
