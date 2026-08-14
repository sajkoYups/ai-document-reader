import { create } from "zustand";
import type { EmbeddingStatus } from "@/types";
import type { DocumentSection } from "@/types";
import type { DocumentChunk } from "@/lib/documentChunker";
import {
  chunkDocument,
  retrieveRelevantChunks,
  retrieveRelevantChunkIndices,
} from "@/lib/documentChunker";
import {
  fuseByRRF,
  HYBRID_CANDIDATE_MULTIPLIER,
  USE_MMR_FOR_CHAT,
  MMR_LAMBDA,
} from "@/lib/retrieval";
import { findTopK, findTopKWithMMR } from "@/lib/vectorStore";
import {
  EMBEDDING_MODEL,
  type EmbeddingWorkerMessageFromWorker,
} from "@/lib/modelManager";

interface DocIndex {
  chunks: DocumentChunk[];
  chunkEmbeddings: number[][];
  totalDocChars: number;
  status: EmbeddingStatus;
}

interface EmbeddingStore {
  status: EmbeddingStatus;
  downloadProgress: number;
  error: string | null;
  /** Flattened active-doc (or all-doc) view for Phase 1 call sites. */
  chunks: DocumentChunk[];
  chunkEmbeddings: number[][];
  totalDocChars: number;
  indexes: Record<string, DocIndex>;
  activeDocumentId: string | null;
  worker: Worker | null;

  initWorker: () => void;
  indexDocument: (
    rawText: string,
    meta?: { documentId?: string; documentName?: string },
  ) => void;
  setActiveDocument: (documentId: string | null) => void;
  removeDocument: (documentId: string) => void;
  retrieveChunks: (
    query: string,
    topK: number,
    documentIds?: string[],
  ) => Promise<DocumentChunk[]>;
  retrieveChunksHybrid: (
    query: string,
    topK: number,
    options?: { useMMR?: boolean; documentIds?: string[] },
  ) => Promise<DocumentChunk[]>;
  getSpreadChunks: (
    maxChars: number,
    sections?: DocumentSection[],
    documentId?: string,
  ) => DocumentChunk[];
  getSpreadChunksForDocs: (
    maxChars: number,
    docs: Array<{ id: string; sections: DocumentSection[] }>,
  ) => DocumentChunk[];
  clear: () => void;
}

function syncActiveView(
  indexes: Record<string, DocIndex>,
  activeDocumentId: string | null,
): Pick<EmbeddingStore, "chunks" | "chunkEmbeddings" | "totalDocChars" | "status"> {
  if (activeDocumentId && indexes[activeDocumentId]) {
    const idx = indexes[activeDocumentId]!;
    return {
      chunks: idx.chunks,
      chunkEmbeddings: idx.chunkEmbeddings,
      totalDocChars: idx.totalDocChars,
      status: idx.status,
    };
  }
  const allChunks = Object.values(indexes).flatMap((i) => i.chunks);
  const allEmb = Object.values(indexes).flatMap((i) => i.chunkEmbeddings);
  const statuses = Object.values(indexes).map((i) => i.status);
  let status: EmbeddingStatus = "idle";
  if (statuses.includes("error")) status = "error";
  else if (statuses.includes("loading-model")) status = "loading-model";
  else if (statuses.includes("indexing")) status = "indexing";
  else if (statuses.includes("ready")) status = "ready";
  return {
    chunks: allChunks,
    chunkEmbeddings: allEmb,
    totalDocChars: Object.values(indexes).reduce((s, i) => s + i.totalDocChars, 0),
    status,
  };
}

function collectCorpus(
  indexes: Record<string, DocIndex>,
  documentIds?: string[],
): { chunks: DocumentChunk[]; chunkEmbeddings: number[][] } {
  const ids = documentIds?.length
    ? documentIds
    : Object.keys(indexes);
  const chunks: DocumentChunk[] = [];
  const chunkEmbeddings: number[][] = [];
  for (const id of ids) {
    const idx = indexes[id];
    if (!idx) continue;
    for (let i = 0; i < idx.chunks.length; i++) {
      chunks.push(idx.chunks[i]!);
      if (idx.chunkEmbeddings[i]) chunkEmbeddings.push(idx.chunkEmbeddings[i]!);
    }
  }
  return { chunks, chunkEmbeddings };
}

