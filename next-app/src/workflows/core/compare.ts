import type { WorkflowDefinition } from "../types";

export const compareWorkflow: WorkflowDefinition = {
  id: "compare",
  nameKey: "workflow.compare.name",
  shortDescriptionKey: "workflow.compare.description",
  icon: "⇄",
  category: "core",
  status: "ready",
  supportedDocumentTypes: ["unknown"],
  recommendedDocumentTypes: ["contract", "policy", "proposal", "research_paper"],
  minDocuments: 2,
  maxDocuments: 2,
  localSupported: false,
  analysisMode: "deep_required",
  resultRenderer: "comparison",
  suggestedFollowUpKeys: [],
  tags: ["compare", "diff", "versions", "changes"],
};
