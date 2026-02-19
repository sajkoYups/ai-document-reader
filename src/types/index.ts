export type TaskType = "summarize" | "explain" | "extract" | "draft" | "chat";

export type ModelStatus =
  | "idle"
  | "downloading"
  | "loading"
  | "ready"
  | "error";

export interface DocumentSection {
  heading: string | null;
  content: string;
  index: number;
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
