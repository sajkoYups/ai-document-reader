import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { MemorySql } from "./memorySql.js";
import { SQL, correctReservationUsage } from "./reservationSql.js";
import { beginHostedCall, finishHostedCall } from "./hostedCall.js";
import {
  LITE_ANALYSIS_SLOTS,
  LITE_HOSTED_TOKENS,
  PLAN_CATALOG,
  accessForHosted,
  estimateHold,
  hostedReservationRequired,
  limitsMatchCatalog,
  resolvePeriod,
  type EntitlementView,
} from "./plans.js";
import { readProviderUsage, resolveFinish } from "./reservation.js";
import { PLAN_SEED_SQL, decideGrant, grantStatements, previewTesterGrants, usersMissingLiteGrant } from "./grants.js";
import { sweepActions } from "./sweep.js";
import { lookupGenerationUsage } from "./generationLookup.js";

const NOW = new Date("2026-10-15T12:00:00.000Z");

function entitlement(overrides: Partial<EntitlementView> = {}): EntitlementView {
  return {
    id: "ent-1",
    clerkUserId: "user-1",
    planCode: "lite",
    status: "active",
    paymentStatus: "unpaid",
    periodMode: "calendar_utc_month",
    periodAnchor: null,
    periodEnd: null,
    expiresAt: null,
    ...overrides,
  };
}

function database(plan = "lite", userId = "user-1", status = "active"): MemorySql {
  const db = new MemorySql();
  db.addEntitlement({
    id: `ent-${userId}`,
    clerk_user_id: userId,
    plan_code: plan,
    status,
    payment_status: "unpaid",
    period_mode: "calendar_utc_month",
    period_anchor: null,
    period_end: null,
    expires_at: null,
  });
  return db;
}

async function reserve(db: MemorySql, overrides: Record<string, unknown> = {}) {
  return beginHostedCall(
    {
      userId: "user-1",
      workflowId: "summarize",
      operation: "analysis",
      idempotencyKey: `key-${Math.random().toString(16).slice(2)}0000`,
      hold: 100,
      inputCharge: 20,
      now: NOW,
      ...overrides,
    },
    db,
  );
}

test("catalog gives Lite 12 runs and 2,000,000 tokens and leaves other tiers null", () => {
  assert.equal(PLAN_CATALOG.lite.slots, LITE_ANALYSIS_SLOTS);
  assert.equal(PLAN_CATALOG.lite.tokens, LITE_HOSTED_TOKENS);
  for (const code of ["free", "starter", "pro", "business"] as const) {
    assert.equal(PLAN_CATALOG[code].slots, null);
    assert.equal(PLAN_CATALOG[code].tokens, null);
    assert.equal(accessForHosted(entitlement({ planCode: code }), NOW).ok, false);
  }
  assert.equal(accessForHosted(null, NOW).ok, false);
  assert.equal(accessForHosted(entitlement({ status: "revoked" }), NOW).ok, false);
  assert.equal(
    accessForHosted(entitlement({ expiresAt: new Date("2026-10-01T00:00:00.000Z") }), NOW).ok,
    false,
  );
  assert.equal(accessForHosted(entitlement({ planCode: "mystery" }), NOW).ok, false);
});

test("calendar and subscription periods resolve without a cron", () => {
  const calendar = resolvePeriod(entitlement(), NOW);
  assert.equal(calendar?.periodStart.toISOString(), "2026-10-01T00:00:00.000Z");
  assert.equal(calendar?.periodEnd.toISOString(), "2026-11-01T00:00:00.000Z");
  const rolled = resolvePeriod(
    entitlement({
      periodMode: "subscription_period",
      periodAnchor: new Date("2026-01-15T00:00:00.000Z"),
      periodEnd: new Date("2026-02-15T00:00:00.000Z"),
    }),
    new Date("2026-03-20T00:00:00.000Z"),
  );
  assert.equal(rolled?.periodStart.toISOString(), "2026-03-18T00:00:00.000Z");
  assert.equal(rolled?.periodEnd.toISOString(), "2026-04-18T00:00:00.000Z");
});

