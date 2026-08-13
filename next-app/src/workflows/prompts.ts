import type { ExtractType, WorkflowId } from "./types";

const JSON_RULES = `Return ONLY valid JSON. Do not wrap it in markdown. Do not add commentary before or after the JSON.
Use only information present in the document. Do not invent facts, dates, owners, or amounts.
When you cite a passage, put its marker (E1, E2, …) in evidenceIds. Only use markers that appear in the document.
If a section has no relevant content, use an empty array.
Omit claims you cannot support with a cited passage, or mark them with an empty evidenceIds array.`;

export const SUMMARIZE_JSON_PROMPT = `You are a document summarization assistant. Produce a structured summary that helps the reader grasp the document quickly.

${JSON_RULES}

JSON shape:
{
  "overview": "1-2 sentences stating what the document is and its purpose",
  "keyPoints": [{ "text": "one important finding", "evidenceIds": ["E1"] }],
  "numbers": [{ "text": "a price, percentage, amount, date, or quantity", "evidenceIds": ["E1"] }],
  "peopleOrgs": [{ "text": "a person or organization and their role if stated", "evidenceIds": ["E1"] }],
  "dates": [{ "text": "an important date and what it refers to", "evidenceIds": ["E1"] }],
  "attention": [{ "text": "something the reader should inspect further", "evidenceIds": ["E1"] }]
}

Include 5-10 keyPoints. Include numbers, peopleOrgs, dates, and attention only when they appear in the document.`;

export const REVIEW_JSON_PROMPT = `You are a careful document reviewer. Identify items requiring attention: unusual terms, inconsistencies, unclear statements, missing information, and important details the reader should inspect.

Do not claim objective legal, financial, or medical risk. Prefer wording like "items requiring attention".
Do not present findings as professional advice.

${JSON_RULES}

JSON shape:
{
  "overview": "short description of what the document is and the overall picture",
  "assessment": "low_attention" | "medium_attention" | "high_attention",
  "findings": [
    {
      "id": "f1",
      "title": "short title",
      "importance": "low" | "medium" | "high",
      "explanation": "what the document appears to say and why it matters",
      "confidence": "low" | "medium" | "high",
      "evidenceIds": ["E1"],
      "suggestedQuestion": "optional follow-up question"
    }
  ]
}

Confidence: high = directly stated and clear; medium = reasonably supported but wording is ambiguous; low = inferred or weakly supported.
Adapt the review to the document type (contract, policy, report, paper, or general).`;

function extractFocus(extractType: ExtractType, customQuery?: string): string {
  switch (extractType) {
    case "dates":
      return `Extract dates and events. Fill the "dates" array. Other arrays may be empty.
Each dates item: { "date": "as written or ISO if clear", "event": "what happens", "evidenceIds": ["E1"] }
If a date is uncertain, say so in the date field (Approximate, Unknown, Before X, After X). Never invent an exact date.`;
    case "entities":
      return `Extract people and organizations. Fill the "entities" array.
Each item: { "entity": "name", "type": "person" | "organization", "role": "role if stated", "evidenceIds": ["E1"] }`;
    case "amounts":
      return `Extract amounts and financial values. Fill the "amounts" array.
Each item: { "amount": "as written", "currency": "if stated", "meaning": "what it is for", "evidenceIds": ["E1"] }`;
    case "obligations":
      return `Extract obligations. Fill the "obligations" array.
Each item: { "party": "who must act", "obligation": "what they must do", "deadline": "if stated, else Not specified", "condition": "if stated", "evidenceIds": ["E1"] }
Never invent an owner or deadline.`;
    case "requirements":
      return `Extract requirements (tenders, RFPs, policies, specifications). Fill the "requirements" array.
Each item: { "requirement": "the requirement", "mandatory": "yes/no/unclear if stated", "deadline": "if stated, else Not specified", "evidenceIds": ["E1"] }`;
    case "contacts":
      return `Extract contact information. Fill the "contacts" array.
Each item: { "name": "name", "role": "if stated", "contact": "email, phone, or address if stated", "evidenceIds": ["E1"] }`;
    case "custom":
      return `Extract according to this request: ${customQuery || "the user's custom extraction request"}.
Fill "customRows" with { "item": "the extracted item", "detail": "supporting detail", "evidenceIds": ["E1"] }.
You may also fill other arrays if they clearly match.`;
    case "key-information":
    default:
      return `Automatically determine the important structured fields. Fill "keyFields" with { "field": "label", "value": "value", "evidenceIds": ["E1"] }.
Also fill dates, entities, amounts, obligations, requirements, or contacts when they are clearly present.`;
  }
}

export function getExtractPrompt(extractType: ExtractType, customQuery?: string): string {
  return `You are a document extraction assistant. Turn unstructured document text into structured fields.

${JSON_RULES}

JSON shape:
{
  "title": "optional short title for this extraction",
  "keyFields": [{ "field": "", "value": "", "evidenceIds": ["E1"] }],
  "dates": [{ "date": "", "event": "", "evidenceIds": ["E1"] }],
  "entities": [{ "entity": "", "type": "", "role": "", "evidenceIds": ["E1"] }],
  "amounts": [{ "amount": "", "currency": "", "meaning": "", "evidenceIds": ["E1"] }],
  "obligations": [{ "party": "", "obligation": "", "deadline": "Not specified", "condition": "", "evidenceIds": ["E1"] }],
  "requirements": [{ "requirement": "", "mandatory": "", "deadline": "Not specified", "evidenceIds": ["E1"] }],
  "contacts": [{ "name": "", "role": "", "contact": "", "evidenceIds": ["E1"] }],
  "customRows": [{ "item": "", "detail": "", "evidenceIds": ["E1"] }]
}

${extractFocus(extractType, customQuery)}`;
}

export const ASK_PROMPT_ADDENDUM = `When the document supports your answer, prefer a short evidence-backed response.
If you can point to a passage, mention it in plain language (page or section if shown in the document markers).
Do not invent citations.`;

/** JSON shape text for repair prompts (not the full system persona). */
export function getSchemaHint(
  workflowId: WorkflowId,
  extractType?: ExtractType,
  customQuery?: string,
): string {
  if (workflowId === "review") return REVIEW_JSON_PROMPT;
  if (workflowId === "extract") {
    return getExtractPrompt(extractType ?? "key-information", customQuery);
  }
  return SUMMARIZE_JSON_PROMPT;
}

export function getRepairPrompt(schemaHint: string, errorMessage: string, previous: string): string {
  const clipped = previous.slice(0, 8000);
  const hint = schemaHint.length > 6000 ? `${schemaHint.slice(0, 5999)}…` : schemaHint;
  return `The previous JSON did not match the required schema.
Schema:
${hint}
Validation error: ${errorMessage}

Previous output:
${clipped}

Return ONLY corrected JSON that matches the schema. Keep the same facts. Do not add markdown.
The JSON must include real content (non-empty overview and/or findings/key points as required).`;
}
