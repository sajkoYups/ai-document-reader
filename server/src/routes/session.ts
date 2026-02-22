import { Router } from "express";
import { initSession } from "../services/cryptoService.js";
import { validateSessionInit } from "../middleware/validation.js";

export const sessionRouter = Router();

sessionRouter.post("/init", async (req, res) => {
  const parsed = validateSessionInit(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error });
    return;
  }

  try {
    const { sessionId, serverPublicKey } = await initSession(
      parsed.data.clientPublicKey,
    );
    res.json({ sessionId, serverPublicKey });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Key exchange failed";
    res.status(500).json({ error: message });
  }
});
