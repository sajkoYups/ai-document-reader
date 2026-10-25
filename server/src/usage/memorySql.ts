import { PLAN_CATALOG } from "./plans.js";
import { SQL } from "./reservationSql.js";

interface EntitlementRow {
  id: string;
  clerk_user_id: string;
  plan_code: string;
  status: string;
  payment_status: string;
  period_mode: string;
  period_anchor: Date | null;
  period_end: Date | null;
  expires_at: Date | null;
  created_at: Date;
}

interface PeriodRow {
  id: string;
  entitlement_id: string;
  period_start: string;
  period_end: string;
  slots_used: number;
  tokens_settled: number;
}

interface ReservationRow {
  id: string;
  period_id: string;
  entitlement_id: string;
  period_start: string;
  idempotency_key: string;
  workflow_id: string | null;
  operation: string;
  status: string;
  reserved_tokens: number;
  settled_prompt_tokens: number;
  settled_completion_tokens: number;
  cached_tokens: number | null;
  reasoning_tokens: number | null;
  provider_cost: number | null;
  model: string | null;
  provider_name: string | null;
  generation_id: string | null;
  consumes_slot: boolean;
  slot_counted: boolean;
  over_reservation: boolean;
  unreconciled: boolean;
  created_at: Date;
}

interface PlanRow {
  code: string;
  analysis_slot_limit: number | null;
  hosted_token_limit: number | null;
}

interface Snapshot {
  entitlements: EntitlementRow[];
  periods: PeriodRow[];
  reservations: ReservationRow[];
  plans: PlanRow[];
}

function stamp(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return new Date(value).toISOString();
  return "";
}

function clone(snapshot: Snapshot): Snapshot {
  return structuredClone(snapshot);
}

export class MemorySql {
  readonly queries: string[] = [];
  private state: Snapshot = {
    entitlements: [],
    periods: [],
    reservations: [],
    plans: Object.entries(PLAN_CATALOG).map(([code, allowance]) => ({
      code,
      analysis_slot_limit: allowance.slots,
      hosted_token_limit: allowance.tokens,
    })),
  };
  private tx: Snapshot | null = null;
  private locked = false;
  private waiters: Array<() => void> = [];
  private periodSequence = 0;

  addEntitlement(row: Omit<EntitlementRow, "created_at"> & { created_at?: Date }): void {
    this.state.entitlements.push({
      created_at: row.created_at ?? new Date(),
      ...row,
    });
  }

  periodFor(entitlementId: string): PeriodRow | undefined {
    return this.state.periods.find((row) => row.entitlement_id === entitlementId);
  }

  setPlan(code: string, slots: number | null, tokens: number | null): void {
    const plan = this.state.plans.find((row) => row.code === code);
    if (plan) {
      plan.analysis_slot_limit = slots;
      plan.hosted_token_limit = tokens;
      return;
    }
    this.state.plans.push({ code, analysis_slot_limit: slots, hosted_token_limit: tokens });
  }

  clearPlans(): void {
    this.state.plans = [];
  }

  reservations(): ReservationRow[] {
    return this.state.reservations;
  }

  private async acquire(): Promise<void> {
    if (!this.locked) {
      this.locked = true;
      return;
    }
    await new Promise<void>((resolve) => {
      this.waiters.push(resolve);
    });
  }

  private release(): void {
    const next = this.waiters.shift();
    if (next) next();
    else this.locked = false;
  }

  private target(): Snapshot {
    if (!this.tx) throw new Error("query outside a transaction");
    return this.tx;
  }

