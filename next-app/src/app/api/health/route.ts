import { NextResponse } from "next/server";
import { proxyGet, requireSignedInUser } from "../_lib/backendProxy";

export async function GET(): Promise<Response> {
  const authError = await requireSignedInUser();
  if (authError) return authError;
  return proxyGet("/api/health");
}

export async function POST(): Promise<Response> {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
