import type { WorkflowDefinition } from "../types";

export const summarizeWorkflow: WorkflowDefinition = {
  id: "summarize",
  nameKey: "workflow.summarize.name",
  shortDescriptionKey: "workflow.summarize.description",
  icon: "⊞",
  category: "core",
  status: "ready",
  supportedDocumentTypes: ["unknown"],
  recommendedDocumentTypes: ["general", "contract", "policy", "research_paper", "financial_report"],
  minDocuments: 1,
  localSupported: true,
  analysisMode: "quick_supported",
  resultRenderer: "summary",
  suggestedFollowUpKeys: [
    "followup.keyDates",
    "followup.parties",
    "followup.explainHighest",
  ],
  tags: ["summary", "overview", "key points"],
};
