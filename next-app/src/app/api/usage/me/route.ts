import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { aiReservations, entitlements, tokenUsage, usagePeriods } from "@/db/schema";
import { quotaFromCount } from "@/lib/analysisQuota";
import { and, eq, sum, count, sql } from "drizzle-orm";

export async function GET(): Promise<Response> {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const hostedQuota = process.env.HOSTED_QUOTA_ENFORCEMENT === "true";
  const monthlyQuery = hostedQuota
    ? db
        .select({ analyses: count(aiReservations.id) })
        .from(aiReservations)
        .innerJoin(entitlements, eq(aiReservations.entitlementId, entitlements.id))
        .innerJoin(usagePeriods, eq(aiReservations.periodId, usagePeriods.id))
        .where(
          and(
            eq(entitlements.clerkUserId, userId),
            eq(aiReservations.operation, "analysis"),
            sql`${aiReservations.settledCompletionTokens} > 0`,
            sql`${aiReservations.status} in ('completed', 'partial')`,
            sql`${usagePeriods.periodStart} >= date_trunc('month', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'`,
          ),
        )
    : db
        .select({ analyses: count(tokenUsage.id) })
        .from(tokenUsage)
        .where(
          and(
            eq(tokenUsage.userId, userId),
            eq(tokenUsage.callType, "analyze"),
            sql`${tokenUsage.createdAt} >= date_trunc('month', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'`,
          ),
        );

  const [totalsRows, breakdown, activity, monthlyRows] = await Promise.all([
    db
      .select({
        totalTokens: sum(tokenUsage.estimatedTokens),
        totalCalls: count(tokenUsage.id),
      })
      .from(tokenUsage)
      .where(eq(tokenUsage.userId, userId)),
    db
      .select({
        callType: tokenUsage.callType,
        tokens: sum(tokenUsage.estimatedTokens),
        calls: count(tokenUsage.id),
      })
      .from(tokenUsage)
      .where(eq(tokenUsage.userId, userId))
      .groupBy(tokenUsage.callType),
    db
      .select({
        day: sql<string>`DATE(created_at)`,
        tokens: sum(tokenUsage.estimatedTokens),
      })
      .from(tokenUsage)
      .where(
        sql`user_id = ${userId} AND created_at >= NOW() - INTERVAL '30 days'`,
      )
      .groupBy(sql`DATE(created_at)`)
      .orderBy(sql`DATE(created_at)`),
    monthlyQuery,
  ]);

  const totals = totalsRows[0];
  const monthly = monthlyRows[0];

  return NextResponse.json({
    totalTokens: Number(totals?.totalTokens ?? 0),
    totalCalls: Number(totals?.totalCalls ?? 0),
    breakdown: breakdown.map((b) => ({
      callType: b.callType,
      tokens: Number(b.tokens ?? 0),
      calls: Number(b.calls ?? 0),
    })),
    activity: activity.map((a) => ({
      day: a.day,
      tokens: Number(a.tokens ?? 0),
    })),
    quota: quotaFromCount(Number(monthly?.analyses ?? 0)),
  });
}
