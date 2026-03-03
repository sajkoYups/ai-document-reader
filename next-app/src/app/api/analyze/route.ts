import { NextRequest, NextResponse } from "next/server";
import { proxySsePost, requireSignedInUser } from "../_lib/backendProxy";

export async function POST(request: NextRequest): Promise<Response> {
  const authError = await requireSignedInUser();
  if (authError) return authError;
  return proxySsePost(request, "/api/analyze");
}

export async function GET(): Promise<Response> {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
