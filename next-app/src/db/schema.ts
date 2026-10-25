import { pgTable, uuid, text, integer, timestamp } from "drizzle-orm/pg-core";

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
