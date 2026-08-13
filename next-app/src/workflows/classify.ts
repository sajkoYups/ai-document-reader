import type { DocumentTypeId, WorkflowId } from "./types";
import { t } from "./copy";
import type { OutputLanguage } from "@/types";

interface TypeSignals {
  type: DocumentTypeId;
  keywords: string[];
  filename: string[];
}

const SIGNALS: TypeSignals[] = [
  { type: "nda", keywords: ["non-disclosure", "nondisclosure", "confidential information", "receiving party", "disclosing party"], filename: ["nda"] },
  { type: "invoice", keywords: ["invoice number", "bill to", "due date", "subtotal", "vat", "tax invoice"], filename: ["invoice", "faktura"] },
  { type: "cv", keywords: ["curriculum vitae", "work experience", "education", "skills", "references"], filename: ["cv", "resume", "lebenslauf"] },
  { type: "rfp", keywords: ["request for proposal", "tender", "bidder", "submission deadline", "scope of work"], filename: ["rfp", "tender", "rfq"] },
  { type: "research_paper", keywords: ["abstract", "methodology", "references", "et al", "hypothesis", "literature review"], filename: ["paper", "thesis"] },
  { type: "meeting_notes", keywords: ["agenda", "action items", "attendees", "minutes", "next steps"], filename: ["minutes", "notes", "agenda"] },
  { type: "policy", keywords: ["shall comply", "policy applies", "employees must", "code of conduct", "acceptable use"], filename: ["policy", "handbook"] },
  { type: "financial_report", keywords: ["revenue", "operating income", "balance sheet", "cash flow", "fiscal year", "ebitda"], filename: ["10-k", "annual-report", "financial"] },
  { type: "proposal", keywords: ["we propose", "our approach", "pricing", "deliverables", "statement of work"], filename: ["proposal", "quote"] },
  { type: "technical_spec", keywords: ["shall", "requirements", "specification", "interface", "must support"], filename: ["spec", "requirements"] },
  { type: "medical", keywords: ["patient", "diagnosis", "treatment", "clinical", "prescription", "medical history"], filename: ["medical", "clinical"] },
  { type: "contract", keywords: ["whereas", "hereinafter", "party", "agreement", "governing law", "termination", "indemnif", "liability"], filename: ["agreement", "contract", "msa"] },
  { type: "legal", keywords: ["plaintiff", "defendant", "court", "statute", "hereby"], filename: ["legal", "brief"] },
];

const RECOMMENDATIONS: Record<DocumentTypeId, WorkflowId[]> = {
  contract: ["review", "extract", "summarize"],
  nda: ["review", "extract", "summarize"],
  policy: ["review", "extract", "summarize"],
  invoice: ["extract", "summarize", "ask"],
  financial_report: ["review", "summarize", "extract"],
  research_paper: ["summarize", "review", "ask"],
  cv: ["extract", "summarize", "ask"],
  meeting_notes: ["extract", "summarize", "ask"],
  rfp: ["extract", "review", "summarize"],
  proposal: ["review", "extract", "summarize"],
  technical_spec: ["extract", "review", "summarize"],
  legal: ["review", "summarize", "ask"],
  medical: ["summarize", "extract", "ask"],
  general: ["summarize", "review", "ask"],
  unknown: ["summarize", "review", "ask"],
};

export function classifyDocument(
  text: string,
  fileName: string | null,
  language: OutputLanguage,
): {
  type: DocumentTypeId;
  label: string;
  recommendedWorkflowIds: WorkflowId[];
} {
  const haystack = text.slice(0, 4000).toLowerCase();
  const name = (fileName ?? "").toLowerCase();

  let best: { type: DocumentTypeId; score: number } = { type: "unknown", score: 0 };

  for (const signal of SIGNALS) {
    let score = 0;
    for (const kw of signal.keywords) {
      if (haystack.includes(kw)) score += 2;
    }
    for (const fn of signal.filename) {
      if (name.includes(fn)) score += 4;
    }
    if (score > best.score) {
      best = { type: signal.type, score };
    }
  }

  const type = best.score >= 2 ? best.type : haystack.length > 80 ? "general" : "unknown";
  return {
    type,
    label: t(language, `docType.${type}`),
    recommendedWorkflowIds: RECOMMENDATIONS[type],
  };
}

export function suggestedQuestionsForType(type: DocumentTypeId): string[] {
  switch (type) {
    case "contract":
    case "nda":
    case "legal":
      return [
        "When can either party terminate?",
        "What are the payment obligations?",
        "What happens after termination?",
        "Are there penalties?",
        "What are the renewal terms?",
      ];
    case "research_paper":
      return [
        "What is the main finding?",
        "What methodology was used?",
        "What limitations are acknowledged?",
        "How large was the sample?",
        "What evidence supports the conclusion?",
      ];
    case "invoice":
      return [
        "What is the total amount due?",
        "When is payment due?",
        "Who is the supplier?",
        "What is being billed?",
      ];
    case "policy":
      return [
        "Who does this policy apply to?",
        "What is required?",
        "What happens if the policy is not followed?",
      ];
    case "meeting_notes":
      return [
        "What decisions were made?",
        "What are the action items?",
        "Who is responsible for follow-up?",
      ];
    default:
      return [
        "What is this document about?",
        "What are the most important points?",
        "What should I pay attention to?",
      ];
  }
}
