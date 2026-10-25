export type TaskType =
  | "summarize"
  | "explain"
  | "extract"
  | "draft"
  | "chat"
  | "review"
  | "compare"
  | "timeline"
  | "contradictions"
  | "missing-information"
  | "evidence-finder"
  | "action-items"
  | "document-map";

export type OutputLanguage = "en" | "de" | "fr" | "cs" | "mk";

export type LlmProvider = "ollama" | "runpod" | "openrouter";

export interface StreamCompletionMeta {
  finishReason?: string | null;
  usage?: Record<string, unknown> | null;
  sawReasoning?: boolean;
  generationId?: string | null;
  model?: string | null;
}

export interface InferenceOptions {
  jsonMode?: boolean;
  extractType?: string;
  customQuery?: string;
  streamMeta?: StreamCompletionMeta;
}

export interface AnalyzeRequest {
  taskType: TaskType;
  documentText: string;
  outputLanguage?: OutputLanguage;
  workflowId?: string;
  jsonMode?: boolean;
  workflowParams?: {
    extractType?: string;
    customQuery?: string;
  };
}

export interface ChatRequest {
  documentText: string;
  message: string;
  conversationHistory: Array<{ role: "user" | "assistant"; content: string }>;
  outputLanguage?: OutputLanguage;
}

export interface EncryptedPayload {
  sessionId: string;
  iv: string;
  ciphertext: string;
}

export interface SessionInitRequest {
  clientPublicKey: JsonWebKey;
}

export interface SessionInitResponse {
  sessionId: string;
  serverPublicKey: JsonWebKey;
}

export interface SessionEntry {
  aesKey: Buffer;
  createdAt: number;
  userId: string;
}

export function resolveTaskType(
  workflowId: string | undefined,
  taskType: TaskType,
): TaskType {
  if (!workflowId) return taskType;
  if (workflowId === "ask") return "chat";
  const known: TaskType[] = [
    "summarize",
    "review",
    "extract",
    "compare",
    "timeline",
    "contradictions",
    "missing-information",
    "evidence-finder",
    "action-items",
    "document-map",
    "chat",
    "explain",
    "draft",
  ];
  if (known.includes(workflowId as TaskType)) return workflowId as TaskType;
  return taskType;
}

export function taskUsesJsonMode(taskType: TaskType, jsonMode?: boolean): boolean {
  if (jsonMode === false) return false;
  if (jsonMode === true) return true;
  return (
    taskType === "summarize" ||
    taskType === "review" ||
    taskType === "extract" ||
    taskType === "compare" ||
    taskType === "timeline" ||
    taskType === "contradictions" ||
    taskType === "missing-information" ||
    taskType === "evidence-finder" ||
    taskType === "action-items" ||
    taskType === "document-map"
  );
}
