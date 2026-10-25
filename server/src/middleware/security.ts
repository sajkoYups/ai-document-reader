import type { Express, Request } from "express";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { config } from "../config.js";
import { readClerkUserId } from "./auth.js";

export function applySecurity(app: Express): void {
  app.use(helmet());

  app.use(
    cors({
      origin: config.cors.origins,
      methods: ["GET", "POST"],
      allowedHeaders: ["Content-Type"],
      maxAge: 86400,
    }),
  );

  app.use(
    express.json({
      limit: "55mb",
    }),
  );

  const userLimiter = () =>
    rateLimit({
      windowMs: config.rateLimit.windowMs,
      max: config.rateLimit.maxRequests,
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: (req: Request) =>
        readClerkUserId(req.headers["x-clerk-user-id"]) || "anonymous",
      validate: { xForwardedForHeader: false },
      message: { error: "Too many requests, please try again later." },
    });

  app.use("/api/analyze", userLimiter());
  app.use("/api/chat", userLimiter());
  app.use("/api/ocr", userLimiter());
  app.use("/api/session", userLimiter());

  app.use((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader(
      "Permissions-Policy",
      "camera=(), microphone=(), geolocation=(), payment=(), usb=(), bluetooth=(), serial=(), hid=()",
    );
    next();
  });
}
