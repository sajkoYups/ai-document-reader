import { create } from "zustand";
import type { EmbeddingStatus } from "@/types";
import type { DocumentChunk } from "@/lib/documentChunker";
import { chunkDocument } from "@/lib/documentChunker";
import { findTopK } from "@/lib/vectorStore";
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
  worker: Worker | null;

  initWorker: () => void;
  indexDocument: (rawText: string) => void;
  retrieveChunks: (query: string, topK: number) => Promise<DocumentChunk[]>;
  getSpreadChunks: (maxChars: number) => DocumentChunk[];
  clear: () => void;
}

export const useEmbeddingStore = create<EmbeddingStore>((set, get) => ({
  status: "idle",
  downloadProgress: 0,
  error: null,
  chunks: [],
  chunkEmbeddings: [],
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
    set({ chunks, chunkEmbeddings: [], status: "loading-model", downloadProgress: 0, error: null });

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
      return Promise.resolve(chunks.slice(0, topK));
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

  getSpreadChunks: (maxChars: number): DocumentChunk[] => {
    const { chunks } = get();
    if (chunks.length === 0) return [];

    let totalChars = chunks.reduce((sum, c) => sum + c.text.length, 0);
    if (totalChars <= maxChars) return chunks;

    const selected: DocumentChunk[] = [chunks[0]!];
    let budget = maxChars - chunks[0]!.text.length;

    if (chunks.length > 1) {
      const last = chunks[chunks.length - 1]!;
      selected.push(last);
      budget -= last.text.length;
    }

    if (budget > 0 && chunks.length > 2) {
      const middle = chunks.slice(1, -1);
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
    });
  },
}));
