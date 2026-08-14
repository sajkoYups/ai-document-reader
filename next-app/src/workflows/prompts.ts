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
      return `Extract stated requirements, deliverables, SLAs, mandatory duties, and acceptance criteria from contracts, agreements, policies, tenders, RFPs, and specifications. Fill only the "requirements" array. Other arrays may be empty.
Each item: { "requirement": "the requirement", "mandatory": "yes/no/unclear if stated", "deadline": "if stated, else Not specified", "evidenceIds": ["E1"] }
Prefer the 15–30 most important items rather than listing every minor clause.`;
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

export const COMPARE_JSON_PROMPT = `You are a careful document comparison assistant. Compare Document A and Document B using only the provided text.
Markers may look like A-E1 or B-E2. Put those markers in evidenceIds. Prefer wording like "items requiring attention" — do not claim legal or financial risk.

${JSON_RULES}

JSON shape:
{
  "overview": "1-2 sentences on how the documents relate",
  "similarities": [{ "text": "", "side": "both", "evidenceIds": ["A-E1", "B-E1"] }],
  "differences": [{ "text": "", "side": "a" | "b" | "both", "evidenceIds": ["A-E1"] }],
  "attention": [{ "text": "", "side": "a" | "b" | "both", "evidenceIds": ["B-E2"] }]
}

Include the most important similarities and differences. Use side "a" or "b" when the point mainly belongs to one document.`;

export const TIMELINE_JSON_PROMPT = `You are a document timeline assistant. Extract dated events in chronological order.
If a date is uncertain, say so (Approximate, Unknown, Before X, After X). Never invent an exact date.
When multiple documents are present, set documentId to the document id shown in the markers if available.

${JSON_RULES}

JSON shape:
{
  "overview": "short description of the timeline",
  "events": [{ "date": "", "label": "", "description": "", "documentId": "", "evidenceIds": ["E1"] }]
}`;

export const CONTRADICTIONS_JSON_PROMPT = `You find statements that appear inconsistent within the document. Prefer "appears inconsistent" — do not claim legal conclusions.

${JSON_RULES}

JSON shape:
{
  "overview": "",
  "contradictions": [{
    "id": "c1",
    "title": "",
    "claimA": "",
    "claimB": "",
    "explanation": "",
    "confidence": "low" | "medium" | "high",
    "evidenceIds": ["E1", "E2"],
    "suggestedQuestion": ""
  }]
}`;

export const MISSING_INFORMATION_JSON_PROMPT = `You identify information that appears absent or incomplete for this kind of document. Do not invent requirements that the document type never needs. Prefer calm wording.

${JSON_RULES}

JSON shape:
{
  "overview": "",
  "missing": [{
    "id": "m1",
    "title": "",
    "explanation": "",
    "importance": "low" | "medium" | "high",
    "evidenceIds": ["E1"],
    "suggestedQuestion": ""
  }]
}`;

export function getEvidenceFinderPrompt(customQuery?: string): string {
  return `You locate every relevant passage for this request: ${customQuery || "find the most important supporting passages"}.

${JSON_RULES}

JSON shape:
{
  "overview": "",
  "query": ${JSON.stringify(customQuery || "")},
  "passages": [{ "id": "p1", "title": "", "passage": "short quote", "whyRelevant": "", "evidenceIds": ["E1"] }]
}`;
}

export const ACTION_ITEMS_JSON_PROMPT = `Turn the document into concrete action items. Never invent an owner or deadline — use "Not specified" when absent.

${JSON_RULES}

JSON shape:
{
  "overview": "",
  "items": [{ "action": "", "owner": "Not specified", "deadline": "Not specified", "evidenceIds": ["E1"] }]
}`;

export const DOCUMENT_MAP_JSON_PROMPT = `Produce a structured outline of the document. Prefer real section headings from the text.

${JSON_RULES}

JSON shape:
{
  "overview": "",
  "sections": [{ "heading": "", "summary": "1-2 sentences", "evidenceIds": ["E1"] }]
}`;

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
  if (workflowId === "compare") return COMPARE_JSON_PROMPT;
  if (workflowId === "timeline") return TIMELINE_JSON_PROMPT;
  if (workflowId === "contradictions") return CONTRADICTIONS_JSON_PROMPT;
  if (workflowId === "missing-information") return MISSING_INFORMATION_JSON_PROMPT;
  if (workflowId === "evidence-finder") return getEvidenceFinderPrompt(customQuery);
  if (workflowId === "action-items") return ACTION_ITEMS_JSON_PROMPT;
  if (workflowId === "document-map") return DOCUMENT_MAP_JSON_PROMPT;
  return SUMMARIZE_JSON_PROMPT;
}

export function getSystemPromptForWorkflow(
  workflowId: WorkflowId,
  extractType?: ExtractType,
  customQuery?: string,
): string {
  return getSchemaHint(workflowId, extractType, customQuery);
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

export function getRefinePrompt(draftJson: string, extraContext: string): string {
  return `You previously produced this draft JSON analysis:
${draftJson.slice(0, 6000)}

Additional document passages:
${extraContext.slice(0, 8000)}

Return ONLY improved JSON in the same schema. Keep correct facts, add support from the new passages where relevant, and do not invent content.`;
}
