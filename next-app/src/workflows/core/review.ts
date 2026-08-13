import type { WorkflowDefinition } from "../types";

export const reviewWorkflow: WorkflowDefinition = {
  id: "review",
  nameKey: "workflow.review.name",
  shortDescriptionKey: "workflow.review.description",
  icon: "◇",
  category: "core",
  status: "ready",
  supportedDocumentTypes: ["unknown"],
  recommendedDocumentTypes: [
    "contract",
    "nda",
    "policy",
    "legal",
    "financial_report",
    "research_paper",
  ],
  minDocuments: 1,
  localSupported: false,
  analysisMode: "deep_recommended",
  resultRenderer: "review",
  suggestedFollowUpKeys: [
    "followup.explainHighest",
    "followup.termination",
    "followup.payment",
    "followup.liability",
  ],
  tags: ["review", "issues", "attention", "risks", "gaps"],
};
