import { Pool, type PoolClient } from "@neondatabase/serverless";
import type { Queryable } from "./reservationSql.js";

let pool: Pool | undefined;

export function getPool(): Pool {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is required for hosted quota.");
  }
  pool ??= new Pool({ connectionString: url });
  return pool;
}

export async function withDbClient<T>(fn: (client: Queryable) => Promise<T>): Promise<T> {
  const client: PoolClient = await getPool().connect();
  try {
    return await fn(client);
  } finally {
    client.release();
  }
}
