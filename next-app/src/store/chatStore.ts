import { create } from "zustand";
import type { ChatMessage, EvidenceRef } from "@/types";

interface ChatStore {
  messages: ChatMessage[];
  isGenerating: boolean;

  addUserMessage: (content: string) => void;
  startAssistantMessage: () => void;
  appendToLastAssistant: (token: string) => void;
  finalizeAssistantMessage: (evidence?: string[], evidenceRefs?: EvidenceRef[]) => void;
  setAssistantError: (error: string) => void;
  clear: () => void;
}

export const useChatStore = create<ChatStore>((set) => ({
  messages: [],
  isGenerating: false,

  addUserMessage: (content) =>
    set((state) => ({
      messages: [...state.messages, { role: "user", content }],
    })),

  startAssistantMessage: () =>
    set((state) => ({
      isGenerating: true,
      messages: [...state.messages, { role: "assistant", content: "" }],
    })),

  appendToLastAssistant: (token) =>
    set((state) => {
      const msgs = [...state.messages];
      const last = msgs[msgs.length - 1];
      if (last && last.role === "assistant") {
        msgs[msgs.length - 1] = { ...last, content: last.content + token };
      }
      return { messages: msgs };
    }),

  finalizeAssistantMessage: (evidence, evidenceRefs) =>
    set((state) => {
      const msgs = [...state.messages];
      const last = msgs[msgs.length - 1];
      if (last && last.role === "assistant") {
        msgs[msgs.length - 1] = { ...last, evidence, evidenceRefs };
      }
      return { messages: msgs, isGenerating: false };
    }),

  setAssistantError: (error) =>
    set((state) => {
      const msgs = [...state.messages];
      const last = msgs[msgs.length - 1];
      if (last && last.role === "assistant") {
        msgs[msgs.length - 1] = { ...last, content: `Error: ${error}` };
      }
      return { messages: msgs, isGenerating: false };
    }),

  clear: () => set({ messages: [], isGenerating: false }),
}));
