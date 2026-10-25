import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import test from "node:test";
import pg from "pg";
import { PLAN_SEED_SQL, applyTesterGrants } from "./grants.js";
import { beginHostedCall, finishHostedCall } from "./hostedCall.js";
import { SCHEMA_SQL } from "./schemaSql.js";
import type { Queryable } from "./reservationSql.js";

const NOW = new Date("2026-10-15T12:00:00.000Z");

let pool: pg.Pool | undefined;
let stopDatabase = (): void => undefined;

function localUrl(port: string): string {
  const url = `postgres://postgres:postgres@127.0.0.1:${port}/pia_test`;
  const host = new URL(url).hostname;
  if (host !== "127.0.0.1") throw new Error(`Refusing non-local database host ${host}`);
  if (process.env.DATABASE_URL && process.env.DATABASE_URL === url) {
    throw new Error("Refusing to reuse DATABASE_URL");
  }
  return url;
}

async function startDisposablePostgres(): Promise<void> {
  const name = `pia-quota-${process.pid}`;
  execFileSync(
    "docker",
    [
      "run",
      "-d",
      "--rm",
      "--name",
      name,
      "-e",
      "POSTGRES_HOST_AUTH_METHOD=trust",
      "-e",
      "POSTGRES_PASSWORD=postgres",
      "-e",
      "POSTGRES_DB=pia_test",
      "-p",
      "127.0.0.1::5432",
      "postgres:16",
    ],
    { stdio: "pipe" },
  );
  stopDatabase = () => {
    execFileSync("docker", ["rm", "-f", name], { stdio: "ignore" });
  };
  const mapping = execFileSync("docker", ["port", name, "5432"], { encoding: "utf8" }).trim();
  const port = mapping.split(":").pop();
  if (!port) throw new Error("Docker did not publish a Postgres port");
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      execFileSync("docker", ["exec", name, "pg_isready", "-U", "postgres"], { stdio: "ignore" });
      break;
    } catch (error) {
      if (attempt === 39) throw error;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  pool = new pg.Pool({ connectionString: localUrl(port), max: 8 });
  const client = await pool.connect();
  try {
    await client.query(SCHEMA_SQL);
    await client.query(PLAN_SEED_SQL);
  } finally {
    client.release();
  }
}

function database(): pg.Pool {
  if (!pool) throw new Error("Postgres did not start");
  return pool;
}

async function withClient<T>(fn: (query: Queryable) => Promise<T>): Promise<T> {
  const client = await database().connect();
  try {
    return await fn(client);
  } finally {
    client.release();
  }
}

test.before(async () => {
  await startDisposablePostgres();
});

test.after(async () => {
  await pool?.end();
  stopDatabase();
});

test.beforeEach(async () => {
  await database().query("TRUNCATE ai_reservations, usage_periods, entitlements RESTART IDENTITY CASCADE");
});

test("foreign keys, the status check, and one active entitlement are enforced", async () => {
  await assert.rejects(
    database().query(
      `INSERT INTO entitlements (clerk_user_id, plan_code, status, payment_status, source, period_mode)
       VALUES ('user-fk', 'missing-plan', 'active', 'unpaid', 'manual', 'calendar_utc_month')`,
    ),
    /foreign key|plan_definitions/i,
  );
  await assert.rejects(
    database().query(
      `INSERT INTO entitlements (clerk_user_id, plan_code, status, payment_status, source, period_mode)
       VALUES ('user-status', 'lite', 'nope', 'unpaid', 'manual', 'calendar_utc_month')`,
    ),
    /entitlements_status_check/,
  );
  await database().query(
    `INSERT INTO entitlements (clerk_user_id, plan_code, status, payment_status, source, period_mode)
     VALUES ('user-unique', 'lite', 'active', 'unpaid', 'manual', 'calendar_utc_month')`,
  );
  await assert.rejects(
    database().query(
      `INSERT INTO entitlements (clerk_user_id, plan_code, status, payment_status, source, period_mode)
       VALUES ('user-unique', 'lite', 'active', 'unpaid', 'manual', 'calendar_utc_month')`,
    ),
    /entitlements_one_active_user/,
  );
  await database().query(
    "UPDATE entitlements SET status = 'superseded' WHERE clerk_user_id = 'user-unique'",
  );
  await database().query(
    `INSERT INTO entitlements (clerk_user_id, plan_code, status, payment_status, source, period_mode)
     VALUES ('user-unique', 'lite', 'active', 'unpaid', 'manual', 'calendar_utc_month')`,
  );
  await database().query(
    `INSERT INTO entitlements (clerk_user_id, plan_code, status, payment_status, source, period_mode)
     VALUES ('user-unique', 'lite', 'revoked', 'unpaid', 'manual', 'calendar_utc_month')`,
  );
  await database().query(
    `INSERT INTO entitlements (clerk_user_id, plan_code, status, payment_status, source, period_mode)
     VALUES ('user-unique', 'lite', 'expired', 'unpaid', 'manual', 'calendar_utc_month')`,
  );
  const count = await database().query(
    "SELECT COUNT(*)::int AS count FROM entitlements WHERE clerk_user_id = 'user-unique' AND status = 'active'",
  );
  assert.equal(count?.rows[0]?.count, 1);
});

