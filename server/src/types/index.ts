export type TaskType = "summarize" | "explain" | "extract" | "draft" | "chat" | "review";

export type OutputLanguage = "en" | "de" | "fr" | "cs" | "mk";

export type LlmProvider = "ollama" | "runpod" | "openrouter";

export interface StreamCompletionMeta {
  finishReason?: string | null;
  usage?: Record<string, unknown> | null;
  sawReasoning?: boolean;
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
}

export function resolveTaskType(
  workflowId: string | undefined,
  taskType: TaskType,
): TaskType {
  if (workflowId === "ask") return "chat";
  if (workflowId === "review") return "review";
  if (workflowId === "extract") return "extract";
  if (workflowId === "summarize") return "summarize";
  return taskType;
}

export function taskUsesJsonMode(taskType: TaskType, jsonMode?: boolean): boolean {
  if (jsonMode === false) return false;
  return taskType === "summarize" || taskType === "review" || taskType === "extract";
}
