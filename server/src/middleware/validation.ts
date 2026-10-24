import { z } from "zod";

const taskTypes = [
  "summarize",
  "explain",
  "extract",
  "draft",
  "chat",
  "review",
  "compare",
  "timeline",
  "contradictions",
  "missing-information",
  "evidence-finder",
  "action-items",
  "document-map",
] as const;

const sessionInitSchema = z.object({
  clientPublicKey: z.object({
    kty: z.literal("EC"),
    crv: z.literal("P-256"),
    x: z.string(),
    y: z.string(),
  }),
});

const outputLanguageEnum = z.enum(["en", "de", "fr", "cs", "mk"]);

const analyzeRequestSchema = z.object({
  taskType: z.enum(taskTypes),
  documentText: z.string().min(1).max(5_000_000),
  outputLanguage: outputLanguageEnum.optional().default("en"),
  workflowId: z.string().max(64).optional(),
  jsonMode: z.boolean().optional(),
  workflowParams: z
    .object({
      extractType: z.string().max(64).optional(),
      customQuery: z.string().max(2000).optional(),
    })
    .optional(),
});

const chatRequestSchema = z.object({
  documentText: z.string().min(1).max(5_000_000),
  message: z.string().min(1).max(50_000),
  conversationHistory: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string(),
    }),
  )
    .max(24)
    .default([]),
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

const ocrRequestSchema = z.object({
  outputLanguage: outputLanguageEnum.optional().default("en"),
  pages: z
    .array(
      z.object({
        pageNumber: z.number().int().min(1).max(500),
        jpegBase64: z.string().min(1).max(1_800_000),
      }),
    )
    .min(1)
    .max(20),
});

export function validateOcrRequest(
  body: unknown,
): ValidationResult<z.infer<typeof ocrRequestSchema>> {
  const result = ocrRequestSchema.safeParse(body);
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
