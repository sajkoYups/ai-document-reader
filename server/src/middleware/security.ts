import type { Express } from "express";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { config } from "../config.js";

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

  const limiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.maxRequests,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests, please try again later." },
  });

  app.use("/api/analyze", limiter);
  app.use("/api/chat", limiter);

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
