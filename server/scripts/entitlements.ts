import { Pool } from "@neondatabase/serverless";
import {
  PLAN_SEED_SQL,
  applyTesterGrants,
  previewTesterGrants,
  usersMissingLiteGrant,
} from "../src/usage/grants.js";

function explicitIds(): string[] {
  return (process.env.TESTER_CLERK_IDS ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter((id) => id.length > 0);
}

async function withPool<T>(fn: (client: PoolClientLike) => Promise<T>): Promise<T> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required.");
  const pool = new Pool({ connectionString: url });
  const client = await pool.connect();
  try {
    return await fn(client);
  } finally {
    client.release();
    await pool.end();
  }
}

interface PoolClientLike {
  query: (text: string, params?: unknown[]) => Promise<{ rows: Array<Record<string, unknown>> }>;
}

async function usageUserIds(): Promise<string[]> {
  if (!process.env.DATABASE_URL) return [];
  return withPool(async (client) => {
    const result = await client.query("SELECT DISTINCT user_id FROM token_usage");
    return result.rows.map((row) => String(row.user_id ?? "")).filter((id) => id.length > 0);
  });
}

async function activeLiteIds(): Promise<string[]> {
  if (!process.env.DATABASE_URL) return [];
  return withPool(async (client) => {
    const result = await client.query(
      "SELECT clerk_user_id FROM entitlements WHERE status = 'active' AND plan_code = 'lite'",
    );
    return result.rows.map((row) => String(row.clerk_user_id ?? ""));
  });
}

async function main(): Promise<void> {
  const command = process.argv[2];
  if (command === "preview") {
    const preview = previewTesterGrants(await usageUserIds(), explicitIds());
    console.log(JSON.stringify(preview, null, 2));
    return;
  }
  if (command === "verify") {
    const missing = usersMissingLiteGrant(await usageUserIds(), await activeLiteIds());
    console.log(JSON.stringify({ missing }, null, 2));
    return;
  }
  if (command === "apply") {
    const preview = previewTesterGrants(await usageUserIds(), explicitIds());
    await withPool(async (client) => {
      await client.query("BEGIN");
      try {
        await client.query(PLAN_SEED_SQL);
        const applied = await applyTesterGrants(client, preview.userIds);
        await client.query("COMMIT");
        console.log(JSON.stringify(applied));
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    });
    return;
  }
  console.log("Usage: tsx scripts/entitlements.ts preview|verify|apply");
}

const entry = process.argv[1] ?? "";
if (entry.endsWith("entitlements.ts") || entry.endsWith("entitlements.js")) {
  void main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "entitlement command failed");
    process.exitCode = 1;
  });
}
