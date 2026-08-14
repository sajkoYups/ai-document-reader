import { create } from "zustand";
import type { ChatMessage, EvidenceRef } from "@/types";
import type { ExtractType, EvidenceReference, WorkflowId } from "@/workflows/types";

export interface SessionWorkflowEntry {
  id: string;
  kind: "workflow";
  workflowId: WorkflowId;
  extractType?: ExtractType;
  result?: unknown;
  error?: string;
  evidenceById: Record<string, EvidenceReference>;
}

export interface SessionChatEntry {
  id: string;
  kind: "chat";
  role: "user" | "assistant";
  content: string;
  evidence?: string[];
  evidenceRefs?: EvidenceRef[];
}

export type SessionEntry = SessionWorkflowEntry | SessionChatEntry;

interface SessionStore {
  entries: SessionEntry[];
  isGenerating: boolean;

  appendWorkflow: (
    entry: Omit<SessionWorkflowEntry, "id" | "kind">,
  ) => void;
  addUserMessage: (content: string) => void;
  startAssistantMessage: () => void;
  appendToLastAssistant: (token: string) => void;
  finalizeAssistantMessage: (
    evidence?: string[],
    evidenceRefs?: EvidenceRef[],
  ) => void;
  setAssistantError: (error: string) => void;
  chatMessages: () => ChatMessage[];
  clear: () => void;
}

function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export const useSessionStore = create<SessionStore>((set, get) => ({
  entries: [],
  isGenerating: false,

  appendWorkflow: (entry) =>
    set((state) => ({
      entries: [
        ...state.entries,
        {
          id: newId(),
          kind: "workflow",
          ...entry,
        },
      ],
    })),

  addUserMessage: (content) =>
    set((state) => ({
      entries: [
        ...state.entries,
        { id: newId(), kind: "chat", role: "user", content },
      ],
    })),

  startAssistantMessage: () =>
    set((state) => ({
      isGenerating: true,
      entries: [
        ...state.entries,
        { id: newId(), kind: "chat", role: "assistant", content: "" },
      ],
    })),

  appendToLastAssistant: (token) =>
    set((state) => {
      const entries = [...state.entries];
      const last = entries[entries.length - 1];
      if (last && last.kind === "chat" && last.role === "assistant") {
        entries[entries.length - 1] = { ...last, content: last.content + token };
      }
      return { entries };
    }),

  finalizeAssistantMessage: (evidence, evidenceRefs) =>
    set((state) => {
      const entries = [...state.entries];
      const last = entries[entries.length - 1];
      if (last && last.kind === "chat" && last.role === "assistant") {
        entries[entries.length - 1] = { ...last, evidence, evidenceRefs };
      }
      return { entries, isGenerating: false };
    }),

  setAssistantError: (error) =>
    set((state) => {
      const entries = [...state.entries];
      const last = entries[entries.length - 1];
      if (last && last.kind === "chat" && last.role === "assistant") {
        entries[entries.length - 1] = { ...last, content: `Error: ${error}` };
      }
      return { entries, isGenerating: false };
    }),

  chatMessages: () =>
    get()
      .entries.filter((entry): entry is SessionChatEntry => entry.kind === "chat")
      .map(({ role, content, evidence, evidenceRefs }) => ({
        role,
        content,
        evidence,
        evidenceRefs,
      })),

  clear: () => set({ entries: [], isGenerating: false }),
}));
