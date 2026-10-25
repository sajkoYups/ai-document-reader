export function assertHostedProvider(
  value: string | undefined,
): asserts value is "openrouter" {
  if (value !== "openrouter") {
    const received = value === undefined ? "unset" : JSON.stringify(value);
    throw new Error(
      `DEEP_ANALYSIS_LLM_PROVIDER must be exactly "openrouter" (received ${received}).`,
    );
  }
}

export function hostedQuotaEnabled(value: string | undefined): boolean {
  return value === "true";
}

export function assertRunpodBaseUrl(baseUrl: string): void {
  if (baseUrl.trim().length === 0) {
    throw new Error("RUNPOD_BASE_URL is empty.");
  }
}
