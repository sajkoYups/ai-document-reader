import { z } from "zod";

const taskTypes = ["summarize", "explain", "extract", "draft", "chat"] as const;

const sessionInitSchema = z.object({
  clientPublicKey: z.object({
    kty: z.literal("EC"),
    crv: z.literal("P-256"),
    x: z.string(),
    y: z.string(),
  }),
});

const outputLanguageEnum = z.enum(["en", "de", "fr", "cs"]);

const analyzeRequestSchema = z.object({
  taskType: z.enum(taskTypes),
  documentText: z.string().min(1).max(5_000_000),
  outputLanguage: outputLanguageEnum.optional().default("en"),
});

const chatRequestSchema = z.object({
  documentText: z.string().min(1).max(5_000_000),
  message: z.string().min(1).max(50_000),
  conversationHistory: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string(),
    }),
  ).max(50).default([]),
  outputLanguage: outputLanguageEnum.optional().default("en"),
});

type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export function validateSessionInit(
  body: unknown,
): ValidationResult<z.infer<typeof sessionInitSchema>> {
  const result = sessionInitSchema.safeParse(body);
  if (!result.success) {
    return { success: false, error: result.error.message };
  }
  return { success: true, data: result.data };
}

export function validateAnalyzeRequest(
  body: unknown,
): ValidationResult<z.infer<typeof analyzeRequestSchema>> {
  const result = analyzeRequestSchema.safeParse(body);
  if (!result.success) {
    return { success: false, error: result.error.message };
  }
  return { success: true, data: result.data };
}

export function validateChatRequest(
  body: unknown,
): ValidationResult<z.infer<typeof chatRequestSchema>> {
  const result = chatRequestSchema.safeParse(body);
  if (!result.success) {
    return { success: false, error: result.error.message };
  }
  return { success: true, data: result.data };
}
