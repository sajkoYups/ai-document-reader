import { z } from "zod";

const EvidenceIds = z.array(z.string()).default([]);

export const ContradictionItemSchema = z.object({
  id: z.string().default(""),
  title: z.string().default(""),
  claimA: z.string().default(""),
  claimB: z.string().default(""),
  explanation: z.string().default(""),
  confidence: z.enum(["low", "medium", "high"]).default("medium"),
  evidenceIds: EvidenceIds,
  suggestedQuestion: z.string().optional(),
});

export const ContradictionsResultSchema = z.object({
  overview: z.string().default(""),
  contradictions: z.array(ContradictionItemSchema).default([]),
});

export const MissingItemSchema = z.object({
  id: z.string().default(""),
  title: z.string().default(""),
  explanation: z.string().default(""),
  importance: z.enum(["low", "medium", "high"]).default("medium"),
  evidenceIds: EvidenceIds,
  suggestedQuestion: z.string().optional(),
});

export const MissingInformationResultSchema = z.object({
  overview: z.string().default(""),
  missing: z.array(MissingItemSchema).default([]),
});

export const EvidencePassageSchema = z.object({
  id: z.string().default(""),
  title: z.string().default(""),
  passage: z.string().default(""),
  whyRelevant: z.string().default(""),
  evidenceIds: EvidenceIds,
});

export const EvidenceFinderResultSchema = z.object({
  overview: z.string().default(""),
  query: z.string().default(""),
  passages: z.array(EvidencePassageSchema).default([]),
});

export const ActionItemSchema = z.object({
  action: z.string().default(""),
  owner: z.string().default("Not specified"),
  deadline: z.string().default("Not specified"),
  evidenceIds: EvidenceIds,
});

export const ActionItemsResultSchema = z.object({
  overview: z.string().default(""),
  items: z.array(ActionItemSchema).default([]),
});

export const DocumentMapNodeSchema = z.object({
  heading: z.string().default(""),
  summary: z.string().default(""),
  evidenceIds: EvidenceIds,
});

export const DocumentMapResultSchema = z.object({
  overview: z.string().default(""),
  sections: z.array(DocumentMapNodeSchema).default([]),
});

export type ContradictionsResult = z.infer<typeof ContradictionsResultSchema>;
export type MissingInformationResult = z.infer<typeof MissingInformationResultSchema>;
export type EvidenceFinderResult = z.infer<typeof EvidenceFinderResultSchema>;
export type ActionItemsResult = z.infer<typeof ActionItemsResultSchema>;
export type DocumentMapResult = z.infer<typeof DocumentMapResultSchema>;
