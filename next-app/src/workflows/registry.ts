import type { OutputLanguage } from "@/types";
import { t } from "./copy";
import { askWorkflow } from "./core/ask";
import { compareWorkflow } from "./core/compare";
import { extractWorkflow } from "./core/extract";
import { reviewWorkflow } from "./core/review";
import { summarizeWorkflow } from "./core/summarize";
import { timelineWorkflow } from "./core/timeline";
import {
  actionItemsWorkflow,
  contradictionsWorkflow,
  contractReviewWorkflow,
  documentMapWorkflow,
  employmentReviewWorkflow,
  evidenceFinderWorkflow,
  missingInformationWorkflow,
  ndaReviewWorkflow,
} from "./advanced";
import type { WorkflowCategory, WorkflowDefinition, WorkflowId } from "./types";
import { PRIMARY_WORKFLOW_IDS } from "./types";

const ALL_WORKFLOWS: WorkflowDefinition[] = [
  summarizeWorkflow,
  reviewWorkflow,
  extractWorkflow,
  compareWorkflow,
  timelineWorkflow,
  askWorkflow,
  contradictionsWorkflow,
  missingInformationWorkflow,
  evidenceFinderWorkflow,
  actionItemsWorkflow,
  documentMapWorkflow,
  contractReviewWorkflow,
  ndaReviewWorkflow,
  employmentReviewWorkflow,
];

const BY_ID = new Map(ALL_WORKFLOWS.map((w) => [w.id, w]));

export function getWorkflow(id: WorkflowId): WorkflowDefinition | undefined {
  return BY_ID.get(id);
}

export function listPrimary(): WorkflowDefinition[] {
  return PRIMARY_WORKFLOW_IDS.map((id) => BY_ID.get(id)).filter(
    (w): w is WorkflowDefinition => Boolean(w),
  );
}

export function listAll(): WorkflowDefinition[] {
  return ALL_WORKFLOWS;
}

export function listByCategory(category: WorkflowCategory): WorkflowDefinition[] {
  return ALL_WORKFLOWS.filter((w) => w.category === category);
}

export function searchWorkflows(
  query: string,
  language: OutputLanguage,
): WorkflowDefinition[] {
  const q = query.trim().toLowerCase();
  if (!q) return ALL_WORKFLOWS;

  return ALL_WORKFLOWS.filter((w) => {
    const name = t(language, w.nameKey).toLowerCase();
    const description = t(language, w.shortDescriptionKey).toLowerCase();
    const tags = w.tags.join(" ").toLowerCase();
    return name.includes(q) || description.includes(q) || tags.includes(q);
  });
}

export { PRIMARY_WORKFLOW_IDS };
