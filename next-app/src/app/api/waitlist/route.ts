import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { waitlist } from "@/db/schema";
import { encrypt } from "@/lib/encryption";
import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const RECAPTCHA_PROJECT_ID = process.env.RECAPTCHA_PROJECT_ID ?? "";
const RECAPTCHA_API_KEY = process.env.RECAPTCHA_API_KEY ?? "";
const RECAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY ?? "";
const RECAPTCHA_MIN_SCORE = 0.5;

async function verifyRecaptcha(token: string): Promise<{ ok: boolean; reason?: string }> {
  if (!RECAPTCHA_PROJECT_ID || !RECAPTCHA_API_KEY || !RECAPTCHA_SITE_KEY) {
    console.warn("[recaptcha] Missing env vars — skipping verification");
    return { ok: true };
  }

  const url = `https://recaptchaenterprise.googleapis.com/v1/projects/${RECAPTCHA_PROJECT_ID}/assessments?key=${RECAPTCHA_API_KEY}`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event: { token, siteKey: RECAPTCHA_SITE_KEY, expectedAction: "WAITLIST" },
      }),
    });
  } catch (err) {
    console.error("[recaptcha] Network error during assessment:", err);
    return { ok: false, reason: "recaptcha_network_error" };
  }

  if (!res.ok) {
    console.error("[recaptcha] Assessment API returned", res.status);
    return { ok: false, reason: "recaptcha_api_error" };
  }

  const data = await res.json();

  if (!data.tokenProperties?.valid) {
    console.warn("[recaptcha] Invalid token:", data.tokenProperties?.invalidReason);
    return { ok: false, reason: "recaptcha_invalid_token" };
  }

  if (data.tokenProperties.action !== "WAITLIST") {
    console.warn("[recaptcha] Action mismatch:", data.tokenProperties.action);
    return { ok: false, reason: "recaptcha_action_mismatch" };
  }

  const score: number = data.riskAnalysis?.score ?? 0;
  if (score < RECAPTCHA_MIN_SCORE) {
    console.warn("[recaptcha] Score too low:", score);
    return { ok: false, reason: "recaptcha_low_score" };
  }

  return { ok: true };
}

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
  let body: { email?: unknown; firstName?: unknown; lastName?: unknown; recaptchaToken?: unknown };
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

  const token = typeof body.recaptchaToken === "string" ? body.recaptchaToken : "";
  const captcha = await verifyRecaptcha(token);
  if (!captcha.ok) {
    return NextResponse.json(
      { error: "Bot check failed. Please refresh the page and try again." },
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
        from: "PIA <onboarding@resend.dev>",
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