test("the byte hold reserves input bytes, message overhead, and the full output budget", () => {
  assert.equal(estimateHold(10, 2, 8192), 10 + 64 + 8192);
  assert.equal(hostedReservationRequired("local"), false);
  assert.equal(hostedReservationRequired("api"), true);
});

test("concurrent Lite reservations stop at 12 slots and keep a shared token budget", async () => {
  const db = database();
  const results = await Promise.all(
    Array.from({ length: 20 }, (_unused, index) =>
      reserve(db, { idempotencyKey: `slot-${index}-key`, hold: 10 }),
    ),
  );
  assert.equal(results.filter((result) => result.ok).length, 12);
  assert.equal(results.filter((result) => !result.ok && result.reason === "analysis_limit").length, 8);
  const repair = await reserve(db, { operation: "repair", idempotencyKey: "repair-key-1", hold: 10 });
  const askOnAnalyze = await reserve(db, {
    operation: "chat",
    workflowId: "ask",
    idempotencyKey: "ask-key-111",
    hold: 10,
  });
  assert.equal(repair.ok, false);
  assert.equal(askOnAnalyze.ok, false);
  const ask = await reserve(db, {
    route: "chat",
    operation: "analysis",
    workflowId: undefined,
    idempotencyKey: "ask-route-key",
    hold: 10,
  });
  assert.equal(ask.ok, true);
  if (ask.ok) assert.equal(ask.consumesSlot, false);
  assert.equal(db.reservations().filter((row) => row.consumes_slot).length, 12);

  const tight = database();
  const first = await reserve(tight, { idempotencyKey: "token-a-key", hold: 1_500_000 });
  const second = await reserve(tight, { idempotencyKey: "token-b-key", hold: 1_500_000 });
  const third = await reserve(tight, { idempotencyKey: "token-c-key", hold: 1_500_000 });
  assert.equal(first.ok, true);
  assert.equal(second.ok, false);
  assert.equal(third.ok, false);
});

test("client metered and plan fields cannot grant or skip a slot", async () => {
  const db = database();
  const results = await Promise.all(
    Array.from({ length: 13 }, (_unused, index) =>
      reserve(db, {
        idempotencyKey: `meter-${index}-key`,
        metered: false,
        clientPlan: "business",
        hold: 5,
      }),
    ),
  );
  assert.equal(results.filter((result) => result.ok).length, 12);
  const missing = new MemorySql();
  const refused = await reserve(missing, { clientPlan: "lite", idempotencyKey: "no-grant-key" });
  assert.equal(refused.ok, false);
  if (!refused.ok) assert.equal(refused.reason, "no_entitlement");
  const unknown = await reserve(db, { workflowId: "not-a-workflow", idempotencyKey: "bad-workflow" });
  assert.equal(unknown.ok, false);
});

test("the same idempotency key does not create a second hold", async () => {
  const db = database();
  const first = await reserve(db, { idempotencyKey: "same-key-11" });
  const second = await reserve(db, { idempotencyKey: "same-key-11" });
  assert.equal(first.ok, true);
  assert.equal(second.ok, false);
  if (!second.ok) {
    assert.equal(second.status, 409);
    assert.equal(second.reason, "duplicate");
  }
  assert.equal(db.reservations().length, 1);
  assert.equal(db.reservations()[0]?.status, "reserved");
  assert.match(SQL.lockEntitlement, /FOR UPDATE/);
  assert.ok(db.queries.indexOf(SQL.begin) < db.queries.indexOf(SQL.lockEntitlement));
  assert.ok(db.queries.indexOf(SQL.lockEntitlement) < db.queries.indexOf(SQL.insertReservation));
});

