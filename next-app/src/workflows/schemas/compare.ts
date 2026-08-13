import { z } from "zod";

const EvidenceIds = z.array(z.string()).default([]);

const ComparisonItemSchema = z.object({
  text: z.string().default(""),
  side: z.enum(["a", "b", "both"]).default("both"),
  evidenceIds: EvidenceIds,
});

export const ComparisonResultSchema = z.object({
  overview: z.string().default(""),
  similarities: z.array(ComparisonItemSchema).default([]),
  differences: z.array(ComparisonItemSchema).default([]),
  attention: z.array(ComparisonItemSchema).default([]),
});

export type ComparisonResult = z.infer<typeof ComparisonResultSchema>;
export type ComparisonItem = z.infer<typeof ComparisonItemSchema>;
