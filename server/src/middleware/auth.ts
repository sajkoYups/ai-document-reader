import type { NextFunction, Request, Response } from "express";
import { timingSafeEqual } from "crypto";
import { config } from "../config.js";

function safeCompare(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

function readProvidedSecret(req: Request): string {
  const headerValue = req.headers[config.trustedProxy.headerName];
  const headerSecret = Array.isArray(headerValue)
    ? headerValue[0]
    : headerValue;
  if (typeof headerSecret === "string" && headerSecret.trim()) {
    return headerSecret.trim();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader) return "";
  const bearer = authHeader.replace(/^Bearer\s+/i, "").trim();
  return bearer;
}

export function requireTrustedProxy(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const providedSecret = readProvidedSecret(req);
  if (
    providedSecret &&
    safeCompare(providedSecret, config.trustedProxy.secret)
  ) {
    next();
    return;
  }

  res.status(401).json({ error: "Unauthorized" });
}