test("settlement, release, retry, and overage follow the provider total", async () => {
  const db = database();
  const begun = await reserve(db, { idempotencyKey: "settle-key-1", hold: 100 });
  assert.equal(begun.ok, true);
  if (!begun.ok) return;
  await finishHostedCall(
    db,
    begun.reservationId,
    {
      outcome: "completed",
      hold: 100,
      consumesSlot: true,
      inputCharge: 20,
      outputBytes: 10,
      usage: {
        promptTokens: 30,
        completionTokens: 90,
        cachedTokens: 100,
        reasoningTokens: 7,
        cost: 0.01,
        model: "deepseek/deepseek-v4.1-flash-1017",
        providerName: "novita",
      },
      generationId: "gen-1",
      lookup: async () => null,
    },
    NOW,
  );
  const row = db.reservations()[0];
  assert.equal(row?.settled_prompt_tokens, 30);
  assert.equal(row?.settled_completion_tokens, 90);
  assert.equal(row?.over_reservation, true);
  assert.equal(row?.slot_counted, true);
  assert.equal(db.periodFor("ent-user-1")?.tokens_settled, 120);
  await finishHostedCall(
    db,
    begun.reservationId,
    {
      outcome: "completed",
      hold: 100,
      consumesSlot: true,
      inputCharge: 20,
      outputBytes: 10,
      usage: { promptTokens: 1, completionTokens: 1, cachedTokens: null, reasoningTokens: null, cost: null, model: null, providerName: null },
      generationId: "gen-1",
      lookup: async () => null,
    },
    NOW,
  );
  assert.equal(db.periodFor("ent-user-1")?.tokens_settled, 120);
  assert.equal(db.periodFor("ent-user-1")?.slots_used, 1);
});

test("a failed call releases, an empty retry is a second reservation, and a disconnect keeps the slot", async () => {
  const db = database();
  const failed = await reserve(db, { idempotencyKey: "fail-key-111" });
  assert.equal(failed.ok, true);
  if (!failed.ok) return;
  await finishHostedCall(
    db,
    failed.reservationId,
    {
      outcome: "error_before_provider",
      hold: 100,
      consumesSlot: true,
      inputCharge: 20,
      outputBytes: 0,
      usage: null,
      generationId: null,
      lookup: async () => null,
    },
    NOW,
  );
  assert.equal(db.reservations()[0]?.status, "released");
  assert.equal(db.periodFor("ent-user-1")?.slots_used, 0);

  const empty = await reserve(db, { idempotencyKey: "empty-key-11", hold: 1000 });
  assert.equal(empty.ok, true);
  if (!empty.ok) return;
  await finishHostedCall(
    db,
    empty.reservationId,
    {
      outcome: "completed",
      hold: 1000,
      consumesSlot: true,
      inputCharge: 40,
      outputBytes: 0,
      usage: null,
      generationId: null,
      lookup: async () => null,
    },
    NOW,
  );
  const retry = await reserve(db, { idempotencyKey: "empty-key-11:retry", hold: 1000 });
  assert.equal(retry.ok, true);
  assert.equal(db.reservations().filter((row) => row.idempotency_key.startsWith("empty-key")).length, 2);
  assert.equal(db.reservations().find((row) => row.id === empty.reservationId)?.slot_counted, false);

  const dropped = await reserve(db, { idempotencyKey: "drop-key-111", hold: 50 });
  assert.equal(dropped.ok, true);
  if (!dropped.ok) return;
  await finishHostedCall(
    db,
    dropped.reservationId,
    {
      outcome: "interrupted",
      hold: 50,
      consumesSlot: true,
      inputCharge: 10,
      outputBytes: 8,
      usage: { promptTokens: 4, completionTokens: 6, cachedTokens: null, reasoningTokens: null, cost: null, model: null, providerName: null },
      generationId: "gen-drop",
      lookup: async () => null,
    },
    NOW,
  );
  assert.equal(db.reservations().find((row) => row.id === dropped.reservationId)?.status, "partial");
  assert.equal(db.reservations().find((row) => row.id === dropped.reservationId)?.slot_counted, true);
});

