import { Router } from "express";
import { readClerkUserId } from "../middleware/auth.js";
import { initSession, SessionLimitError } from "../services/cryptoService.js";
import { validateSessionInit } from "../middleware/validation.js";

export const sessionRouter = Router();

sessionRouter.post("/init", async (req, res) => {
  const userId = readClerkUserId(req.headers["x-clerk-user-id"]);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const parsed = validateSessionInit(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }

  try {
    const { sessionId, serverPublicKey } = await initSession(
      parsed.data.clientPublicKey,
      userId,
    );
    res.json({ sessionId, serverPublicKey });
  } catch (err) {
    console.error("[session] init failed", err);
    if (err instanceof SessionLimitError) {
      res.status(429).json({ error: "Too many sessions" });
      return;
    }
    res.status(500).json({ error: "Could not start session" });
  }
});
