import { clerkClient } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import {
  SlidingLimiter,
  allowedRedirect,
  invitationGate,
} from "@/lib/publicEndpointGuards";

const limiter = new SlidingLimiter(10, 60_000);

function clientKey(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || "unknown";
}

function providedSecret(request: NextRequest): string | undefined {
  return (
    request.headers.get("X-Invitation-Secret") ??
    request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "").trim()
  );
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

export async function POST(request: NextRequest) {
  if (!limiter.allow(clientKey(request))) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const gate = invitationGate(process.env.INVITATION_SECRET, providedSecret(request));
  if (gate === "unconfigured") {
    return NextResponse.json({ error: "Invitations are not configured" }, { status: 503 });
  }
  if (gate === "unauthorized") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    emailAddress?: unknown;
    redirectUrl?: unknown;
    publicMetadata?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (body.publicMetadata !== undefined) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (typeof body.emailAddress !== "string" || !body.emailAddress.includes("@")) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const redirectUrl = allowedRedirect(
    typeof body.redirectUrl === "string" ? body.redirectUrl : undefined,
    site,
  );
  if (!redirectUrl) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  try {
    const client = await clerkClient();
    const invitation = await client.invitations.createInvitation({
      emailAddress: body.emailAddress,
      redirectUrl,
    });
    return NextResponse.json({ invitation }, { status: 201 });
  } catch (err) {
    console.error("[invitations] create failed", err);
    return NextResponse.json({ error: "Could not create invitation" }, { status: 500 });
  }
}
