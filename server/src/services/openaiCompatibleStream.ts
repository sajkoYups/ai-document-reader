/**
 * Shared helpers for OpenAI-compatible chat completion SSE streams
 * (RunPod vLLM, OpenRouter, etc.).
 */

export function normalizeOpenAiContent(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (part && typeof part === "object" && "text" in part) {
          const t = (part as { text?: unknown }).text;
          return typeof t === "string" ? t : "";
        }
        return "";
      })
      .join("");
  }
  return "";
}

export function extractOpenAiStreamText(chunk: unknown): string {
  if (chunk === null || typeof chunk !== "object") return "";
  const obj = chunk as Record<string, unknown>;

  if (obj.error && typeof obj.error === "object") {
    const msg = (obj.error as { message?: unknown }).message;
    if (typeof msg === "string" && msg.length > 0) {
      throw new Error(msg);
    }
  }

  const choices = obj.choices;
  if (!Array.isArray(choices) || choices.length === 0) return "";

  const choice0 = choices[0] as Record<string, unknown>;
  if (typeof choice0.text === "string" && choice0.text.length > 0) {
    return choice0.text;
  }

  const delta = choice0.delta as Record<string, unknown> | undefined;
  const message = choice0.message as Record<string, unknown> | undefined;

  const fromDelta = normalizeOpenAiContent(delta?.content);
  if (fromDelta.length > 0) return fromDelta;
  return normalizeOpenAiContent(message?.content);
}

export interface StreamOpenAiSseOptions {
  /** Abort if no bytes arrive for this many ms while reading the body. */
  idleMs?: number;
}

/**
 * Reads an OpenAI-style SSE body and yields text deltas.
 * Caller must have already validated response.ok and response.body.
 */
export async function* streamOpenAiSseTokens(
  body: ReadableStream<Uint8Array>,
  options?: StreamOpenAiSseOptions,
): AsyncGenerator<string> {
  const idleMs = options?.idleMs;
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const readNext = async (): Promise<ReadableStreamReadResult<Uint8Array>> => {
    if (!idleMs || idleMs <= 0) {
      return reader.read();
    }

    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        reader.read(),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => {
            void reader.cancel("Inference timed out").catch(() => {});
            reject(new Error("Inference timed out"));
          }, idleMs);
        }),
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  };

  const yieldTokensFromSseLine = async function* (rawLine: string) {
    const line = rawLine.trim();
    if (!line.startsWith("data:")) return;

    const data = line.slice("data:".length).trim();
    if (!data || data === "[DONE]") return;

    let chunk: unknown;
    try {
      chunk = JSON.parse(data);
    } catch {
      return;
    }
    try {
      const text = extractOpenAiStreamText(chunk);
      if (text.length > 0) yield text;
    } catch (e) {
      if (e instanceof Error) throw e;
    }
  };

  try {
    while (true) {
      const { done, value } = await readNext();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const rawLine of lines) {
        yield* yieldTokensFromSseLine(rawLine);
      }
    }

    buffer += decoder.decode(new Uint8Array(), { stream: false });
    for (const rawLine of buffer.split("\n")) {
      yield* yieldTokensFromSseLine(rawLine);
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Opens a streaming chat completion fetch.
 * Uses a connect-phase abort only (cleared once headers arrive) so an active
 * token stream is not killed by a wall-clock whole-response timeout.
 */
export async function fetchStreamingChatCompletion(
  url: string,
  init: RequestInit,
  connectTimeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const connectTimer = setTimeout(() => controller.abort(), connectTimeoutMs);

  try {
    const { signal: _ignored, ...rest } = init;
    return await fetch(url, {
      ...rest,
      signal: controller.signal,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.name === "AbortError" || /aborted|timeout/i.test(error.message))
    ) {
      throw new Error("Inference timed out");
    }
    throw error;
  } finally {
    clearTimeout(connectTimer);
  }
}
