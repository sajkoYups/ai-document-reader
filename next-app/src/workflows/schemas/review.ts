import { z } from "zod";

export const ReviewFindingSchema = z.object({
  id: z.string().optional(),
  title: z.string(),
  importance: z.enum(["low", "medium", "high"]).default("medium"),
  explanation: z.string().default(""),
  confidence: z.enum(["low", "medium", "high"]).default("medium"),
  evidenceIds: z.array(z.string()).default([]),
  suggestedQuestion: z.string().optional(),
});

export const ReviewResultSchema = z.object({
  overview: z.string().default(""),
  assessment: z
    .enum(["low_attention", "medium_attention", "high_attention"])
    .default("medium_attention"),
  findings: z.array(ReviewFindingSchema).default([]),
});

export type ReviewFinding = z.infer<typeof ReviewFindingSchema>;
export type ReviewResult = z.infer<typeof ReviewResultSchema>;
