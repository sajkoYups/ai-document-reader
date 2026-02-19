import { create } from "zustand";
import type { DocumentSection } from "@/types";
import { parseIntoSections } from "@/lib/documentParser";

interface DocumentStore {
  rawText: string;
  sections: DocumentSection[];
  fileName: string | null;
  fileType: string | null;
  error: string | null;

  setText: (text: string) => void;
  setFromFile: (text: string, fileName: string, fileType: string) => void;
  setError: (error: string | null) => void;
  clear: () => void;
}

export const useDocumentStore = create<DocumentStore>((set) => ({
  rawText: "",
  sections: [],
  fileName: null,
  fileType: null,
  error: null,

  setText: (text) =>
    set({
      rawText: text,
      sections: parseIntoSections(text),
      fileName: null,
      fileType: null,
      error: null,
    }),

  setFromFile: (text, fileName, fileType) =>
    set({
      rawText: text,
      sections: parseIntoSections(text),
      fileName,
      fileType,
      error: null,
    }),

  setError: (error) => set({ error }),

  clear: () =>
    set({
      rawText: "",
      sections: [],
      fileName: null,
      fileType: null,
      error: null,
    }),
}));
