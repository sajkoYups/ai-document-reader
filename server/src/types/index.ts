export type TaskType = "summarize" | "explain" | "extract" | "draft" | "chat";

export type OutputLanguage = "en" | "de" | "fr" | "cs";

export interface AnalyzeRequest {
  taskType: TaskType;
  documentText: string;
  outputLanguage?: OutputLanguage;
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
