import { clerkClient } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

const baseUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const defaultRedirectUrl = `${baseUrl.replace(/\/$/, "")}/app`;

function isValidEmail(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.includes("@");
}

export async function GET() {
  return NextResponse.json(
    { error: "Method not allowed" },
    { status: 405 }
  );
}

export async function POST(request: NextRequest) {
  const secret = process.env.INVITATION_SECRET;
  if (secret) {
    const headerSecret =
      request.headers.get("X-Invitation-Secret") ??
      request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "").trim();
    if (headerSecret !== secret) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
  }

  let body: {
    emailAddress?: unknown;
    redirectUrl?: unknown;
    publicMetadata?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  if (!isValidEmail(body.emailAddress)) {
    return NextResponse.json(
      { error: "Missing or invalid emailAddress" },
      { status: 400 }
    );
  }

  const emailAddress = body.emailAddress;
  const redirectUrl =
    typeof body.redirectUrl === "string" && body.redirectUrl.trim().length > 0
      ? body.redirectUrl.trim()
      : defaultRedirectUrl;
  const publicMetadata =
    body.publicMetadata && typeof body.publicMetadata === "object"
      ? (body.publicMetadata as Record<string, unknown>)
      : {};

  try {
    const client = await clerkClient();
    const invitation = await client.invitations.createInvitation({
      emailAddress,
      redirectUrl,
      publicMetadata,
    });
    return NextResponse.json({ invitation }, { status: 201 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to create invitation";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