test("reserve and settle persist, and a duplicate key does not insert a second row", async () => {
  await database().query(
    `INSERT INTO entitlements (clerk_user_id, plan_code, status, payment_status, source, period_mode)
     VALUES ('user-reserve', 'lite', 'active', 'unpaid', 'manual', 'calendar_utc_month')`,
  );
  const first = await withClient((query) =>
    beginHostedCall(
      {
        userId: "user-reserve",
        workflowId: "summarize",
        operation: "analysis",
        idempotencyKey: "pg-key-1111",
        hold: 100,
        inputCharge: 20,
        now: NOW,
      },
      query,
    ),
  );
  assert.equal(first.ok, true);
  if (!first.ok) return;
  await withClient((query) =>
    finishHostedCall(
      query,
      first.reservationId,
      {
        outcome: "completed",
        hold: 100,
        consumesSlot: true,
        inputCharge: 20,
        outputBytes: 8,
        usage: {
          promptTokens: 11,
          completionTokens: 7,
          cachedTokens: 3,
          reasoningTokens: 1,
          cost: 0.01,
          model: "test",
          providerName: "test",
        },
        generationId: "gen-pg",
        lookup: async () => null,
      },
      NOW,
    ),
  );
  const settled = await database().query(
    "SELECT tokens_settled, slots_used FROM usage_periods",
  );
  assert.equal(settled?.rows[0]?.tokens_settled, 18);
  assert.equal(settled?.rows[0]?.slots_used, 1);

  const [again, duplicate] = await Promise.all([
    withClient((query) =>
      beginHostedCall(
        {
          userId: "user-reserve",
          workflowId: "summarize",
          operation: "analysis",
          idempotencyKey: "pg-dup-key",
          hold: 10,
          inputCharge: 4,
          now: NOW,
        },
        query,
      ),
    ),
    withClient((query) =>
      beginHostedCall(
        {
          userId: "user-reserve",
          workflowId: "summarize",
          operation: "analysis",
          idempotencyKey: "pg-dup-key",
          hold: 10,
          inputCharge: 4,
          now: NOW,
        },
        query,
      ),
    ),
  ]);
  const oks = [again, duplicate].filter((result) => result.ok).length;
  const conflicts = [again, duplicate].filter((result) => !result.ok && result.status === 409).length;
  assert.equal(oks, 1);
  assert.equal(conflicts, 1);
  const rows = await database().query(
    "SELECT COUNT(*)::int AS count FROM ai_reservations WHERE idempotency_key = 'pg-dup-key'",
  );
  assert.equal(rows?.rows[0]?.count, 1);
});

test("concurrent reservations stop at 12 slots", async () => {
  await database().query(
    `INSERT INTO entitlements (clerk_user_id, plan_code, status, payment_status, source, period_mode)
     VALUES ('user-race', 'lite', 'active', 'unpaid', 'manual', 'calendar_utc_month')`,
  );
  const results = await Promise.all(
    Array.from({ length: 20 }, (_unused, index) =>
      withClient((query) =>
        beginHostedCall(
          {
            userId: "user-race",
            workflowId: "summarize",
            operation: "analysis",
            idempotencyKey: `race-${index}-key`,
            hold: 10,
            inputCharge: 4,
            now: NOW,
          },
          query,
        ),
      ),
    ),
  );
  assert.equal(results.filter((result) => result.ok).length, 12);
  const count = await database().query(
    "SELECT COUNT(*)::int AS count FROM ai_reservations WHERE consumes_slot = true",
  );
  assert.equal(count?.rows[0]?.count, 12);
});

test("apply twice keeps the grant and does not replace a non-Lite entitlement", async () => {
  const client = await database().connect();
  try {
    await client.query("BEGIN");
    const first = await applyTesterGrants(client, ["user-grant"]);
    await client.query("COMMIT");
    assert.deepEqual(first.inserted, ["user-grant"]);

    const created = await database().query(
      "SELECT id FROM entitlements WHERE clerk_user_id = 'user-grant' AND status = 'active'",
    );
    const entitlementId = created?.rows[0]?.id;
    await database().query(
      `INSERT INTO usage_periods (entitlement_id, period_start, period_end, slots_used, tokens_settled)
       VALUES ($1, $2, $3, 3, 50)`,
      [entitlementId, new Date("2026-10-01T00:00:00.000Z"), new Date("2026-11-01T00:00:00.000Z")],
    );

    await client.query("BEGIN");
    const second = await applyTesterGrants(client, ["user-grant"]);
    await client.query("COMMIT");
    assert.deepEqual(second.skippedLite, ["user-grant"]);
    assert.deepEqual(second.inserted, []);
    const period = await database().query("SELECT slots_used, tokens_settled FROM usage_periods");
    assert.equal(period?.rows[0]?.slots_used, 3);
    assert.equal(period?.rows[0]?.tokens_settled, 50);
    const still = await database().query(
      "SELECT id FROM entitlements WHERE clerk_user_id = 'user-grant' AND status = 'active'",
    );
    assert.equal(still?.rows[0]?.id, entitlementId);

    await database().query(
      `INSERT INTO entitlements (clerk_user_id, plan_code, status, payment_status, source, period_mode)
       VALUES ('user-pro', 'pro', 'active', 'unpaid', 'manual', 'calendar_utc_month')`,
    );
    await client.query("BEGIN");
    const kept = await applyTesterGrants(client, ["user-pro"]);
    await client.query("COMMIT");
    assert.deepEqual(kept.skippedOther, [{ userId: "user-pro", planCode: "pro" }]);
    const pro = await database().query(
      "SELECT plan_code, status FROM entitlements WHERE clerk_user_id = 'user-pro'",
    );
    assert.equal(pro?.rows.length, 1);
    assert.equal(pro?.rows[0]?.plan_code, "pro");
    assert.equal(pro?.rows[0]?.status, "active");
  } finally {
    client.release();
  }
});
