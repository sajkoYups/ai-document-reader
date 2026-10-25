import { timingSafeEqual } from "node:crypto";

export function secretsMatch(expected: string, provided: string): boolean {
  const left = Buffer.from(expected);
  const right = Buffer.from(provided);
  if (left.length !== right.length) {
    timingSafeEqual(left, left);
    return false;
  }
  return timingSafeEqual(left, right);
}

export function invitationGate(
  configuredSecret: string | undefined,
  provided: string | undefined,
): "unconfigured" | "unauthorized" | "ok" {
  if (!configuredSecret) return "unconfigured";
  if (!provided || !secretsMatch(configuredSecret, provided)) return "unauthorized";
  return "ok";
}

export function allowedRedirect(
  candidate: string | undefined,
  siteBase: string,
): string | null {
  let origin: string;
  try {
    origin = new URL(siteBase).origin;
  } catch {
    return null;
  }
  const fallback = `${origin}/app`;
  if (!candidate || candidate.trim().length === 0) return fallback;
  try {
    const url = new URL(candidate, origin);
    if (url.origin !== origin) return null;
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function isSameSiteRequest(
  origin: string | null,
  host: string | null,
): boolean {
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host.split(",")[0]?.trim();
  } catch {
    return false;
  }
}

export function recaptchaMaySkip(
  nodeEnv: string | undefined,
  configured: boolean,
): boolean {
  if (configured) return false;
  return nodeEnv !== "production";
}

export function boundedFeedback(
  message: string,
  max = 2000,
): { ok: true; message: string } | { ok: false } {
  const trimmed = message.trim();
  if (trimmed.length === 0 || trimmed.length > max) return { ok: false };
  return { ok: true, message: trimmed };
}

export class SlidingLimiter {
  hits = new Map<string, number[]>();
  limit: number;
  windowMs: number;
  now: () => number;

  constructor(limit: number, windowMs: number, now: () => number = () => Date.now()) {
    this.limit = limit;
    this.windowMs = windowMs;
    this.now = now;
  }

  allow(key: string): boolean {
    const time = this.now();
    const recent = (this.hits.get(key) ?? []).filter(
      (stamp) => time - stamp < this.windowMs,
    );
    if (recent.length >= this.limit) {
      this.hits.set(key, recent);
      return false;
    }
    recent.push(time);
    this.hits.set(key, recent);
    return true;
  }
}
