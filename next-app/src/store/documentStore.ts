import { create } from "zustand";
import type { DocumentSection } from "@/types";
import { parseIntoSections } from "@/lib/documentParser";
import {
  encryptText,
  decryptText,
  sanitizeEncryptedData,
  type EncryptedData,
} from "@/lib/cryptoService";

interface DocumentStore {
  rawText: string;
  sections: DocumentSection[];
  fileName: string | null;
  fileType: string | null;
  error: string | null;

  _encrypted: EncryptedData | null;

  setText: (text: string) => void;
  setFromFile: (text: string, fileName: string, fileType: string) => void;
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
  _encrypted: null,

  setText: (text) => {
    set({
      rawText: text,
      sections: parseIntoSections(text),
      fileName: null,
      fileType: null,
      error: null,
    });

    encryptText(text).then((encrypted) => {
      set({ _encrypted: encrypted });
    });
  },

  setFromFile: (text, fileName, fileType) => {
    set({
      rawText: text,
      sections: parseIntoSections(text),
      fileName,
      fileType,
      error: null,
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
      _encrypted: null,
    });
  },
}));
