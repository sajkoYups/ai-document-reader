import { Router } from "express";
import { decryptRequest } from "../middleware/encryption.js";
import { validateOcrRequest } from "../middleware/validation.js";
import { encrypt, getSession } from "../services/cryptoService.js";
import { recognizePageImages } from "../services/ocrService.js";

export const ocrRouter = Router();

ocrRouter.post("/", async (req, res) => {
  const decrypted = decryptRequest(req.body);
  if (!decrypted.success) {
    res.status(400).json({ error: decrypted.error });
    return;
  }

  const parsed = validateOcrRequest(decrypted.data);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error });
    return;
  }

  const session = getSession(req.body.sessionId);
  if (!session) {
    res.status(401).json({ error: "Invalid or expired session" });
    return;
  }

  try {
    const result = await recognizePageImages(
      parsed.data.pages,
      parsed.data.outputLanguage,
    );
    const encrypted = encrypt(session.aesKey, JSON.stringify(result));
    res.json(encrypted);
  } catch (error) {
    console.error("[ocr] recognition failed", error);
    res.status(500).json({ error: "Could not read page images" });
  }
});
