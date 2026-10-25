# PIA security audit

Audit of Private Analyzer (PIA) on 25 October 2026. The app keeps documents in the browser. Deep Analysis sends selected text to the API over an encrypted session. Neon stores encrypted waitlist fields and usage counts. It does not store documents.

Excluded skills `oakoss/agent-skills/database-security` and `woohyun212/security-skill/llm-ai-security` were not fetched or used. No new third-party security skills were installed. OWASP ZAP, Burp, and live calls to OpenRouter were not used. Tests use synthetic payloads and mocked provider responses.

## What the review looked at

- Next.js routes for invitations, feedback, waitlist, usage, and the proxy to Express.
- Express analyze, chat, OCR, and session routes, plus the in-memory encrypted session map.
- Hosted model selection, including the previous silent Ollama default and a hardcoded RunPod URL.
- Prompt construction on the server and in the browser worker.
- PDF and OCR handling in the browser and on the server.
- The existing `token_usage` counter and the new entitlement ledger (code only; the schema was not applied to a database).

## Findings

| Severity | Finding | Status |
| --- | --- | --- |
| High | Invitations accepted a missing secret, a non-constant-time compare, any redirect, and caller `publicMetadata`. | Fixed in code. Secret required, timing-safe compare, site-origin redirect, metadata rejected, generic errors, in-memory rate limit. |
| High | Hosted quota could be skipped with `metered: false`, and parallel requests all passed a check that recorded usage only after a successful stream. Ask was unmetered. | Ledger implemented. Enforcement is off unless `HOSTED_QUOTA_ENFORCEMENT` is exactly `true`. The old counter remains the live path until that flag is turned on after a separate schema and grant approval. |
| Medium | Analyze, chat, and OCR shared one process-wide rate limit. The Next proxy does not forward the browser IP. Session creation was unbounded and not tied to a user. | Separate per-user limiters. Session map capped at 500 globally and 5 per Clerk user. `getSession` requires the same user id. |
| Medium | OCR accepted any base64 and had no page timeout. | JPEG start-of-image required. A wedged page is dropped after 60 seconds. |
| Medium | Document text and `customQuery` were interpolated into system prompts, including Ask. | System text is instructions only. Document text and the custom request go in the user turn, with a per-request delimiter, on the server and in the browser worker. |
| Medium | Feedback and waitlist could fail open. Feedback logged request bodies. | Feedback is length-capped and rate-limited. Production waitlist captcha fails closed when the captcha config is missing. Success responses do not echo mailer errors. |
| Medium | `config.ts` contained a hardcoded RunPod proxy host, used when `RUNPOD_BASE_URL` was empty. | Host removed. An empty RunPod URL throws before fetch. The live provider must be exactly `openrouter`. |
| Low | Next responses had no baseline security headers. PDF.js could evaluate JS in documents. The increase-request route accepted cross-site POSTs. Inference errors echoed provider text. | Headers added, including CSP Report-Only. PDF.js `isEvalSupported: false` and a 300-page text cap. Increase-request requires a same-site `Origin`. Client errors are generic. |

Reviewed and not found: document IDOR, SQL injection in the existing waitlist and usage queries, and stored XSS. Workflow answers render as React text. Prompt injection can change an answer. It does not become script execution in the page.

## Provider finding

`parseProvider` used to return Ollama for every value other than the exact strings `openrouter` and `runpod`, including an unset variable. A mistyped provider would send document text to local Ollama and, if the new ledger wrapped only the OpenRouter client, would skip token accounting.

The process now refuses to listen unless `DEEP_ANALYSIS_LLM_PROVIDER` is exactly `openrouter`. `streamDeepInference` checks again before any fetch and calls only the OpenRouter stream. Health checks do not probe Ollama or RunPod. Those modules remain in the repo and are not the active path. Server Ollama is not the browser local model.

## npm audit (25 October 2026)

No packages were upgraded. Fixes are either a semver-major jump or a framework bump that was not verified against this app.

Server (`npm audit`), 6 advisories: 1 critical, 3 high, 1 moderate, 1 low.

- `proxy-addr` (critical, transitive): IP spoofing when a trust subnet is configured. The new rate limits use the Clerk user id, not `req.ip`.
- `zod` (high, direct, v3): memory use on oversized constrained collections. The published fix is Zod 4. Not upgraded. JSON bodies are already size-capped.
- `body-parser` and `path-to-regexp` (high, transitive via Express): denial of service. Left on the current Express 5 line.
- `qs` (moderate) and `esbuild` (low, dev): left as reported. The esbuild note is a Windows development-server file read.

Next app (`npm audit`), 31 advisories: 5 critical, 15 high, 10 moderate, 1 low. Direct packages called out by npm:

- `@clerk/nextjs`: middleware route-protection bypass, and a separate organization or billing authorization bypass. This app's middleware calls `clerkMiddleware()` and does not call `auth.protect()`. Hosted handlers still call `auth()`, and Express still requires the proxy secret and the forwarded Clerk user id. The SDK was not bumped in this pass.
- `next` 16.1.6: npm suggests 16.4.3, including a rewrite request-smuggling note. Not upgraded here.
- `drizzle-orm`: SQL injection through improperly escaped identifiers. The new reservation SQL uses fixed statement text and bound parameters.
- `@huggingface/transformers`: the suggested fix is 4.x, which would change the in-browser model. Not upgraded.
- `drizzle-kit` and `resend`: dev or mailer advisories. Not upgraded.

## Residual risk

- Quota enforcement is off by default. Until the schema is applied, testers are granted, and the flag is set, the old post-hoc `token_usage` insert is still the live counter, including the `metered` gap.
- The client chooses `operation`. A caller can label a hosted analysis as `repair`, `refine`, or `chat` and avoid the 12-slot counter. Every hosted call still holds and settles tokens against the 2,000,000 budget when enforcement is on. That shared budget is the ceiling for this abuse.
- A document whose UTF-8 prompt exceeds the remaining token budget is rejected before the provider call once enforcement is on. The browser still caps typical hosted context around 10,000 characters. The server schema still allows a much larger body. That cap was not raised.
- CSP is report-only. It does not block.
- The in-memory session map and rate limiters reset on process restart and are not shared across instances.
- Two parallel requests with the same idempotency key can both observe `reserved` before the first token marks the row `streaming`. The second insert is prevented by the unique key. The duplicate response returns the existing row.

## Not done in this change

Schema push, tester grants, turning enforcement on, and any deploy. The operator script was not executed. The pricing page was not edited. ClamAV and Cloudmersive were not added. See `FILE_SECURITY_STRATEGY.md` and `SECURITY_IMPLEMENTATION.md`.
