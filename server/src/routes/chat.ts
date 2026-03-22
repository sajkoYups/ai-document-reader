import { Router } from "express";
import { decryptRequest } from "../middleware/encryption.js";
import { validateChatRequest } from "../middleware/validation.js";
import { capConversationHistoryForDeepChat } from "../contextBudget.js";
import {
  streamDeepInference,
  toClientSafeInferenceError,
} from "../services/llmService.js";
import { encrypt, getSession } from "../services/cryptoService.js";
import { recordUsage } from "../services/usageService.js";

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

  const { documentText, message, outputLanguage } = parsed.data;
  const conversationHistory = capConversationHistoryForDeepChat(
    parsed.data.conversationHistory,
  );
  const userId = (req.headers["x-clerk-user-id"] as string | undefined) ?? "";

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  let completionChars = 0;
  const promptChars = documentText.length + message.length;

  try {
    for await (const token of streamDeepInference(
      "chat",
      documentText,
      message,
      conversationHistory,
      outputLanguage,
    )) {
      completionChars += token.length;
      const encrypted = encrypt(session.aesKey, token);
      res.write(`data: ${JSON.stringify(encrypted)}\n\n`);
    }
    res.write("data: [DONE]\n\n");
    res.end();

    if (userId) {
      recordUsage(userId, promptChars, completionChars, "chat");
    }
  } catch (err) {
    const errMessage = toClientSafeInferenceError(err);
    const encrypted = encrypt(session.aesKey, `__ERROR__:${errMessage}`);
    res.write(`data: ${JSON.stringify(encrypted)}\n\n`);
    res.write("data: [DONE]\n\n");
    res.end();
  }
});
