# PIA security implementation

Code and tests only. The database was not migrated. Tester grants were not applied. `HOSTED_QUOTA_ENFORCEMENT` stays off unless the environment sets the exact string `true`. Nothing here was deployed.

Public pricing is unchanged. Lite remains an internal 12-run and 2,000,000-token allowance. The pricing page still says €9 and 10 analyses per month. The 2,000,000 figure is not shown in the product.

## Provider gate

`DEEP_ANALYSIS_LLM_PROVIDER` must be exactly `openrouter`. Missing, empty, `ollama`, `runpod`, and any other value abort startup in `server/src/index.ts` and are rejected again in `streamDeepInference` before a fetch. There is no silent Ollama default. The health route does not probe Ollama or RunPod.

`server/src/services/ollamaService.ts` and `server/src/services/runpodService.ts` are still in the repository. RunPod's base URL defaults to empty. `openRunpodChatCompletion` and `checkRunpodHealth` throw if that URL is empty. The previous hardcoded proxy host is gone. Re-enabling either path needs its own accounting and a separate approval. This gate is unconditional. It does not depend on the quota flag, so those hosts cannot run while the OpenRouter ledger is the only meter.

Browser local AI is unchanged as a product path. `processingMode === "local"` still runs in the browser, does not call OpenRouter, and does not take a slot or hosted tokens. The worker prompt split is the only local change: document text is a user turn.

## Entitlements

Catalog codes: `free`, `lite`, `starter`, `pro`, `business`.

Only `lite` has numbers: 12 analysis slots and 2,000,000 hosted tokens. The other codes store null limits. Null, unknown, missing, revoked, expired, or inactive grants fail closed. `payment_status = unpaid` is allowed, so a manual tester grant works without Stripe. New users are not auto-granted Lite or Free.

Tables are declared in `next-app/src/db/schema.ts`: `plan_definitions`, `entitlements`, `usage_periods`, `ai_reservations`. The server writes them with parameterized SQL. `db:push` was not run.

`server/scripts/entitlements.ts` supports `preview`, `verify`, and `apply`. Preview writes nothing. Apply inserts an unpaid Lite grant only when that user has no active entitlement. An active Lite grant is skipped, including its usage period. An active non-Lite grant is skipped and reported. It does not delete `token_usage`. The script was not executed.

Usage periods are stored on the grant. `calendar_utc_month` uses the current UTC month. `subscription_period` rolls forward from `period_anchor` and `period_end` when `now` is past `period_end`. A superseded grant does not share its period with the new one.

## Reservations

Used only when `HOSTED_QUOTA_ENFORCEMENT=true`. Otherwise analyze and chat keep the previous `metered` check and the fire-and-forget `token_usage` insert. The two writers are not both used for one request.

When the flag is on:

- The client `plan` and `metered` fields are ignored. On `/api/analyze`, `repair` or `refine` skips a slot only when `parentIdempotencyKey` matches this user's settled analysis for the same workflow. Any other claim, including `chat` on that route, is stored as `analysis` and consumes a slot. `/api/chat` is always `chat`.
- An idempotency key of at least 8 characters is required. A repeated key, including one whose row is still `reserved`, returns 409 and does not start another provider call. The empty-output retry uses `${key}:retry`.
- The hold is the UTF-8 byte length of the built prompt, plus 32 tokens per message, plus the same `max_tokens` sent to OpenRouter (`OPENROUTER_MAX_TOKENS`, default 8192). Streaming stops forwarding once output bytes reach that output budget.
- One transaction locks the active entitlement, upserts the period, and inserts the reservation only if open slots and open token holds fit. Lite stops at 12 open-or-used analysis slots and at 2,000,000 held-plus-settled tokens.
- Repair, Refine, and Ask consume tokens and do not consume a slot. OCR does not call the hosted model.
- Settlement prefers `prompt_tokens + completion_tokens`. Cached and reasoning tokens are stored and are not added again. If the provider total is above the hold, it is stored and `over_reservation` is set. The total is not clamped.
- If the stream usage chunk is missing and a `gen-...` id was captured, the generation API is queried with backoff. Tests inject that fetch. If both are missing, a completed stream settles `min(hold, input charge + output bytes)`.
- An error before any generation id releases the hold and the slot. An interrupted analysis with completion tokens, or with output bytes and no usage, keeps the slot. A cancelled generation with zero completion tokens does not.
- The empty-output retry settles the first attempt, then reserves again under `${key}:retry`.
- States are `reserved`, `streaming`, `completed`, `partial`, and `released`. A `reserved` row with no generation id expires after 2 minutes and is released. A `streaming` crash is reconciled from the generation API. If that lookup fails, the sweep settles the full hold, marks it unreconciled, and keeps the slot for an analysis. A later lookup can raise or lower the settled total.
- The sweep interval starts only when the flag is on. It does not open a database connection at boot while the flag is off.