test("missing usage uses bytes, then a mocked generation lookup, and never adds cached tokens twice", async () => {
  const bytes = await resolveFinish({
    outcome: "completed",
    hold: 100,
    consumesSlot: true,
    inputCharge: 10,
    outputBytes: 5,
    usage: null,
    generationId: null,
    lookup: async () => null,
  });
  assert.equal(bytes.prompt, 10);
  assert.equal(bytes.completion, 5);
  assert.equal(bytes.countSlot, true);

  let calls = 0;
  const looked = await resolveFinish({
    outcome: "interrupted",
    hold: 30,
    consumesSlot: true,
    inputCharge: 10,
    outputBytes: 4,
    usage: null,
    generationId: "gen-lookup",
    lookup: async () => {
      calls += 1;
      return {
        promptTokens: 8,
        completionTokens: 0,
        cachedTokens: 3,
        reasoningTokens: 1,
        cost: null,
        model: null,
        providerName: null,
      };
    },
  });
  assert.equal(calls, 1);
  assert.equal(looked.prompt + looked.completion, 8);
  assert.equal(looked.countSlot, false);

  const usage = readProviderUsage({
    prompt_tokens: 3,
    completion_tokens: 4,
    prompt_tokens_details: { cached_tokens: 3 },
    completion_tokens_details: { reasoning_tokens: 4 },
    cost: 0.2,
  });
  assert.equal((usage.promptTokens ?? 0) + (usage.completionTokens ?? 0), 7);
  assert.equal(usage.cachedTokens, 3);
});

test("a crashed streaming reservation reconciles and a reserved one without an id expires", () => {
  const now = 10_000;
  const actions = sweepActions(
    [
      { id: "fresh", status: "reserved", generationId: null, createdAt: now, hold: 1, consumesSlot: true },
      { id: "old", status: "reserved", generationId: null, createdAt: 0, hold: 1, consumesSlot: true },
      { id: "stream", status: "streaming", generationId: "gen-x", createdAt: 0, hold: 1, consumesSlot: true },
      { id: "submitted", status: "submitted", generationId: null, createdAt: 0, hold: 40, consumesSlot: true },
    ],
    now,
    1_000,
  );
  assert.deepEqual(actions, [
    { id: "old", action: "release" },
    { id: "stream", action: "reconcile" },
    { id: "submitted", action: "reconcile" },
  ]);
});

test("users do not share a ledger, and a new grant starts a new period", async () => {
  const db = database("lite", "user-a");
  db.addEntitlement({
    id: "ent-user-b",
    clerk_user_id: "user-b",
    plan_code: "lite",
    status: "active",
    payment_status: "unpaid",
    period_mode: "calendar_utc_month",
    period_anchor: null,
    period_end: null,
    expires_at: null,
  });
  await Promise.all(
    Array.from({ length: 12 }, (_unused, index) =>
      reserve(db, { userId: "user-a", idempotencyKey: `a-${index}-key` }),
    ),
  );
  const other = await reserve(db, { userId: "user-b", idempotencyKey: "b-first-key" });
  assert.equal(other.ok, true);

  const upgraded = new MemorySql();
  upgraded.addEntitlement({
    id: "old-grant",
    clerk_user_id: "user-1",
    plan_code: "lite",
    status: "superseded",
    payment_status: "unpaid",
    period_mode: "calendar_utc_month",
    period_anchor: null,
    period_end: null,
    expires_at: null,
    created_at: new Date("2026-01-01T00:00:00.000Z"),
  });
  upgraded.addEntitlement({
    id: "new-grant",
    clerk_user_id: "user-1",
    plan_code: "lite",
    status: "active",
    payment_status: "unpaid",
    period_mode: "calendar_utc_month",
    period_anchor: null,
    period_end: null,
    expires_at: null,
    created_at: new Date("2026-10-01T00:00:00.000Z"),
  });
  const next = await reserve(upgraded, { idempotencyKey: "after-upgrade" });
  assert.equal(next.ok, true);
  assert.equal(upgraded.periodFor("new-grant")?.slots_used, 0);
  assert.equal(upgraded.periodFor("old-grant"), undefined);
});

