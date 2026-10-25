import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { isSameSiteRequest } from "@/lib/publicEndpointGuards";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export async function POST(request: NextRequest): Promise<Response> {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!isSameSiteRequest(request.headers.get("origin"), host)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 403 });
  }
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Sign in to request more analyses." }, { status: 401 });
  }

  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL?.trim();
  if (!resend || !adminEmail) {
    console.error("[usage] Increase request skipped: email is not configured");
    return NextResponse.json(
      { error: "Could not send the request." },
      { status: 503 },
    );
  }

  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  const name = user?.fullName?.trim() || user?.username?.trim() || "";

  try {
    await resend.emails.send({
      from: "PIA <onboarding@resend.dev>",
      to: adminEmail,
      ...(email ? { replyTo: email } : {}),
      subject: "Increase Deep Analysis limit",
      text: [
        "A signed-in user hit the Deep Analysis monthly limit and asked for more analyses.",
        "",
        `User ID: ${userId}`,
        `Email: ${email || "unknown"}`,
        `Name: ${name || "unknown"}`,
      ].join("\n"),
    });
  } catch (err) {
    console.error("[usage] Increase request email failed:", err);
    return NextResponse.json(
      { error: "Could not send the request." },
      { status: 502 },
    );
  }

  return NextResponse.json({ success: true });
}

export async function GET(): Promise<Response> {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
