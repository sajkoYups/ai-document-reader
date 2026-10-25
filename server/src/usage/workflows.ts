export const KNOWN_WORKFLOW_IDS = [
  "summarize",
  "ask",
  "extract",
  "review",
  "compare",
  "timeline",
  "contradictions",
  "missing-information",
  "evidence-finder",
  "action-items",
  "document-map",
  "contract-review",
  "nda-review",
  "employment-review",
] as const;

export type KnownWorkflowId = (typeof KNOWN_WORKFLOW_IDS)[number];

const KNOWN = new Set<string>(KNOWN_WORKFLOW_IDS);

export function knownWorkflow(workflowId: string | undefined): boolean {
  if (workflowId === undefined) return true;
  return KNOWN.has(workflowId);
}
