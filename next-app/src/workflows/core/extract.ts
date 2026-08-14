import type { WorkflowDefinition } from "../types";

export const extractWorkflow: WorkflowDefinition = {
  id: "extract",
  nameKey: "workflow.extract.name",
  shortDescriptionKey: "workflow.extract.description",
  icon: "⊡",
  category: "core",
  status: "ready",
  supportedDocumentTypes: ["unknown"],
  recommendedDocumentTypes: [
    "contract",
    "invoice",
    "rfp",
    "policy",
    "meeting_notes",
  ],
  minDocuments: 1,
  localSupported: false,
  analysisMode: "deep_recommended",
  resultRenderer: "table",
  suggestedFollowUpKeys: [
    "followup.payment",
    "followup.keyDates",
    "followup.parties",
  ],
  tags: ["extract", "dates", "people", "amounts", "obligations", "requirements"],
  extractTypes: [
    "key-information",
    "dates",
    "entities",
    "amounts",
    "obligations",
    "requirements",
    "contacts",
    "custom",
  ],
};
