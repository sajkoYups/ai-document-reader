import { create } from "zustand";
import type { DocumentSection, PageSpan } from "@/types";
import { parseIntoSections } from "@/lib/documentParser";
import {
  encryptText,
  decryptText,
  sanitizeEncryptedData,
  type EncryptedData,
} from "@/lib/cryptoService";

function newDocumentId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `doc-${Date.now()}`;
}

interface DocumentStore {
  rawText: string;
  sections: DocumentSection[];
  fileName: string | null;
  fileType: string | null;
  error: string | null;
  documentId: string;
  pageCount: number | null;
  pages: PageSpan[];

  _encrypted: EncryptedData | null;

  setText: (text: string) => void;
  setFromFile: (
    text: string,
    fileName: string,
    fileType: string,
    meta?: { pageCount?: number; pages?: PageSpan[] },
  ) => void;
  setError: (error: string | null) => void;
  getDecryptedText: () => Promise<string>;
  clear: () => void;
}

export const useDocumentStore = create<DocumentStore>((set, get) => ({
  rawText: "",
  sections: [],
  fileName: null,
  fileType: null,
  error: null,
  documentId: newDocumentId(),
  pageCount: null,
  pages: [],
  _encrypted: null,

  setText: (text) => {
    set({
      rawText: text,
      sections: parseIntoSections(text),
      fileName: null,
      fileType: null,
      error: null,
      documentId: newDocumentId(),
      pageCount: null,
      pages: [],
    });

    encryptText(text).then((encrypted) => {
      set({ _encrypted: encrypted });
    });
  },

  setFromFile: (text, fileName, fileType, meta) => {
    set({
      rawText: text,
      sections: parseIntoSections(text),
      fileName,
      fileType,
      error: null,
      documentId: newDocumentId(),
      pageCount: meta?.pageCount ?? null,
      pages: meta?.pages ?? [],
    });

    encryptText(text).then((encrypted) => {
      set({ _encrypted: encrypted });
    });
  },

  setError: (error) => set({ error }),

  getDecryptedText: async () => {
    const { _encrypted, rawText } = get();
    if (_encrypted) {
      try {
        return await decryptText(_encrypted);
      } catch {
        return rawText;
      }
    }
    return rawText;
  },

  clear: () => {
    const { _encrypted } = get();
    if (_encrypted) {
      sanitizeEncryptedData(_encrypted);
    }

    set({
      rawText: "",
      sections: [],
      fileName: null,
      fileType: null,
      error: null,
      documentId: newDocumentId(),
      pageCount: null,
      pages: [],
      _encrypted: null,
    });
  },
}));
