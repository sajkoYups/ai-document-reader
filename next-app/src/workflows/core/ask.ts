import type { WorkflowDefinition } from "../types";

export const askWorkflow: WorkflowDefinition = {
  id: "ask",
  nameKey: "workflow.ask.name",
  shortDescriptionKey: "workflow.ask.description",
  icon: "◌",
  category: "core",
  status: "ready",
  supportedDocumentTypes: ["unknown"],
  recommendedDocumentTypes: ["unknown"],
  minDocuments: 1,
  localSupported: true,
  analysisMode: "quick_supported",
  resultRenderer: "chat",
  suggestedFollowUpKeys: [],
  tags: ["ask", "chat", "questions", "qa"],
};
