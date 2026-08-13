import type { WorkflowDefinition } from "../types";

export const timelineWorkflow: WorkflowDefinition = {
  id: "timeline",
  nameKey: "workflow.timeline.name",
  shortDescriptionKey: "workflow.timeline.description",
  icon: "↕",
  category: "core",
  status: "ready",
  supportedDocumentTypes: ["unknown"],
  recommendedDocumentTypes: ["legal", "medical", "contract", "meeting_notes"],
  minDocuments: 1,
  maxDocuments: 3,
  localSupported: false,
  analysisMode: "deep_recommended",
  resultRenderer: "timeline",
  suggestedFollowUpKeys: ["followup.keyDates"],
  tags: ["timeline", "dates", "events", "chronology"],
};
