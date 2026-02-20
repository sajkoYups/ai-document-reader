import { pipeline, TextStreamer } from "@huggingface/transformers";
import type {
  WorkerMessageToWorker,
  WorkerMessageFromWorker,
  ModelConfig,
} from "@/lib/modelManager";
import { SYSTEM_PROMPTS } from "@/lib/prompts";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let generator: any = null;
let activeDevice: "webgpu" | "wasm" = "wasm";
let loadedConfig: ModelConfig | null = null;
let pendingGpuError = false;
let inferenceGeneration = 0;

const MAX_INPUT_CHARS = 12000;
const FIRST_TOKEN_TIMEOUT_MS = 30_000;

self.addEventListener("unhandledrejection", (event: PromiseRejectionEvent) => {
  const msg = String(event.reason?.message ?? event.reason ?? "");
  if (
    msg.includes("GPUDevice") ||
    msg.includes("GPUBuffer") ||
    msg.includes("unsigned long long") ||
    msg.includes("createBuffer")
  ) {
    pendingGpuError = true;
  }
  event.preventDefault();
});

function post(msg: WorkerMessageFromWorker) {
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
  loadedConfig = config;

  try {
    let device: "webgpu" | "wasm" = "wasm";

    try {
      if (typeof navigator !== "undefined" && "gpu" in navigator) {
        const adapter = await (
          navigator as unknown as { gpu: { requestAdapter: () => Promise<unknown> } }
        ).gpu.requestAdapter();
        if (adapter) device = "webgpu";
      }
    } catch {
      // WebGPU not available
    }

    try {
      generator = await pipeline("text-generation", config.modelId, {
        dtype: config.dtype,
        device,
        progress_callback: progressCallback,
      });
      activeDevice = device;
    } catch (e) {
      if (device === "webgpu") {
        console.warn("WebGPU pipeline failed, falling back to WASM:", e);
        generator = await pipeline("text-generation", config.modelId, {
          dtype: config.dtype,
          device: "wasm",
          progress_callback: progressCallback,
        });
        activeDevice = "wasm";
      } else {
        throw e;
      }
    }

    post({ type: "model-loaded", device: activeDevice });
  } catch (e) {
    post({
      type: "model-error",
      error: e instanceof Error ? e.message : String(e),
    });
  }
}

async function rebuildOnWasm(): Promise<void> {
  if (!loadedConfig) throw new Error("No model config available for rebuild");
  generator = await pipeline("text-generation", loadedConfig.modelId, {
    dtype: loadedConfig.dtype,
    device: "wasm",
    progress_callback: progressCallback,
  });
  activeDevice = "wasm";
}

function prepareText(text: string): string {
  if (text.length <= MAX_INPUT_CHARS) return text;
  return text.slice(0, MAX_INPUT_CHARS) + "\n\n[... text truncated to fit context window ...]";
}

/**
 * Runs inference with a first-token timeout when on WebGPU.
 * Uses an inferenceGeneration counter so stale callbacks from an
 * orphaned WebGPU run are ignored after fallback.
 */
function runInference(
  messages: Array<{ role: string; content: string }>,
): Promise<string> {
  const myGen = ++inferenceGeneration;

  return new Promise<string>((resolve, reject) => {
    let fullResult = "";
    let gotFirstToken = false;

    const timeout =
      activeDevice === "webgpu"
        ? setTimeout(() => {
            if (!gotFirstToken) reject(new Error("INFERENCE_TIMEOUT"));
          }, FIRST_TOKEN_TIMEOUT_MS)
        : null;

    const streamer = new TextStreamer(generator.tokenizer, {
      skip_prompt: true,
      callback_function: (token: string) => {
        if (myGen !== inferenceGeneration) return;
        if (!gotFirstToken) {
          gotFirstToken = true;
          if (timeout) clearTimeout(timeout);
        }
        fullResult += token;
        post({ type: "token", token });
      },
    });

    generator(messages, {
      max_new_tokens: 1024,
      temperature: 0.3,
      top_p: 0.9,
      do_sample: true,
      streamer,
    })
      .then(() => {
        if (timeout) clearTimeout(timeout);
        if (myGen === inferenceGeneration) resolve(fullResult);
      })
      .catch((err: unknown) => {
        if (timeout) clearTimeout(timeout);
        if (myGen === inferenceGeneration) reject(err);
      });
  });
}

async function runTask(
  taskType: string,
  text: string,
  conversationHistory?: Array<{ role: string; content: string }>,
) {
  if (!generator) {
    post({ type: "task-error", error: "Model not loaded" });
    return;
  }

  const safeText = prepareText(text);
  const messages = buildMessages(taskType, safeText, conversationHistory);
  pendingGpuError = false;

  try {
    const result = await runInference(messages);

    if (pendingGpuError && activeDevice === "webgpu") {
      throw new Error("WebGPU error detected during inference");
    }

    post({ type: "task-complete", result });
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : String(e);
    const needsFallback =
      activeDevice === "webgpu" &&
      (pendingGpuError ||
        errMsg === "INFERENCE_TIMEOUT" ||
        errMsg.includes("GPUDevice") ||
        errMsg.includes("GPUBuffer") ||
        errMsg.includes("unsigned long long") ||
        errMsg.includes("createBuffer"));

    if (needsFallback) {
      console.warn("WebGPU inference failed, rebuilding on WASM:", errMsg);
      pendingGpuError = false;
      try {
        await rebuildOnWasm();
        const result = await runInference(messages);
        post({ type: "task-complete", result });
      } catch (retryErr) {
        post({
          type: "task-error",
          error: retryErr instanceof Error ? retryErr.message : String(retryErr),
        });
      }
    } else {
      post({ type: "task-error", error: errMsg });
    }
  }
}

function buildMessages(
  taskType: string,
  text: string,
  conversationHistory?: Array<{ role: string; content: string }>,
): Array<{ role: string; content: string }> {
  const system = SYSTEM_PROMPTS[taskType] ?? SYSTEM_PROMPTS["summarize"]!;

  if (taskType === "chat" && conversationHistory) {
    return [
      {
        role: "system",
        content: `${system}\n\n--- DOCUMENT ---\n${text}\n--- END DOCUMENT ---`,
      },
      ...conversationHistory,
    ];
  }

  return [
    { role: "system", content: system },
    { role: "user", content: text },
  ];
}

self.addEventListener("message", (e: MessageEvent<WorkerMessageToWorker>) => {
  const msg = e.data;
  switch (msg.type) {
    case "load-model":
      loadModel(msg.config);
      break;
    case "run-task":
      runTask(msg.taskType, msg.text, msg.conversationHistory);
      break;
  }
});
