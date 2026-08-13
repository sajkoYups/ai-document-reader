import type { WorkflowId } from "./types";

function nonEmptyString(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function nonEmptyArray(value: unknown): boolean {
  return Array.isArray(value) && value.length > 0;
}

/** True for empty or dummy JSON like `{"": ""}` that has no real fields. */
export function isDegenerateRawCompletion(raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed) return true;
  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (parsed === null) return true;
    if (typeof parsed !== "object") return false;
    if (Array.isArray(parsed)) return parsed.length === 0;
    const keys = Object.keys(parsed);
    if (keys.length === 0) return true;
    return keys.length === 1 && keys[0] === "";
  } catch {
    return false;
  }
}

/**
 * True when validated/partial JSON has enough content to show as a finished result.
 * Schemas use .default(), so `{}` parses successfully but must not count as success.
 */
export function hasMeaningfulResult(
  workflowId: WorkflowId,
  data: unknown,
): boolean {
  if (!data || typeof data !== "object") return false;
  const obj = data as Record<string, unknown>;

  if (workflowId === "summarize") {
    return nonEmptyString(obj.overview) || nonEmptyArray(obj.keyPoints);
  }

  if (workflowId === "review") {
    return nonEmptyString(obj.overview) || nonEmptyArray(obj.findings);
  }

  if (workflowId === "extract") {
    return (
      nonEmptyArray(obj.keyFields) ||
      nonEmptyArray(obj.dates) ||
      nonEmptyArray(obj.entities) ||
      nonEmptyArray(obj.amounts) ||
      nonEmptyArray(obj.obligations) ||
      nonEmptyArray(obj.requirements) ||
      nonEmptyArray(obj.contacts) ||
      nonEmptyArray(obj.customRows)
    );
  }

  return true;
}
