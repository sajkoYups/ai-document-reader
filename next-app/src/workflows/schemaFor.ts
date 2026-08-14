import { z } from "zod";
import type { WorkflowId } from "./types";
import { SummaryResultSchema } from "./schemas/summarize";
import { ReviewResultSchema } from "./schemas/review";
import { ExtractResultSchema } from "./schemas/extract";
import { ComparisonResultSchema } from "./schemas/compare";
import { TimelineResultSchema } from "./schemas/timeline";
import {
  ActionItemsResultSchema,
  ContradictionsResultSchema,
  DocumentMapResultSchema,
  EvidenceFinderResultSchema,
  MissingInformationResultSchema,
} from "./schemas/advanced";

export function schemaForWorkflow(id: WorkflowId): z.ZodType {
  switch (id) {
    case "review":
      return ReviewResultSchema;
    case "extract":
      return ExtractResultSchema;
    case "compare":
      return ComparisonResultSchema;
    case "timeline":
      return TimelineResultSchema;
    case "contradictions":
      return ContradictionsResultSchema;
    case "missing-information":
      return MissingInformationResultSchema;
    case "evidence-finder":
      return EvidenceFinderResultSchema;
    case "action-items":
      return ActionItemsResultSchema;
    case "document-map":
      return DocumentMapResultSchema;
    default:
      return SummaryResultSchema;
  }
}

export function refineQueryFromDraft(workflowId: WorkflowId, data: unknown): string {
  if (!data || typeof data !== "object") return "key clauses obligations dates differences";
  const obj = data as Record<string, unknown>;
  const bits: string[] = [];

  const pushTexts = (arr: unknown, keys: string[]) => {
    if (!Array.isArray(arr)) return;
    for (const item of arr.slice(0, 8)) {
      if (!item || typeof item !== "object") continue;
      const row = item as Record<string, unknown>;
      for (const k of keys) {
        if (typeof row[k] === "string" && (row[k] as string).trim()) {
          bits.push((row[k] as string).trim());
          break;
        }
      }
    }
  };

  if (workflowId === "review") pushTexts(obj.findings, ["title", "explanation"]);
  else if (workflowId === "compare") {
    pushTexts(obj.differences, ["text"]);
    pushTexts(obj.attention, ["text"]);
  } else if (workflowId === "contradictions") {
    pushTexts(obj.contradictions, ["title", "claimA", "claimB"]);
  } else if (workflowId === "timeline") {
    pushTexts(obj.events, ["label", "description"]);
  }

  return bits.join(" ").slice(0, 500) || "key clauses obligations dates differences";
}
