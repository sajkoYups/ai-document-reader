import { NextRequest, NextResponse } from "next/server";
import { proxyJsonPost, requireSignedInUser } from "../../_lib/backendProxy";

export async function POST(request: NextRequest): Promise<Response> {
  const authError = await requireSignedInUser();
  if (authError) return authError;
  return proxyJsonPost(request, "/api/session/init");
}

export async function GET(): Promise<Response> {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
