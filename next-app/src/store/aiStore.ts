import { create } from "zustand";
import type { ModelStatus, OutputLanguage } from "@/types";
import {
  DEFAULT_MODEL,
  type ModelConfig,
  type WorkerMessageFromWorker,
} from "@/lib/modelManager";

export type ProcessingMode = "local" | "api";

interface AiStore {
  processingMode: ProcessingMode;
  apiAvailable: boolean | null;
  outputLanguage: OutputLanguage;
  modelStatus: ModelStatus;
  downloadProgress: number;
  currentFile: string | null;
  error: string | null;
  inferenceDevice: "webgpu" | "wasm" | null;
  modelConfig: ModelConfig;
  worker: Worker | null;

  setProcessingMode: (mode: ProcessingMode) => void;
  setApiAvailable: (available: boolean) => void;
  setOutputLanguage: (lang: OutputLanguage) => void;
  initWorker: () => void;
  loadModel: () => void;
  initAndLoad: () => void;
  runTask: (
    taskType: string,
    text: string,
    conversationHistory?: Array<{ role: string; content: string }>,
    onToken?: (token: string) => void,
    onComplete?: (result: string) => void,
    onError?: (error: string) => void,
  ) => void;
  cancelTask: () => void;
}

export const useAiStore = create<AiStore>((set, get) => ({
  processingMode: "local",
  apiAvailable: null,
  outputLanguage: "en",
  modelStatus: "idle",
  downloadProgress: 0,
  currentFile: null,
  error: null,
  inferenceDevice: null,
  modelConfig: DEFAULT_MODEL,
  worker: null,

  setProcessingMode: (mode) => set({ processingMode: mode }),
  setApiAvailable: (available) => set({ apiAvailable: available }),
  setOutputLanguage: (lang) => set({ outputLanguage: lang }),

  initWorker: () => {
    if (get().worker) return;

    const worker = new Worker(
      new URL("../workers/aiWorker.ts", import.meta.url),
      { type: "module" },
    );

    worker.addEventListener("message", (e: MessageEvent<WorkerMessageFromWorker>) => {
      const msg = e.data;

      switch (msg.type) {
        case "progress": {
          const { status, progress, file } = msg.data;
          if (status === "download" || status === "progress") {
            set({
              modelStatus: "downloading",
              downloadProgress: progress ?? 0,
              currentFile: file ?? null,
            });
          } else if (status === "initiate") {
            set({ modelStatus: "downloading", currentFile: file ?? null });
          } else if (status === "done") {
            set({ currentFile: file ?? null });
          } else if (status === "ready") {
            set({ modelStatus: "loading" });
          }
          break;
        }
        case "model-loaded":
          set({ modelStatus: "ready", downloadProgress: 100, error: null, inferenceDevice: msg.device });
          break;
        case "model-error":
          set({ modelStatus: "error", error: msg.error });
          break;
      }
    });

    set({ worker });
  },

  loadModel: () => {
    const { worker, modelConfig, modelStatus } = get();
    if (modelStatus === "downloading" || modelStatus === "loading") return;
    if (!worker) {
      get().initWorker();
    }
    const w = get().worker;
    if (!w) return;

    set({ modelStatus: "downloading", downloadProgress: 0, error: null });
    w.postMessage({ type: "load-model", config: modelConfig });
  },

  initAndLoad: () => {
    get().initWorker();
    get().loadModel();
  },

  runTask: (taskType, text, conversationHistory, onToken, onComplete, onError) => {
    const { worker } = get();
    if (!worker) {
      onError?.("Worker not initialized");
      return;
    }

    const handler = (e: MessageEvent<WorkerMessageFromWorker>) => {
      const msg = e.data;
      switch (msg.type) {
        case "token":
          onToken?.(msg.token);
          break;
        case "task-complete":
          onComplete?.(msg.result);
          worker.removeEventListener("message", handler);
          break;
        case "task-error":
          onError?.(msg.error);
          worker.removeEventListener("message", handler);
          break;
      }
    };

    worker.addEventListener("message", handler);
    worker.postMessage({
      type: "run-task",
      taskType,
      text,
      conversationHistory,
      outputLanguage: get().outputLanguage,
    });
  },

  cancelTask: () => {
    const { worker } = get();
    if (worker) worker.postMessage({ type: "cancel-task" });
  },
}));
