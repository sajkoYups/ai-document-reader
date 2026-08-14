import { create } from "zustand";
import type { DocumentSection, PageSpan } from "@/types";
import { parseIntoSections } from "@/lib/documentParser";

export const MAX_SESSION_DOCUMENTS = 3;

function newDocumentId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `doc-${Date.now()}`;
}

export interface SessionDocument {
  id: string;
  rawText: string;
  sections: DocumentSection[];
  fileName: string | null;
  fileType: string | null;
  pageCount: number | null;
  pages: PageSpan[];
}

export interface CompareRoles {
  a: string | null;
  b: string | null;
}

interface DocumentStore {
  documents: SessionDocument[];
  activeDocumentId: string | null;
  compareRoles: CompareRoles;
  error: string | null;

  /** Active document helpers (Phase 1 call-site compatibility). */
  rawText: string;
  sections: DocumentSection[];
  fileName: string | null;
  fileType: string | null;
  documentId: string;
  pageCount: number | null;
  pages: PageSpan[];

  getActive: () => SessionDocument | null;
  getById: (id: string) => SessionDocument | null;

  setText: (text: string) => void;
  setFromFile: (
    text: string,
    fileName: string,
    fileType: string,
    meta?: { pageCount?: number; pages?: PageSpan[] },
  ) => void;
  addFromFile: (
    text: string,
    fileName: string,
    fileType: string,
    meta?: { pageCount?: number; pages?: PageSpan[] },
  ) => { ok: true; id: string } | { ok: false; error: string };
  replaceDocument: (
    id: string,
    text: string,
    fileName: string,
    fileType: string,
    meta?: { pageCount?: number; pages?: PageSpan[] },
  ) => void;
  setActive: (id: string) => void;
  removeDocument: (id: string) => void;
  setCompareRoles: (roles: Partial<CompareRoles>) => void;
  ensureCompareRoles: () => void;
  setError: (error: string | null) => void;
  clear: () => void;
}

function emptyActiveFields() {
  return {
    rawText: "",
    sections: [] as DocumentSection[],
    fileName: null as string | null,
    fileType: null as string | null,
    documentId: newDocumentId(),
    pageCount: null as number | null,
    pages: [] as PageSpan[],
  };
}

function activeFieldsFrom(doc: SessionDocument | null | undefined) {
  if (!doc) return emptyActiveFields();
  return {
    rawText: doc.rawText,
    sections: doc.sections,
    fileName: doc.fileName,
    fileType: doc.fileType,
    documentId: doc.id,
    pageCount: doc.pageCount,
    pages: doc.pages,
  };
}

function makeSessionDoc(
  text: string,
  fileName: string | null,
  fileType: string | null,
  meta?: { pageCount?: number; pages?: PageSpan[] },
): SessionDocument {
  return {
    id: newDocumentId(),
    rawText: text,
    sections: parseIntoSections(text),
    fileName,
    fileType,
    pageCount: meta?.pageCount ?? null,
    pages: meta?.pages ?? [],
  };
}

export const useDocumentStore = create<DocumentStore>((set, get) => ({
  documents: [],
  activeDocumentId: null,
  compareRoles: { a: null, b: null },
  error: null,
  ...emptyActiveFields(),

  getActive: () => {
    const { documents, activeDocumentId } = get();
    if (!activeDocumentId) return null;
    return documents.find((d) => d.id === activeDocumentId) ?? null;
  },

  getById: (id) => get().documents.find((d) => d.id === id) ?? null,

  setText: (text) => {
    const doc = makeSessionDoc(text, null, null);
    set({
      documents: [doc],
      activeDocumentId: doc.id,
      compareRoles: { a: doc.id, b: null },
      error: null,
      ...activeFieldsFrom(doc),
    });
  },

  setFromFile: (text, fileName, fileType, meta) => {
    const doc = makeSessionDoc(text, fileName, fileType, meta);
    set({
      documents: [doc],
      activeDocumentId: doc.id,
      compareRoles: { a: doc.id, b: null },
      error: null,
      ...activeFieldsFrom(doc),
    });
  },

  addFromFile: (text, fileName, fileType, meta) => {
    const { documents } = get();
    if (documents.length >= MAX_SESSION_DOCUMENTS) {
      return { ok: false, error: `You can add up to ${MAX_SESSION_DOCUMENTS} documents in a session.` };
    }
    const doc = makeSessionDoc(text, fileName, fileType, meta);
    const nextDocs = [...documents, doc];
    const compareRoles = { ...get().compareRoles };
    if (!compareRoles.a) compareRoles.a = doc.id;
    else if (!compareRoles.b && compareRoles.a !== doc.id) compareRoles.b = doc.id;

    set({
      documents: nextDocs,
      activeDocumentId: doc.id,
      compareRoles,
      error: null,
      ...activeFieldsFrom(doc),
    });
    return { ok: true, id: doc.id };
  },

  replaceDocument: (id, text, fileName, fileType, meta) => {
    const { documents, activeDocumentId } = get();
    const next = makeSessionDoc(text, fileName, fileType, meta);
    // Keep the same id so embeddings/compare roles stay stable.
    next.id = id;
    const nextDocs = documents.map((d) => (d.id === id ? next : d));
    const active = nextDocs.find((d) => d.id === (activeDocumentId === id ? id : activeDocumentId)) ?? next;
    set({
      documents: nextDocs,
      activeDocumentId: active.id,
      error: null,
      ...activeFieldsFrom(active),
    });
  },

  setActive: (id) => {
    const doc = get().documents.find((d) => d.id === id);
    if (!doc) return;
    set({
      activeDocumentId: id,
      ...activeFieldsFrom(doc),
    });
  },

  removeDocument: (id) => {
    const { documents, activeDocumentId, compareRoles } = get();
    const nextDocs = documents.filter((d) => d.id !== id);
    const nextActiveId =
      activeDocumentId === id
        ? (nextDocs[nextDocs.length - 1]?.id ?? null)
        : activeDocumentId;
    const nextActive = nextDocs.find((d) => d.id === nextActiveId) ?? null;
    const nextRoles: CompareRoles = {
      a: compareRoles.a === id ? null : compareRoles.a,
      b: compareRoles.b === id ? null : compareRoles.b,
    };
    if (!nextRoles.a && nextDocs[0]) nextRoles.a = nextDocs[0].id;
    if (!nextRoles.b && nextDocs[1] && nextDocs[1].id !== nextRoles.a) {
      nextRoles.b = nextDocs[1].id;
    }

    set({
      documents: nextDocs,
      activeDocumentId: nextActiveId,
      compareRoles: nextRoles,
      ...activeFieldsFrom(nextActive),
    });
  },

  setCompareRoles: (roles) =>
    set((state) => ({
      compareRoles: { ...state.compareRoles, ...roles },
    })),

  ensureCompareRoles: () => {
    const { documents, compareRoles } = get();
    if (documents.length < 2) return;
    let a = compareRoles.a && documents.some((d) => d.id === compareRoles.a)
      ? compareRoles.a
      : documents[0]!.id;
    let b = compareRoles.b && documents.some((d) => d.id === compareRoles.b) && compareRoles.b !== a
      ? compareRoles.b
      : (documents.find((d) => d.id !== a)?.id ?? null);
    if (a === b) b = documents.find((d) => d.id !== a)?.id ?? null;
    set({ compareRoles: { a, b } });
  },

  setError: (error) => set({ error }),

  clear: () => {
    set({
      documents: [],
      activeDocumentId: null,
      compareRoles: { a: null, b: null },
      error: null,
      ...emptyActiveFields(),
    });
  },
}));
