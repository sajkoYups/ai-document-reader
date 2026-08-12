export type TaskType = "summarize" | "explain" | "extract" | "draft" | "chat";

export type OutputLanguage = "en" | "de" | "fr" | "cs" | "mk";

export const OUTPUT_LANGUAGE_LABELS: Record<OutputLanguage, string> = {
  en: "English",
  de: "German",
  fr: "French",
  cs: "Czech",
  mk: "Macedonian",
};

export type ModelStatus =
  | "idle"
  | "downloading"
  | "loading"
  | "ready"
  | "error";

export type EmbeddingStatus =
  | "idle"
  | "loading-model"
  | "indexing"
  | "ready"
  | "error";

export interface DocumentSection {
  heading: string | null;
  content: string;
  index: number;
  /** Character offset in the document (set by parser for section-aware retrieval). */
  startChar?: number;
  endChar?: number;
}

export interface DocumentState {
  rawText: string;
  sections: DocumentSection[];
  fileName: string | null;
  fileType: string | null;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  evidence?: string[];
}
