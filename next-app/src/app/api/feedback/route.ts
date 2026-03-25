import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const SENTIMENT_LABELS: Record<string, string> = {
  good: "Good 👍",
  bad: "Bad 👎",
};

const ACTION_LABELS: Record<string, string> = {
  improve: "Improve it",
  replace: "Replace it",
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export async function POST(request: NextRequest) {
  let body: { sentiment?: unknown; action?: unknown; message?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (
    typeof body.sentiment !== "string" ||
    !["good", "bad"].includes(body.sentiment)
  ) {
    return NextResponse.json(
      { error: "Sentiment must be 'good' or 'bad'" },
      { status: 400 },
    );
  }

  if (
    typeof body.action !== "string" ||
    !["improve", "replace"].includes(body.action)
  ) {
    return NextResponse.json(
      { error: "Action must be 'improve' or 'replace'" },
      { status: 400 },
    );
  }

  if (!isNonEmptyString(body.message)) {
    return NextResponse.json(
      { error: "A feedback message is required" },
      { status: 400 },
    );
  }

  const sentimentLabel = SENTIMENT_LABELS[body.sentiment];
  const actionLabel = ACTION_LABELS[body.action];
  const message = body.message.trim();

  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL;
  if (resend && adminEmail) {
    resend.emails
      .send({
        from: "PIA <onboarding@resend.dev>",
        to: adminEmail,
        subject: `New feedback — ${sentimentLabel}`,
        text: [
          `Experience: ${sentimentLabel}`,
          `Request: ${actionLabel}`,
          ``,
          `Message:`,
          message,
        ].join("\n"),
      })
      .catch((err) =>
        console.error("[feedback] Email notification failed:", err),
      );
  } else {
    console.log("[feedback] Resend not configured, skipping email:", {
      sentiment: sentimentLabel,
      action: actionLabel,
      message,
    });
  }

  return NextResponse.json({ success: true }, { status: 200 });
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
