import { z } from "zod";

export const EvidenceIdSchema = z.string().regex(/^E\d+$/);

export const EvidenceReferenceSchema = z.object({
  documentId: z.string(),
  documentName: z.string(),
  page: z.number().int().positive().optional(),
  section: z.string().optional(),
  excerpt: z.string().optional(),
});

export const CitedItemSchema = z.object({
  text: z.string(),
  evidenceIds: z.array(z.string()).default([]),
});