  async query(
    text: string,
    params: unknown[] = [],
  ): Promise<{ rows: Array<Record<string, unknown>> }> {
    this.queries.push(text);
    if (text === SQL.begin) {
      await this.acquire();
      this.tx = clone(this.state);
      return { rows: [] };
    }
    if (text === SQL.commit) {
      if (this.tx) this.state = this.tx;
      this.tx = null;
      this.release();
      return { rows: [] };
    }
    if (text === SQL.rollback) {
      this.tx = null;
      this.release();
      return { rows: [] };
    }

    const db = this.target();
    if (text === SQL.lockEntitlement) {
      const userId = params[0];
      const rows = db.entitlements
        .filter((row) => row.clerk_user_id === userId && row.status === "active")
        .sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
      return { rows: rows.slice(0, 1) as unknown as Array<Record<string, unknown>> };
    }
    if (text === SQL.upsertPeriod) {
      const entitlementId = String(params[0]);
      const periodStart = stamp(params[1]);
      const periodEnd = stamp(params[2]);
      let period = db.periods.find(
        (row) => row.entitlement_id === entitlementId && row.period_start === periodStart,
      );
      if (!period) {
        this.periodSequence += 1;
        period = {
          id: `period-${this.periodSequence}`,
          entitlement_id: entitlementId,
          period_start: periodStart,
          period_end: periodEnd,
          slots_used: 0,
          tokens_settled: 0,
        };
        db.periods.push(period);
      } else {
        period.period_end = periodEnd;
      }
      return { rows: [period as unknown as Record<string, unknown>] };
    }
    if (text === SQL.loadReservations) {
      const periodId = String(params[0]);
      const key = String(params[1]);
      const rows = db.reservations.filter(
        (row) =>
          row.period_id === periodId &&
          (row.status === "reserved" ||
            row.status === "submitted" ||
            row.status === "streaming" ||
            row.idempotency_key === key),
      );
      return { rows: rows as unknown as Array<Record<string, unknown>> };
    }
    if (text === SQL.loadPlan) {
      const plan = db.plans.find((row) => row.code === params[0]);
      return { rows: plan ? [plan as unknown as Record<string, unknown>] : [] };
    }
    if (text === SQL.loadParent) {
      const entitlementId = String(params[0]);
      const key = String(params[1]);
      const rows = db.reservations
        .filter((row) => row.entitlement_id === entitlementId && row.idempotency_key === key)
        .sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
      return { rows: rows.slice(0, 1) as unknown as Array<Record<string, unknown>> };
    }
    if (text === SQL.insertReservation) {
      db.reservations.push({
        id: String(params[0]),
        period_id: String(params[1]),
        entitlement_id: String(params[2]),
        period_start: stamp(params[3]),
        idempotency_key: String(params[4]),
        workflow_id: params[5] == null ? null : String(params[5]),
        operation: String(params[6]),
        status: "reserved",
        reserved_tokens: Number(params[7]),
        consumes_slot: params[8] === true,
        created_at: params[9] instanceof Date ? params[9] : new Date(String(params[9])),
        settled_prompt_tokens: 0,
        settled_completion_tokens: 0,
        cached_tokens: null,
        reasoning_tokens: null,
        provider_cost: null,
        model: null,
        provider_name: null,
        generation_id: null,
        slot_counted: false,
        over_reservation: false,
        unreconciled: false,
      });
      return { rows: [] };
    }
    if (text === SQL.lockReservation) {
      const row = db.reservations.find((item) => item.id === params[0]);
      return { rows: row ? [row as unknown as Record<string, unknown>] : [] };
    }
    if (text === SQL.lockPeriod) {
      const row = db.periods.find((item) => item.id === params[0]);
      return { rows: row ? [row as unknown as Record<string, unknown>] : [] };
    }
    if (text === SQL.updateReservation) {
      const row = db.reservations.find((item) => item.id === params[0]);
      if (row) {
        row.status = String(params[1]);
        row.settled_prompt_tokens = Number(params[2]);
        row.settled_completion_tokens = Number(params[3]);
        row.cached_tokens = params[4] == null ? null : Number(params[4]);
        row.reasoning_tokens = params[5] == null ? null : Number(params[5]);
        row.provider_cost = params[6] == null ? null : Number(params[6]);
        row.model = params[7] == null ? null : String(params[7]);
        row.provider_name = params[8] == null ? null : String(params[8]);
        row.generation_id = params[9] == null ? null : String(params[9]);
        row.over_reservation = params[10] === true;
        row.unreconciled = params[11] === true;
        row.slot_counted = params[12] === true;
      }
      return { rows: [] };
    }
    if (text === SQL.updatePeriod) {
      const row = db.periods.find((item) => item.id === params[0]);
      if (row) {
        row.slots_used = Number(params[1]);
        row.tokens_settled = Number(params[2]);
      }
      return { rows: [] };
    }
    if (text === SQL.markSubmitted) {
      const row = db.reservations.find((item) => item.id === params[0]);
      if (!row || row.status !== "reserved") return { rows: [] };
      row.status = "submitted";
      return { rows: [{ id: row.id }] };
    }
    if (text === SQL.markStreaming) {
      const row = db.reservations.find((item) => item.id === params[0]);
      if (row && (row.status === "reserved" || row.status === "submitted")) {
        row.status = "streaming";
        if (typeof params[1] === "string") row.generation_id = params[1];
      }
      return { rows: [] };
    }
    if (text === SQL.adjustReservation) {
      const row = db.reservations.find((item) => item.id === params[0]);
      if (row) {
        row.settled_prompt_tokens = Number(params[1]);
        row.settled_completion_tokens = Number(params[2]);
        row.slot_counted = params[3] === true;
        row.over_reservation = params[4] === true;
        row.unreconciled = false;
        row.status = String(params[5]);
      }
      return { rows: [] };
    }
    throw new Error(`Unexpected SQL: ${text}`);
  }
}
