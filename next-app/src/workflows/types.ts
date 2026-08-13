import type { OutputLanguage } from "@/types";

export type WorkflowId =
  | "summarize"
  | "review"
  | "extract"
  | "compare"
  | "timeline"
  | "ask"
  | "contradictions"
  | "missing-information"
  | "evidence-finder"
  | "action-items"
  | "document-map"
  | "contract-review"
  | "nda-review"
  | "employment-review";

export type ExtractType =
  | "key-information"
  | "dates"
  | "entities"
  | "amounts"
  | "obligations"
  | "requirements"
  | "contacts"
  | "custom";

export type WorkflowCategory =
  | "core"
  | "document"
  | "legal"
  | "research"
  | "compliance"
  | "finance"
  | "hr";

export type WorkflowStatus = "ready" | "coming_soon";

export type AnalysisMode =
  | "quick_supported"
  | "deep_recommended"
  | "deep_required";

export type ResultRenderer =
  | "summary"
  | "review"
  | "comparison"
  | "table"
  | "timeline"
  | "evidence"
  | "chat"
  | "custom";

export type DocumentTypeId =
  | "contract"
  | "nda"
  | "policy"
  | "invoice"
  | "financial_report"
  | "research_paper"
  | "cv"
  | "meeting_notes"
  | "rfp"
  | "proposal"
  | "technical_spec"
  | "legal"
  | "medical"
  | "general"
  | "unknown";

export type ConfidenceLevel = "low" | "medium" | "high";

export type AttentionLevel = "low_attention" | "medium_attention" | "high_attention";

export type ImportanceLevel = "low" | "medium" | "high";

export interface EvidenceReference {
  documentId: string;
  documentName: string;
  page?: number;
  section?: string;
  excerpt?: string;
}

export interface PageSpan {
  pageNumber: number;
  startChar: number;
  endChar: number;
}

export interface WorkflowDefinition {
  id: WorkflowId;
  nameKey: string;
  shortDescriptionKey: string;
  icon: string;
  category: WorkflowCategory;
  status: WorkflowStatus;
  supportedDocumentTypes: DocumentTypeId[];
  recommendedDocumentTypes: DocumentTypeId[];
  minDocuments: number;
  maxDocuments?: number;
  localSupported: boolean;
  analysisMode: AnalysisMode;
  resultRenderer: ResultRenderer;
  suggestedFollowUpKeys: string[];
  tags: string[];
  extractTypes?: ExtractType[];
}

export interface WorkflowCopyContext {
  language: OutputLanguage;
}

export const EXTRACT_TYPE_KEYS: Record<ExtractType, { nameKey: string; descriptionKey: string }> = {
  "key-information": {
    nameKey: "extract.type.keyInformation.name",
    descriptionKey: "extract.type.keyInformation.description",
  },
  dates: {
    nameKey: "extract.type.dates.name",
    descriptionKey: "extract.type.dates.description",
  },
  entities: {
    nameKey: "extract.type.entities.name",
    descriptionKey: "extract.type.entities.description",
  },
  amounts: {
    nameKey: "extract.type.amounts.name",
    descriptionKey: "extract.type.amounts.description",
  },
  obligations: {
    nameKey: "extract.type.obligations.name",
    descriptionKey: "extract.type.obligations.description",
  },
  requirements: {
    nameKey: "extract.type.requirements.name",
    descriptionKey: "extract.type.requirements.description",
  },
  contacts: {
    nameKey: "extract.type.contacts.name",
    descriptionKey: "extract.type.contacts.description",
  },
  custom: {
    nameKey: "extract.type.custom.name",
    descriptionKey: "extract.type.custom.description",
  },
};

export const PRIMARY_WORKFLOW_IDS: WorkflowId[] = [
  "summarize",
  "review",
  "extract",
  "compare",
  "timeline",
  "ask",
];

export function isJsonWorkflow(id: WorkflowId): boolean {
  return id === "summarize" || id === "review" || id === "extract";
}

export function workflowToTaskType(id: WorkflowId): string {
  if (id === "ask") return "chat";
  return id;
}