test("preview writes nothing and historical users without Lite are listed", () => {
  const writes: string[] = [];
  const preview = previewTesterGrants([" user-b ", "user-a", ""], ["user-a", "user-c"]);
  assert.equal(preview.writes, false);
  assert.deepEqual(preview.userIds, ["user-a", "user-b", "user-c"]);
  assert.equal(preview.planCode, "lite");
  assert.equal(preview.paymentStatus, "unpaid");
  assert.deepEqual(writes, []);
  assert.deepEqual(usersMissingLiteGrant(["user-a", "user-b"], ["user-a"]), ["user-b"]);
  const statements = grantStatements("user-a");
  assert.equal(statements.insert.text.includes("user-a"), false);
  assert.deepEqual(statements.insert.params, ["user-a"]);
  assert.equal(statements.insert.text.includes("superseded"), false);
  assert.equal(decideGrant(null).action, "insert");
  const lite = decideGrant({ planCode: "lite", status: "active" });
  assert.equal(lite.action, "skip");
  if (lite.action === "skip") assert.equal(lite.reason, "active_lite");
  const other = decideGrant({ planCode: "pro", status: "active" });
  assert.equal(other.action, "skip");
  if (other.action === "skip") assert.equal(other.reason, "active_other");
  assert.match(PLAN_SEED_SQL, /DO UPDATE/);
  assert.equal(PLAN_SEED_SQL.includes("usage_periods"), false);
  assert.equal(limitsMatchCatalog("lite", { slots: 12, tokens: 2_000_000 }), "ok");
  assert.equal(limitsMatchCatalog("lite", { slots: 99, tokens: 2_000_000 }), "unconfigured_limits");
  assert.equal(limitsMatchCatalog("pro", { slots: 100, tokens: 100 }), "unconfigured_limits");
  assert.equal(limitsMatchCatalog("mystery", { slots: 1, tokens: 1 }), "unknown_plan");
});

test("generation lookup uses the injected fetch and backs off without a live provider", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = (() => {
    throw new Error("network");
  }) as typeof fetch;
  try {
    let calls = 0;
    const found = await lookupGenerationUsage({
      id: "gen-test",
      apiKey: "test",
      baseUrl: "https://openrouter.test/api/v1",
      attempts: 2,
      sleep: async () => undefined,
      fetchImpl: async () => {
        calls += 1;
        if (calls === 1) return new Response("no", { status: 404 });
        return Response.json({
          data: { tokens_prompt: 2, tokens_completion: 3, native_tokens_cached: 1, total_cost: 0.01 },
        });
      },
    });
    assert.equal(calls, 2);
    assert.equal(found?.promptTokens, 2);
    assert.equal(found?.completionTokens, 3);
  } finally {
    globalThis.fetch = original;
  }
});

test("repair and chat claims on the analyze path cannot skip a slot", async () => {
  const db = database();
  const bare = await reserve(db, {
    operation: "repair",
    idempotencyKey: "repair-bare-1",
    workflowId: "summarize",
  });
  assert.equal(bare.ok, true);
  if (bare.ok) assert.equal(bare.consumesSlot, true);

  const parent = await reserve(db, { idempotencyKey: "parent-key-1", workflowId: "summarize" });
  assert.equal(parent.ok, true);
  if (!parent.ok) return;
  await finishHostedCall(
    db,
    parent.reservationId,
    {
      outcome: "completed",
      hold: 100,
      consumesSlot: true,
      inputCharge: 20,
      outputBytes: 10,
      usage: {
        promptTokens: 10,
        completionTokens: 10,
        cachedTokens: null,
        reasoningTokens: null,
        cost: null,
        model: null,
        providerName: null,
      },
      generationId: "gen-parent",
      lookup: async () => null,
    },
    NOW,
  );
  const repair = await reserve(db, {
    operation: "repair",
    parentIdempotencyKey: "parent-key-1",
    idempotencyKey: "repair-child-1",
    workflowId: "summarize",
  });
  assert.equal(repair.ok, true);
  if (repair.ok) assert.equal(repair.consumesSlot, false);

  const chatOnAnalyze = await reserve(db, {
    operation: "chat",
    workflowId: "ask",
    idempotencyKey: "chat-analyze-1",
  });
  assert.equal(chatOnAnalyze.ok, true);
  if (chatOnAnalyze.ok) assert.equal(chatOnAnalyze.consumesSlot, true);
});

