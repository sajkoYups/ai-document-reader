import { Router } from "express";
import { decryptRequest } from "../middleware/encryption.js";
import { validateChatRequest } from "../middleware/validation.js";
import { streamInference } from "../services/ollamaService.js";
import { encrypt, getSession } from "../services/cryptoService.js";

export const chatRouter = Router();

chatRouter.post("/", async (req, res) => {
  const decrypted = decryptRequest(req.body);
  if (!decrypted.success) {
    res.status(400).json({ error: decrypted.error });
    return;
  }

  const parsed = validateChatRequest(decrypted.data);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error });
    return;
  }

  const session = getSession(req.body.sessionId);
  if (!session) {
    res.status(401).json({ error: "Invalid or expired session" });
    return;
  }

  const { documentText, message, conversationHistory } = parsed.data;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  try {
    for await (const token of streamInference(
      "chat",
      documentText,
      message,
      conversationHistory,
    )) {
      const encrypted = encrypt(session.aesKey, token);
      res.write(`data: ${JSON.stringify(encrypted)}\n\n`);
    }
    res.write("data: [DONE]\n\n");
    res.end();
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Chat inference failed";
    const encrypted = encrypt(session.aesKey, `__ERROR__:${message}`);
    res.write(`data: ${JSON.stringify(encrypted)}\n\n`);
    res.write("data: [DONE]\n\n");
    res.end();
  }
});
