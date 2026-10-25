import { config } from "../config.js";
import { RESERVATION_TTL_MS } from "./plans.js";
import { classifyStaleReservation, resolveFinish, type Reservation } from "./reservation.js";
import { withDbClient } from "./db.js";
import { SQL, correctReservationUsage, settleWithClient, type Queryable } from "./reservationSql.js";
import { lookupGenerationUsage, toProviderNumbers } from "./generationLookup.js";

export interface SweepRow {
  id: string;
  status: Reservation["status"];
  generationId: string | null;
  createdAt: number;
  hold: number;
  consumesSlot: boolean;
}

export function sweepActions(
  rows: SweepRow[],
  now: number,
  ttlMs = RESERVATION_TTL_MS,
): Array<{ id: string; action: "release" | "reconcile" }> {
  const actions: Array<{ id: string; action: "release" | "reconcile" }> = [];
  for (const row of rows) {
    const action = classifyStaleReservation(
      { status: row.status, generationId: row.generationId, createdAt: row.createdAt },
      now,
      ttlMs,
    );
    if (action === "release" || action === "reconcile") {
      actions.push({ id: row.id, action });
    }
  }
  return actions;
}

const LOAD_STALE = `SELECT id, status, generation_id, created_at, reserved_tokens, consumes_slot
FROM ai_reservations
WHERE status IN ('reserved', 'submitted', 'streaming') AND created_at < $1`;

const LOAD_UNRECONCILED = `SELECT id, generation_id
FROM ai_reservations
WHERE unreconciled = true AND generation_id IS NOT NULL AND status IN ('partial', 'completed')`;

async function loadStale(query: Queryable, cutoff: Date): Promise<SweepRow[]> {
  await query.query(SQL.begin);
  try {
    const loaded = await query.query(LOAD_STALE, [cutoff]);
    await query.query(SQL.commit);
    return loaded.rows.map((row) => ({
      id: String(row.id),
      status: String(row.status) as Reservation["status"],
      generationId: typeof row.generation_id === "string" ? row.generation_id : null,
      createdAt: new Date(String(row.created_at)).getTime(),
      hold: Number(row.reserved_tokens),
      consumesSlot: row.consumes_slot === true,
    }));
  } catch (error) {
    await query.query(SQL.rollback).catch(() => undefined);
    throw error;
  }
}

export async function runHostedSweep(now = new Date()): Promise<void> {
  if (!config.hostedQuotaEnforcement) return;
  const cutoff = new Date(now.getTime() - RESERVATION_TTL_MS);
  const rows = await withDbClient((query) => loadStale(query, cutoff));
  for (const action of sweepActions(rows, now.getTime())) {
    const row = rows.find((item) => item.id === action.id);
    if (!row) continue;
    if (action.action === "release") {
      await withDbClient((query) =>
        settleWithClient(
          query,
          row.id,
          {
            status: "released",
            prompt: 0,
            completion: 0,
            cached: null,
            reasoning: null,
            cost: null,
            model: null,
            providerName: null,
            generationId: null,
            over: false,
            unreconciled: false,
            countSlot: false,
          },
          now,
        ),
      );
      continue;
    }
    const lookedUp = row.generationId
      ? await lookupGenerationUsage({
          id: row.generationId,
          apiKey: config.openrouter.apiKey,
          baseUrl: config.openrouter.baseUrl,
          fetchImpl: fetch,
        })
      : null;
    const patch = await resolveFinish({
      outcome: "interrupted",
      providerAttempted: true,
      hold: row.hold,
      consumesSlot: row.consumesSlot,
      inputCharge: row.hold,
      outputBytes: 0,
      usage: lookedUp ? toProviderNumbers(lookedUp) : null,
      generationId: row.generationId,
      lookup: async () => null,
    });
    await withDbClient((query) => settleWithClient(query, row.id, patch, now));
  }
  await correctUnreconciled(now);
}

async function correctUnreconciled(now: Date): Promise<void> {
  const rows = await withDbClient(async (query) => {
    await query.query(SQL.begin);
    try {
      const loaded = await query.query(LOAD_UNRECONCILED);
      await query.query(SQL.commit);
      return loaded.rows;
    } catch (error) {
      await query.query(SQL.rollback).catch(() => undefined);
      throw error;
    }
  });
  for (const row of rows) {
    const generationId = typeof row.generation_id === "string" ? row.generation_id : null;
    if (!generationId) continue;
    const lookedUp = await lookupGenerationUsage({
      id: generationId,
      apiKey: config.openrouter.apiKey,
      baseUrl: config.openrouter.baseUrl,
      fetchImpl: fetch,
    });
    if (!lookedUp) continue;
    const numbers = toProviderNumbers(lookedUp);
    if (numbers.promptTokens === null || numbers.completionTokens === null) continue;
    await withDbClient((query) =>
      correctReservationUsage(
        query,
        String(row.id),
        numbers.promptTokens ?? 0,
        numbers.completionTokens ?? 0,
        now,
      ),
    );
  }
}

export function startHostedSweep(): void {
  if (!config.hostedQuotaEnforcement) return;
  const timer = setInterval(() => {
    void runHostedSweep().catch((error: unknown) => {
      console.error("[quota] sweep failed", error);
    });
  }, 60_000);
  timer.unref();
}
