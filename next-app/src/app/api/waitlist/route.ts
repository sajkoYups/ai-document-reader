import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { waitlist } from "@/db/schema";
import { encrypt } from "@/lib/encryption";
import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

function isValidEmail(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
  );
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export async function POST(request: NextRequest) {
  let body: { email?: unknown; firstName?: unknown; lastName?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!isValidEmail(body.email)) {
    return NextResponse.json(
      { error: "A valid email address is required" },
      { status: 400 },
    );
  }
  if (!isNonEmptyString(body.firstName)) {
    return NextResponse.json(
      { error: "First name is required" },
      { status: 400 },
    );
  }
  if (!isNonEmptyString(body.lastName)) {
    return NextResponse.json(
      { error: "Last name is required" },
      { status: 400 },
    );
  }

  try {
    await db.insert(waitlist).values({
      emailEnc: encrypt(body.email),
      firstNameEnc: encrypt(body.firstName.trim()),
      lastNameEnc: encrypt(body.lastName.trim()),
    });
  } catch (err) {
    console.error("[waitlist] DB insert failed:", err);
    return NextResponse.json(
      { error: "Failed to save waitlist entry" },
      { status: 500 },
    );
  }

  // Fire-and-forget admin email notification
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL;
  if (resend && adminEmail) {
    resend.emails
      .send({
        from: "Doc Analyzer <onboarding@resend.dev>",
        to: adminEmail,
        subject: "New waitlist signup",
        text: `New waitlist entry:\n\nName: ${body.firstName.trim()} ${body.lastName.trim()}\nEmail: ${body.email}\n`,
      })
      .catch((err) => console.error("[waitlist] Email notification failed:", err));
  }

  return NextResponse.json({ success: true }, { status: 201 });
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
