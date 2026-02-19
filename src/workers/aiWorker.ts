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

const MAX_INPUT_CHARS = 6000;

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

async function createPipeline(config: ModelConfig, device: "webgpu" | "wasm") {
  return await pipeline("text-generation", config.modelId, {
    dtype: config.dtype,
    device,
    progress_callback: progressCallback,
  });
}

async function loadModel(config: ModelConfig) {
  try {
    let device: "webgpu" | "wasm" = "wasm";

    try {
      if (typeof navigator !== "undefined" && "gpu" in navigator) {
        const adapter = await (navigator as unknown as { gpu: { requestAdapter: () => Promise<unknown> } }).gpu.requestAdapter();
        if (adapter) device = "webgpu";
      }
    } catch {
      // WebGPU probe failed, stay on WASM
    }

    try {
      generator = await createPipeline(config, device);
      activeDevice = device;
    } catch (e) {
      if (device === "webgpu") {
        console.warn("WebGPU pipeline failed, falling back to WASM:", e);
        generator = await createPipeline(config, "wasm");
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

function truncateText(text: string): string {
  if (text.length <= MAX_INPUT_CHARS) return text;
  return text.slice(0, MAX_INPUT_CHARS) + "\n\n[... text truncated to fit model context window ...]";
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

  const safeText = truncateText(text);
  const messages = buildMessages(taskType, safeText, conversationHistory);

  try {
    const result = await runInference(messages);
    post({ type: "task-complete", result });
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : String(e);
    const isGpuError =
      errMsg.includes("GPUDevice") ||
      errMsg.includes("GPUBuffer") ||
      errMsg.includes("unsigned long long");

    if (isGpuError && activeDevice === "webgpu") {
      console.warn("WebGPU inference failed, retrying with WASM:", errMsg);
      post({ type: "token", token: "" });
      try {
        generator = await createPipeline(
          { modelId: generator.model.config._name_or_path ?? "onnx-community/Qwen2.5-0.5B-Instruct", displayName: "", dtype: "q4" },
          "wasm",
        );
        activeDevice = "wasm";
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

async function runInference(
  messages: Array<{ role: string; content: string }>,
): Promise<string> {
  let fullResult = "";
  const streamer = new TextStreamer(generator.tokenizer, {
    skip_prompt: true,
    callback_function: (token: string) => {
      fullResult += token;
      post({ type: "token", token });
    },
  });

  await generator(messages, {
    max_new_tokens: 512,
    temperature: 0.3,
    top_p: 0.9,
    do_sample: true,
    streamer,
  });

  return fullResult;
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
