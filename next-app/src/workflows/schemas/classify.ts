import { z } from "zod";

export const DocumentTypeSchema = z.enum([
  "contract",
  "nda",
  "policy",
  "invoice",
  "financial_report",
  "research_paper",
  "cv",
  "meeting_notes",
  "rfp",
  "proposal",
  "technical_spec",
  "legal",
  "medical",
  "general",
  "unknown",
]);

export const DocumentClassificationSchema = z.object({
  type: DocumentTypeSchema,
  label: z.string(),
  recommendedWorkflowIds: z.array(z.string()).default([]),
});

export type DocumentClassification = z.infer<typeof DocumentClassificationSchema>;
