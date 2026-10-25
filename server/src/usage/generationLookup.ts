import type { ProviderNumbers } from "./reservation.js";

export interface GenerationLookup {
  promptTokens: number;
  completionTokens: number;
  cachedTokens: number | null;
  reasoningTokens: number | null;
  cost: number | null;
  model: string | null;
  providerName: string | null;
  cancelled: boolean;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function parseGenerationPayload(body: unknown): GenerationLookup | null {
  const root = asRecord(body);
  const data = asRecord(root?.data) ?? root;
  if (!data) return null;
  const prompt = num(data.tokens_prompt);
  const completion = num(data.tokens_completion);
  if (prompt === null || completion === null) return null;
  return {
    promptTokens: prompt,
    completionTokens: completion,
    cachedTokens: num(data.native_tokens_cached),
    reasoningTokens: num(data.native_tokens_reasoning),
    cost: num(data.total_cost),
    model: typeof data.model === "string" ? data.model : null,
    providerName: typeof data.provider_name === "string" ? data.provider_name : null,
    cancelled: data.cancelled === true,
  };
}

export function toProviderNumbers(lookup: GenerationLookup): ProviderNumbers {
  return {
    promptTokens: lookup.promptTokens,
    completionTokens: lookup.completionTokens,
    cachedTokens: lookup.cachedTokens,
    reasoningTokens: lookup.reasoningTokens,
    cost: lookup.cost,
    model: lookup.model,
    providerName: lookup.providerName,
  };
}

export async function lookupGenerationUsage(input: {
  id: string;
  apiKey: string;
  baseUrl: string;
  fetchImpl: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  attempts?: number;
}): Promise<GenerationLookup | null> {
  const attempts = input.attempts ?? 3;
  const sleep = input.sleep ?? ((ms: number) => new Promise((resolve) => setTimeout(resolve, ms)));
  const delays = [200, 500, 1000];
  const url = `${input.baseUrl.replace(/\/$/, "")}/generation?id=${encodeURIComponent(input.id)}`;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (attempt > 0) await sleep(delays[attempt - 1] ?? 1000);
    let response: Response;
    try {
      response = await input.fetchImpl(url, {
        headers: { Authorization: `Bearer ${input.apiKey}` },
      });
    } catch {
      continue;
    }
    if (!response.ok) continue;
    const parsed = parseGenerationPayload(await response.json());
    if (parsed) return parsed;
  }
  return null;
}
