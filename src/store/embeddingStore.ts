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

interface EmbeddingStore {
  status: EmbeddingStatus;
  downloadProgress: number;
  error: string | null;
  chunks: DocumentChunk[];
  chunkEmbeddings: number[][];
  totalDocChars: number;
  worker: Worker | null;

  initWorker: () => void;
  indexDocument: (rawText: string) => void;
  retrieveChunks: (query: string, topK: number) => Promise<DocumentChunk[]>;
  retrieveChunksHybrid: (
    query: string,
    topK: number,
    options?: { useMMR?: boolean },
  ) => Promise<DocumentChunk[]>;
  getSpreadChunks: (maxChars: number, sections?: DocumentSection[]) => DocumentChunk[];
  clear: () => void;
}

export const useEmbeddingStore = create<EmbeddingStore>((set, get) => ({
  status: "idle",
  downloadProgress: 0,
  error: null,
  chunks: [],
  chunkEmbeddings: [],
  totalDocChars: 0,
  worker: null,

  initWorker: () => {
    if (get().worker) return;

    const worker = new Worker(
      new URL("../workers/embeddingWorker.ts", import.meta.url),
      { type: "module" },
    );

    set({ worker });
  },

  indexDocument: (rawText: string) => {
    let { worker } = get();
    if (!worker) {
      get().initWorker();
      worker = get().worker;
    }
    if (!worker) return;

    const chunks = chunkDocument(rawText);
    set({ chunks, chunkEmbeddings: [], totalDocChars: rawText.length, status: "loading-model", downloadProgress: 0, error: null });

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
        case "model-loaded":
          set({ status: "indexing", downloadProgress: 100 });
          worker!.postMessage({
            type: "embed-chunks",
            texts: chunks.map((c) => c.text),
          });
          break;
        case "model-error":
          set({ status: "error", error: msg.error });
          worker!.removeEventListener("message", handleMessage);
          break;
        case "chunks-embedded":
          set({ chunkEmbeddings: msg.embeddings, status: "ready" });
          worker!.removeEventListener("message", handleMessage);
          break;
        case "embed-error":
          set({ status: "error", error: msg.error });
          worker!.removeEventListener("message", handleMessage);
          break;
      }
    };

    worker.addEventListener("message", handleMessage);
    worker.postMessage({ type: "load-model", config: EMBEDDING_MODEL });
  },

  retrieveChunks: (query: string, topK: number): Promise<DocumentChunk[]> => {
    const { worker, chunks, chunkEmbeddings } = get();

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

  retrieveChunksHybrid: (
    query: string,
    topK: number,
    options?: { useMMR?: boolean },
  ): Promise<DocumentChunk[]> => {
    const { worker, chunks, chunkEmbeddings } = get();

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

  getSpreadChunks: (maxChars: number, sections?: DocumentSection[]): DocumentChunk[] => {
    const { chunks } = get();
    if (chunks.length === 0) return [];

    let totalChars = chunks.reduce((sum, c) => sum + c.text.length, 0);
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

    const selected: DocumentChunk[] = [...selectedIndices].map((idx) => chunks[idx]!);
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

  clear: () => {
    set({
      status: "idle",
      downloadProgress: 0,
      error: null,
      chunks: [],
      chunkEmbeddings: [],
      totalDocChars: 0,
    });
  },
}));
