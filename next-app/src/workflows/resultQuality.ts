import type { WorkflowId } from "./types";

function nonEmptyString(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function nonEmptyArray(value: unknown): boolean {
  return Array.isArray(value) && value.length > 0;
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
