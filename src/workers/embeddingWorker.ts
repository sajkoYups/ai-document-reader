import { pipeline } from "@huggingface/transformers";
import type {
  EmbeddingWorkerMessageToWorker,
  EmbeddingWorkerMessageFromWorker,
  ModelConfig,
} from "@/lib/modelManager";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let embedder: any = null;

function post(msg: EmbeddingWorkerMessageFromWorker) {
  self.postMessage(msg);
}

function progressCallback(progress: Record<string, unknown>) {
  post({
    type: "progress",
    data: {
      status: (progress.status as string) ?? "unknown",
      progress: progress.progress as number | undefined,
      file: progress.file as string | undefined,
    },
  });
}

async function loadModel(config: ModelConfig) {
  try {
    embedder = await pipeline("feature-extraction", config.modelId, {
      dtype: config.dtype,
      device: "wasm",
      progress_callback: progressCallback,
    });
    post({ type: "model-loaded" });
  } catch (e) {
    post({
      type: "model-error",
      error: e instanceof Error ? e.message : String(e),
    });
  }
}

async function embedChunks(texts: string[]) {
  if (!embedder) {
    post({ type: "embed-error", error: "Embedding model not loaded" });
    return;
  }

  try {
    const embeddings: number[][] = [];

    for (const text of texts) {
      const output = await embedder(text, { pooling: "mean", normalize: true });
      embeddings.push(Array.from(output.data as Float32Array));
    }

    post({ type: "chunks-embedded", embeddings });
  } catch (e) {
    post({
      type: "embed-error",
      error: e instanceof Error ? e.message : String(e),
    });
  }
}

async function embedQuery(text: string) {
  if (!embedder) {
    post({ type: "embed-error", error: "Embedding model not loaded" });
    return;
  }

  try {
    const output = await embedder(text, { pooling: "mean", normalize: true });
    const embedding = Array.from(output.data as Float32Array);
    post({ type: "query-embedded", embedding });
  } catch (e) {
    post({
      type: "embed-error",
      error: e instanceof Error ? e.message : String(e),
    });
  }
}

self.addEventListener("message", (e: MessageEvent<EmbeddingWorkerMessageToWorker>) => {
  const msg = e.data;
  switch (msg.type) {
    case "load-model":
      loadModel(msg.config);
      break;
    case "embed-chunks":
      embedChunks(msg.texts);
      break;
    case "embed-query":
      embedQuery(msg.text);
      break;
  }
});
