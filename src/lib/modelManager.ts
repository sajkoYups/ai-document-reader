export interface ModelConfig {
  modelId: string;
  displayName: string;
  dtype: "q4" | "q4f16" | "q8" | "fp16" | "fp32";
}

export const DEFAULT_MODEL: ModelConfig = {
  modelId: "onnx-community/Qwen2.5-0.5B-Instruct",
  displayName: "Qwen 2.5 0.5B",
  dtype: "q4",
};

export type WorkerMessageToWorker =
  | { type: "load-model"; config: ModelConfig }
  | { type: "run-task"; taskType: string; text: string; conversationHistory?: Array<{ role: string; content: string }> };

export type WorkerMessageFromWorker =
  | { type: "progress"; data: { status: string; progress?: number; file?: string } }
  | { type: "model-loaded"; device: "webgpu" | "wasm" }
  | { type: "model-error"; error: string }
  | { type: "token"; token: string }
  | { type: "task-complete"; result: string }
  | { type: "task-error"; error: string };