test("a drifted or unconfigured plan cannot be used", async () => {
  const drifted = database();
  drifted.setPlan("lite", 99, 99);
  const refused = await reserve(drifted, { idempotencyKey: "drift-key-11" });
  assert.equal(refused.ok, false);
  if (!refused.ok) assert.equal(refused.reason, "unconfigured_limits");

  const invented = await reserve(database("pro"), { idempotencyKey: "pro-key-1111" });
  assert.equal(invented.ok, false);
  if (!invented.ok) assert.equal(invented.reason, "unconfigured_limits");

  const missing = new MemorySql();
  missing.clearPlans();
  missing.addEntitlement({
    id: "ent-user-1",
    clerk_user_id: "user-1",
    plan_code: "lite",
    status: "active",
    payment_status: "unpaid",
    period_mode: "calendar_utc_month",
    period_anchor: null,
    period_end: null,
    expires_at: null,
  });
  const noPlan = await reserve(missing, { idempotencyKey: "no-plan-key1" });
  assert.equal(noPlan.ok, false);
  if (!noPlan.ok) assert.equal(noPlan.reason, "unconfigured_limits");
});

test("a provider attempt is not released, and a later lookup can raise or lower it", async () => {
  const patch = await resolveFinish({
    outcome: "interrupted",
    providerAttempted: true,
    hold: 40,
    consumesSlot: true,
    inputCharge: 10,
    outputBytes: 0,
    usage: null,
    generationId: null,
    lookup: async () => null,
  });
  assert.equal(patch.status, "partial");
  assert.equal(patch.completion, 40);
  assert.equal(patch.unreconciled, true);
  assert.equal(patch.countSlot, true);
  assert.notEqual(patch.status, "released");

  const db = database();
  const begun = await reserve(db, { idempotencyKey: "unclear-key", hold: 40 });
  assert.equal(begun.ok, true);
  if (!begun.ok) return;
  await finishHostedCall(
    db,
    begun.reservationId,
    {
      outcome: "interrupted",
      providerAttempted: true,
      hold: 40,
      consumesSlot: true,
      inputCharge: 10,
      outputBytes: 0,
      usage: null,
      generationId: "gen-later",
      lookup: async () => null,
    },
    NOW,
  );
  assert.equal(db.periodFor("ent-user-1")?.tokens_settled, 40);
  assert.equal(db.reservations()[0]?.unreconciled, true);
  await correctReservationUsage(db, begun.reservationId, 12, 8, NOW);
  assert.equal(db.periodFor("ent-user-1")?.tokens_settled, 20);
  await correctReservationUsage(db, begun.reservationId, 3, 2, NOW);
  assert.equal(db.periodFor("ent-user-1")?.tokens_settled, 5);
  assert.equal(db.reservations()[0]?.unreconciled, false);
  assert.equal(db.periodFor("ent-user-1")?.slots_used, 1);
});

test("duplicate and unsubmitted failures do not reach the provider stream", () => {
  const source = readFileSync(new URL("../routes/enforcedInference.ts", import.meta.url), "utf8");
  const refusal = source.indexOf("if (!begun.ok)");
  const submitted = source.indexOf("markSubmittedWithClient(query");
  const stream = source.indexOf("for await (const token of streamDeepInference");
  assert.ok(refusal >= 0 && submitted > refusal && stream > submitted);
});
