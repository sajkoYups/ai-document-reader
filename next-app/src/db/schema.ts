import { sql } from "drizzle-orm";
import { boolean, check, index, integer, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

export const waitlist = pgTable("waitlist", {
  id: uuid("id").primaryKey().defaultRandom(),
  emailEnc: text("email_enc").notNull(),
  firstNameEnc: text("first_name_enc").notNull(),
  lastNameEnc: text("last_name_enc").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const tokenUsage = pgTable("token_usage", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  estimatedTokens: integer("estimated_tokens").notNull(),
  callType: text("call_type").notNull(), // 'analyze' | 'analyze_assist' | 'chat'
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const planDefinitions = pgTable("plan_definitions", {
  code: text("code").primaryKey(),
  analysisSlotLimit: integer("analysis_slot_limit"),
  hostedTokenLimit: integer("hosted_token_limit"),
});

export const entitlements = pgTable(
  "entitlements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clerkUserId: text("clerk_user_id").notNull(),
    planCode: text("plan_code").notNull().references(() => planDefinitions.code),
    status: text("status").notNull(),
    paymentStatus: text("payment_status").notNull(),
    source: text("source").notNull(),
    periodMode: text("period_mode").notNull(),
    periodAnchor: timestamp("period_anchor", { withTimezone: true }),
    periodEnd: timestamp("period_end", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("entitlements_one_active_user").on(table.clerkUserId).where(sql`${table.status} = 'active'`),
    check(
      "entitlements_status_check",
      sql`${table.status} in ('active', 'superseded', 'revoked', 'expired')`,
    ),
  ],
);

export const usagePeriods = pgTable(
  "usage_periods",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    entitlementId: uuid("entitlement_id").notNull().references(() => entitlements.id),
    periodStart: timestamp("period_start", { withTimezone: true }).notNull(),
    periodEnd: timestamp("period_end", { withTimezone: true }).notNull(),
    slotsUsed: integer("slots_used").notNull().default(0),
    tokensSettled: integer("tokens_settled").notNull().default(0),
  },
  (table) => [
    uniqueIndex("usage_periods_entitlement_start").on(table.entitlementId, table.periodStart),
  ],
);

export const aiReservations = pgTable(
  "ai_reservations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    periodId: uuid("period_id").notNull().references(() => usagePeriods.id),
    entitlementId: uuid("entitlement_id").notNull().references(() => entitlements.id),
    periodStart: timestamp("period_start", { withTimezone: true }).notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    workflowId: text("workflow_id"),
    operation: text("operation").notNull(),
    status: text("status").notNull(),
    reservedTokens: integer("reserved_tokens").notNull(),
    settledPromptTokens: integer("settled_prompt_tokens"),
    settledCompletionTokens: integer("settled_completion_tokens"),
    cachedTokens: integer("cached_tokens"),
    reasoningTokens: integer("reasoning_tokens"),
    providerCost: text("provider_cost"),
    model: text("model"),
    providerName: text("provider_name"),
    generationId: text("generation_id"),
    consumesSlot: boolean("consumes_slot").notNull(),
    slotCounted: boolean("slot_counted").notNull().default(false),
    overReservation: boolean("over_reservation").notNull().default(false),
    unreconciled: boolean("unreconciled").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("ai_reservations_period_key").on(table.periodId, table.idempotencyKey),
    index("ai_reservations_status_created").on(table.status, table.createdAt),
  ],
);