export const useEmbeddingStore = create<EmbeddingStore>((set, get) => ({
  status: "idle",
  downloadProgress: 0,
  error: null,
  chunks: [],
  chunkEmbeddings: [],
  totalDocChars: 0,
  indexes: {},
  activeDocumentId: null,
  worker: null,

  initWorker: () => {
    if (get().worker) return;
    const worker = new Worker(
      new URL("../workers/embeddingWorker.ts", import.meta.url),
      { type: "module" },
    );
    set({ worker });
  },

  setActiveDocument: (documentId) => {
    const { indexes } = get();
    set({
      activeDocumentId: documentId,
      ...syncActiveView(indexes, documentId),
    });
  },

  removeDocument: (documentId) => {
    const indexes = { ...get().indexes };
    delete indexes[documentId];
    const activeDocumentId =
      get().activeDocumentId === documentId ? null : get().activeDocumentId;
    set({
      indexes,
      activeDocumentId,
      ...syncActiveView(indexes, activeDocumentId),
    });
  },

  indexDocument: (rawText, meta) => {
    let { worker } = get();
    if (!worker) {
      get().initWorker();
      worker = get().worker;
    }
    if (!worker) return;

    const documentId = meta?.documentId ?? "default";
    const chunks = chunkDocument(rawText, {
      documentId,
      documentName: meta?.documentName,
    });
    const indexes = {
      ...get().indexes,
      [documentId]: {
        chunks,
        chunkEmbeddings: [],
        totalDocChars: rawText.length,
        status: "loading-model" as EmbeddingStatus,
      },
    };
    const activeDocumentId = documentId;
    set({
      indexes,
      activeDocumentId,
      downloadProgress: 0,
      error: null,
      ...syncActiveView(indexes, activeDocumentId),
    });

    const handleMessage = (e: MessageEvent<EmbeddingWorkerMessageFromWorker>) => {
      const msg = e.data;
      switch (msg.type) {
        case "progress": {
          const { status, progress } = msg.data;
          if (status === "download" || status === "progress") {
            set({ status: "loading-model", downloadProgress: progress ?? 0 });
          }
          break;
        }
        case "model-loaded": {
          const current = get().indexes[documentId];
          if (!current) return;
          const nextIndexes = {
            ...get().indexes,
            [documentId]: { ...current, status: "indexing" as EmbeddingStatus },
          };
          set({
            indexes: nextIndexes,
            downloadProgress: 100,
            ...syncActiveView(nextIndexes, get().activeDocumentId),
          });
          worker!.postMessage({
            type: "embed-chunks",
            texts: chunks.map((c) => c.text),
          });
          break;
        }
        case "model-error":
          set({ status: "error", error: msg.error });
          worker!.removeEventListener("message", handleMessage);
          break;
        case "chunks-embedded": {
          const current = get().indexes[documentId];
          if (!current) {
            worker!.removeEventListener("message", handleMessage);
            return;
          }
          const nextIndexes = {
            ...get().indexes,
            [documentId]: {
              ...current,
              chunkEmbeddings: msg.embeddings,
              status: "ready" as EmbeddingStatus,
            },
          };
          set({
            indexes: nextIndexes,
            ...syncActiveView(nextIndexes, get().activeDocumentId),
          });
          worker!.removeEventListener("message", handleMessage);
          break;
        }
        case "embed-error":
          set({ status: "error", error: msg.error });
          worker!.removeEventListener("message", handleMessage);
          break;
      }
    };

    worker.addEventListener("message", handleMessage);
    worker.postMessage({ type: "load-model", config: EMBEDDING_MODEL });
  },

  retrieveChunks: (query, topK, documentIds) => {
    const { worker, indexes } = get();
    const { chunks, chunkEmbeddings } = collectCorpus(indexes, documentIds);

    if (!worker || chunkEmbeddings.length === 0) {
      const maxChars = topK * 2000;
      return Promise.resolve(retrieveRelevantChunks(chunks, query, maxChars));
    }

    return new Promise((resolve, reject) => {
      const handleMessage = (e: MessageEvent<EmbeddingWorkerMessageFromWorker>) => {
        const msg = e.data;
        if (msg.type === "query-embedded") {
          worker.removeEventListener("message", handleMessage);
          const indices = findTopK(msg.embedding, chunkEmbeddings, topK);
          const sorted = indices.sort((a, b) => a - b);
          resolve(sorted.map((i) => chunks[i]!));
        } else if (msg.type === "embed-error") {
          worker.removeEventListener("message", handleMessage);
          reject(new Error(msg.error));
        }
      };
      worker.addEventListener("message", handleMessage);
      worker.postMessage({ type: "embed-query", text: query });
    });
  },

  retrieveChunksHybrid: (query, topK, options) => {
    const { worker, indexes } = get();
    const { chunks, chunkEmbeddings } = collectCorpus(indexes, options?.documentIds);

    if (!worker || chunkEmbeddings.length === 0) {
      const maxChars = topK * 2000;
      return Promise.resolve(retrieveRelevantChunks(chunks, query, maxChars));
    }

    const candidateK = Math.min(HYBRID_CANDIDATE_MULTIPLIER * topK, chunks.length);
    const keywordMaxChars = candidateK * 2000;

    return new Promise((resolve, reject) => {
      const handleMessage = (e: MessageEvent<EmbeddingWorkerMessageFromWorker>) => {
        const msg = e.data;
        if (msg.type === "query-embedded") {
          worker.removeEventListener("message", handleMessage);
          const denseIndices = findTopK(msg.embedding, chunkEmbeddings, candidateK);
          const sparseIndices = retrieveRelevantChunkIndices(chunks, query, keywordMaxChars);
          const fusedCandidates = fuseByRRF(denseIndices, sparseIndices, candidateK);
          const finalIndices = (options?.useMMR ?? USE_MMR_FOR_CHAT)
            ? findTopKWithMMR(
                msg.embedding,
                chunkEmbeddings,
                fusedCandidates,
                topK,
                MMR_LAMBDA,
              )
            : fusedCandidates.slice(0, topK).sort((a, b) => a - b);
          resolve(finalIndices.map((i) => chunks[i]!));
        } else if (msg.type === "embed-error") {
          worker.removeEventListener("message", handleMessage);
          reject(new Error(msg.error));
        }
      };
      worker.addEventListener("message", handleMessage);
      worker.postMessage({ type: "embed-query", text: query });
    });
  },

  getSpreadChunks: (maxChars, sections, documentId) => {
    const { indexes, activeDocumentId } = get();
    const id = documentId ?? activeDocumentId;
    const chunks = id && indexes[id] ? indexes[id]!.chunks : get().chunks;
    if (chunks.length === 0) return [];

    const totalChars = chunks.reduce((sum, c) => sum + c.text.length, 0);
    if (totalChars <= maxChars) return chunks;

    const selectedIndices = new Set<number>();

    if (sections?.length && sections.some((s) => s.startChar != null && s.endChar != null)) {
      for (const section of sections) {
        const start = section.startChar ?? 0;
        const end = section.endChar ?? 0;
        if (end <= start) continue;
        let best: DocumentChunk | null = null;
        let bestOverlap = 0;
        for (const chunk of chunks) {
          const overlapStart = Math.max(chunk.startChar, start);
          const overlapEnd = Math.min(chunk.endChar, end);
          if (overlapStart < overlapEnd) {
            const overlap = overlapEnd - overlapStart;
            if (overlap > bestOverlap) {
              bestOverlap = overlap;
              best = chunk;
            }
          }
        }
        if (best) selectedIndices.add(best.index);
      }
    }

    selectedIndices.add(chunks[0]!.index);
    if (chunks.length > 1) selectedIndices.add(chunks[chunks.length - 1]!.index);

    const selected: DocumentChunk[] = [...selectedIndices].map(
      (idx) => chunks.find((c) => c.index === idx)!,
    ).filter(Boolean);
    let budget = maxChars - selected.reduce((sum, c) => sum + c.text.length, 0);

    if (budget > 0 && chunks.length > 2) {
      const middle = chunks.slice(1, -1).filter((c) => !selectedIndices.has(c.index));
      const step = Math.max(1, Math.floor(middle.length / Math.ceil(budget / 1500)));
      for (let i = 0; i < middle.length && budget > 0; i += step) {
        const chunk = middle[i]!;
        if (chunk.text.length <= budget) {
          selected.push(chunk);
          budget -= chunk.text.length;
        }
      }
    }

    selected.sort((a, b) => a.index - b.index);
    return selected;
  },

  getSpreadChunksForDocs: (maxChars, docs) => {
    if (docs.length === 0) return [];
    const perDoc = Math.max(1500, Math.floor(maxChars / docs.length));
    const out: DocumentChunk[] = [];
    for (const doc of docs) {
      out.push(...get().getSpreadChunks(perDoc, doc.sections, doc.id));
    }
    return out;
  },

  clear: () => {
    set({
      status: "idle",
      downloadProgress: 0,
      error: null,
      chunks: [],
      chunkEmbeddings: [],
      totalDocChars: 0,
      indexes: {},
      activeDocumentId: null,
    });
  },
}));
