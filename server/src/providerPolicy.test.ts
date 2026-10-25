import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { assertHostedProvider, assertRunpodBaseUrl, hostedQuotaEnabled } from "./providerPolicy.js";

test("hosted provider accepts only openrouter and does not call the network", () => {
  const original = globalThis.fetch;
  globalThis.fetch = (() => {
    throw new Error("network");
  }) as typeof fetch;
  try {
    assert.throws(() => assertHostedProvider(undefined), /openrouter/);
    assert.throws(() => assertHostedProvider(""), /openrouter/);
    assert.throws(() => assertHostedProvider("ollama"), /openrouter/);
    assert.throws(() => assertHostedProvider("runpod"), /openrouter/);
    assert.doesNotThrow(() => assertHostedProvider("openrouter"));
  } finally {
    globalThis.fetch = original;
  }
});

test("quota enforcement is on only for the exact string true", () => {
  assert.equal(hostedQuotaEnabled(undefined), false);
  assert.equal(hostedQuotaEnabled("false"), false);
  assert.equal(hostedQuotaEnabled("1"), false);
  assert.equal(hostedQuotaEnabled("true"), true);
});

test("an empty RunPod URL is refused before a request", () => {
  assert.throws(() => assertRunpodBaseUrl(""), /RUNPOD_BASE_URL/);
  assert.doesNotThrow(() => assertRunpodBaseUrl("https://example.test"));
});

test("startup and inference paths do not keep the Ollama default or the hardcoded RunPod host", () => {
  const config = readFileSync(new URL("./config.ts", import.meta.url), "utf8");
  const llm = readFileSync(new URL("./services/llmService.ts", import.meta.url), "utf8");
  const index = readFileSync(new URL("./index.ts", import.meta.url), "utf8");
  assert.equal(config.includes("x7k139f7thbivr"), false);
  assert.equal(config.includes('return "ollama"'), false);
  assert.match(index, /assertHostedProvider/);
  const stream = llm.slice(llm.indexOf("export async function* streamDeepInference"));
  assert.ok(stream.indexOf("assertHostedProvider") < stream.indexOf("streamOpenrouterInference"));
  assert.equal(stream.includes("streamOllamaInference"), false);
  assert.equal(stream.includes("streamRunpod"), false);
});
