import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import * as guards from "../../next-app/src/lib/publicEndpointGuards.ts";
import * as localMessages from "../../next-app/src/lib/localMessages.ts";

const {
  SlidingLimiter,
  allowedRedirect,
  boundedFeedback,
  invitationGate,
  isSameSiteRequest,
  recaptchaMaySkip,
} = guards;

test("invitations fail closed without a matching secret", () => {
  assert.equal(invitationGate(undefined, undefined), "unconfigured");
  assert.equal(invitationGate(undefined, "anything"), "unconfigured");
  assert.equal(invitationGate("secret", "secret"), "ok");
  assert.equal(invitationGate("secret", "secretx"), "unauthorized");
  assert.equal(invitationGate("secret", undefined), "unauthorized");
});

test("invitation redirects stay on the site origin", () => {
  assert.equal(
    allowedRedirect(undefined, "https://pia.example"),
    "https://pia.example/app",
  );
  assert.equal(
    allowedRedirect("https://pia.example/welcome", "https://pia.example"),
    "https://pia.example/welcome",
  );
  assert.equal(allowedRedirect("https://evil.example/phish", "https://pia.example"), null);
  assert.equal(allowedRedirect("javascript:alert(1)", "https://pia.example"), null);
});

test("feedback is length capped and the waitlist captcha fails closed in production", () => {
  assert.equal(boundedFeedback("  useful  ").ok, true);
  assert.equal(boundedFeedback("").ok, false);
  assert.equal(boundedFeedback("x".repeat(2001)).ok, false);
  assert.equal(recaptchaMaySkip("production", false), false);
  assert.equal(recaptchaMaySkip("development", false), true);
  assert.equal(recaptchaMaySkip("production", true), false);
});

test("increase-request accepts only a same-site Origin", () => {
  assert.equal(isSameSiteRequest("https://pia.example", "pia.example"), true);
  assert.equal(isSameSiteRequest("https://evil.example", "pia.example"), false);
  assert.equal(isSameSiteRequest(null, "pia.example"), false);
});

test("public route limiter blocks the extra call", () => {
  const limiter = new SlidingLimiter(2, 1_000, () => 1_000);
  assert.equal(limiter.allow("a"), true);
  assert.equal(limiter.allow("a"), true);
  assert.equal(limiter.allow("a"), false);
  assert.equal(limiter.allow("b"), true);
});

test("browser local messages keep document text out of the system role", () => {
  const messages = localMessages.assembleLocalMessages({
    system: "SYSTEM_RULES",
    taskType: "chat",
    text: "SECRET_DOC_MARKER",
    conversationHistory: [{ role: "user", content: "Hello" }],
  });
  const system = messages.find((message) => message.role === "system")?.content;
  assert.equal(system, "SYSTEM_RULES");
  assert.match(messages.map((message) => message.content).join("\n"), /SECRET_DOC_MARKER/);
});

test("security headers are report-only and PDF.js eval is disabled", () => {
  const config = readFileSync(
    new URL("../../next-app/next.config.ts", import.meta.url),
    "utf8",
  );
  const pdf = readFileSync(
    new URL("../../next-app/src/lib/pdfExtractor.ts", import.meta.url),
    "utf8",
  );
  assert.match(config, /Content-Security-Policy-Report-Only/);
  assert.equal(config.includes('key: "Content-Security-Policy"'), false);
  assert.match(pdf, /isEvalSupported: false/);
  assert.match(pdf, /MAX_TEXT_PDF_PAGES = 300/);
});