The usage panel (`/api/usage/me`) still reads `token_usage` for token charts. When the flag is exactly `true`, the monthly analysis count comes from `ai_reservations` (`completed` or `partial`, operation `analysis`, settled completion greater than 0). The response does not include 2,000,000. After enforcement is turned on, `recordUsage` stops, so the token charts freeze until a later read-side change. The analysis count is the figure that switches.

## Other controls

- Invitations require `INVITATION_SECRET`, compare it with `timingSafeEqual`, allow redirects only on the site origin (default `/app`), reject `publicMetadata`, and return a generic Clerk error. Missing secret is 503. Bad secret is 401. The route allows 10 requests per minute in memory.
- Rate limits for analyze, chat, OCR, and session init are separate and keyed by `x-clerk-user-id`, or `anonymous` when that header is absent. The `X-Forwarded-For` validation in `express-rate-limit` is disabled because these limiters do not use the client IP.
- Session init requires a Clerk user id. `proxyJsonPost` forwards that id the same way the SSE proxy already did.
- Feedback messages are capped at 2,000 characters, are not logged, and are limited to 5 per 10 minutes. Waitlist names are capped at 80 characters. In production, a missing captcha configuration rejects the request. The success body is `{ success: true }`.
- Increase-request rejects a POST whose `Origin` host is not this host.
- Next.js sends `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, a locked-down `Permissions-Policy`, and `Content-Security-Policy-Report-Only`. CSP is not enforced. The report-only policy allows Clerk, Google Analytics, reCAPTCHA, Hugging Face, and blob workers, which the app already loads.
- PDF.js is opened with `isEvalSupported: false`. Text extraction stops at 300 pages. OCR still renders at most 20 pages.
- Inference errors returned to the client are generic (`timeout`, auth, rate limit, upstream, or `Inference failed`). Zod details are not returned.

## Tests and checks

`cd server && npm test` — 30 tests, all passing (23 via `tsx --test`, 7 via `node --experimental-strip-types` so the Next route helpers load as ES modules). Covered: provider refusal with no network, JPEG signature and OCR timeout, prompt roles, session caps and user binding, Lite 12 and 2,000,000, null tiers, ignored `metered` and `plan`, idempotency, settlement and overage, release, empty retry, interrupted slot, byte fallback, mocked generation lookup, sweep classification, cross-user isolation, grant rollover, preview with no writes, invitations, redirects, feedback length, production captcha, same-site origin, and report-only CSP.

`npx tsc --noEmit` passed in `server/` and in `next-app/`. ESLint on the changed Next files reported one pre-existing warning: unused `path` import in `next.config.ts`. `npm audit` results are in `SECURITY_AUDIT.md`. No upgrade was applied.

The hosted UI was not clicked through. That flow needs a signed-in Clerk session and a document. Header and PDF settings were checked from source and from the public-endpoint test, which reads `next.config.ts` and `pdfExtractor.ts`.

## Rollout, after a separate approval

1. Provider fail-closed is already in this code. Deploy that before enforcement.
2. Apply the schema (`db:push` or an equivalent migration) to the intended database.
3. Run `server/scripts/entitlements.ts preview`, review the user list, then `apply`, then `verify`. Do not grant every Clerk user.
4. Set `HOSTED_QUOTA_ENFORCEMENT=true` only after the rows exist. Leave it unset until then, or every hosted call fails closed.
5. Confirm the usage panel's monthly analysis count. Token charts will stop moving until they read the reservation table.

Rollback while the flag is off is a revert of this patch. After the flag is on, turn the flag off to return to the post-hoc insert. Do not run both writers for the same request. Revoke grants by setting entitlement status to `superseded` or `revoked`. Do not delete `token_usage` or reservation history.
