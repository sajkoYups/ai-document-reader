import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tokenUsage } from "@/db/schema";
import { eq, sum, count, sql } from "drizzle-orm";

export async function GET(): Promise<Response> {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [totals] = await db
    .select({
      totalTokens: sum(tokenUsage.estimatedTokens),
      totalCalls: count(tokenUsage.id),
    })
    .from(tokenUsage)
    .where(eq(tokenUsage.userId, userId));

  const breakdown = await db
    .select({
      callType: tokenUsage.callType,
      tokens: sum(tokenUsage.estimatedTokens),
      calls: count(tokenUsage.id),
    })
    .from(tokenUsage)
    .where(eq(tokenUsage.userId, userId))
    .groupBy(tokenUsage.callType);

  // Last 30 days activity (daily buckets)
  const activity = await db
    .select({
      day: sql<string>`DATE(created_at)`,
      tokens: sum(tokenUsage.estimatedTokens),
    })
    .from(tokenUsage)
    .where(
      sql`user_id = ${userId} AND created_at >= NOW() - INTERVAL '30 days'`,
    )
    .groupBy(sql`DATE(created_at)`)
    .orderBy(sql`DATE(created_at)`);

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
  });
}
