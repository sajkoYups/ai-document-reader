import type { DocumentSection } from "@/types";
import type { DocumentChunk } from "@/lib/documentChunker";
import type { EvidenceReference, PageSpan } from "./types";

export interface LabeledEvidence {
  id: string;
  chunk: DocumentChunk;
  reference: EvidenceReference;
}

export interface LabeledDocInput {
  documentId: string;
  documentName: string;
  pages: PageSpan[];
  sections: DocumentSection[];
  chunks: DocumentChunk[];
  /** Optional prefix for evidence IDs, e.g. "A" → A-E1 */
  idPrefix?: string;
}

function pageForOffset(pages: PageSpan[], offset: number): number | undefined {
  for (const page of pages) {
    if (offset >= page.startChar && offset < page.endChar) {
      return page.pageNumber;
    }
  }
  return pages.find((p) => offset >= p.startChar && offset <= p.endChar)?.pageNumber;
}

function sectionForOffset(
  sections: DocumentSection[],
  offset: number,
): string | undefined {
  for (const section of sections) {
    const start = section.startChar ?? 0;
    const end = section.endChar ?? start + section.content.length;
    if (offset >= start && offset < end) {
      return section.heading ?? undefined;
    }
  }
  return undefined;
}

function labelOneDoc(
  input: LabeledDocInput,
  startIndex: number,
  maxChars: number,
  usedSoFar: number,
): { text: string; evidenceById: Record<string, EvidenceReference>; used: number; nextIndex: number } {
  const evidenceById: Record<string, EvidenceReference> = {};
  const parts: string[] = [];
  let used = usedSoFar;
  let local = 0;

  for (let i = 0; i < input.chunks.length; i++) {
    const chunk = input.chunks[i]!;
    local += 1;
    const id = input.idPrefix
      ? `${input.idPrefix}-E${local}`
      : `E${startIndex + local}`;
    const page = pageForOffset(input.pages, chunk.startChar);
    const section = sectionForOffset(input.sections, chunk.startChar);
    const excerpt = chunk.text.trim().slice(0, 280);
    evidenceById[id] = {
      documentId: input.documentId,
      documentName: input.documentName,
      page,
      section,
      excerpt,
    };

    const locationBits = [
      input.documentName,
      page ? `Page ${page}` : null,
      section ? section : null,
    ].filter(Boolean);
    const header = `${id} · ${locationBits.join(" · ")}`;
    const block = `[${header}]\n${chunk.text.trim()}`;
    if (used + block.length > maxChars && parts.length > 0) break;
    parts.push(block);
    used += block.length + 2;
  }

  const docHeader = `=== ${input.documentName}${input.idPrefix ? ` (${input.idPrefix})` : ""} ===`;
  const body = parts.join("\n\n");
  const text = parts.length > 0 ? `${docHeader}\n\n${body}` : "";
  return {
    text,
    evidenceById,
    used: usedSoFar + (text ? text.length + 2 : 0),
    nextIndex: startIndex + local,
  };
}

/** Single-document labeled context (Phase 1 API). */
export function buildLabeledContext(
  chunks: DocumentChunk[],
  pages: PageSpan[],
  sections: DocumentSection[],
  documentId: string,
  documentName: string,
  maxChars: number,
  idPrefix?: string,
): { text: string; evidenceById: Record<string, EvidenceReference> } {
  return buildMultiDocLabeledContext(
    [{ documentId, documentName, pages, sections, chunks, idPrefix }],
    maxChars,
  );
}

/** Multi-document labeled context with optional A/B prefixes. */
export function buildMultiDocLabeledContext(
  docs: LabeledDocInput[],
  maxChars: number,
): { text: string; evidenceById: Record<string, EvidenceReference> } {
  const evidenceById: Record<string, EvidenceReference> = {};
  if (docs.length === 0) return { text: "", evidenceById };

  const parts: string[] = [];
  let used = 0;
  let index = 0;

  for (const doc of docs) {
    if (used >= maxChars) break;
    const labeled = labelOneDoc(doc, index, maxChars, used);
    Object.assign(evidenceById, labeled.evidenceById);
    if (labeled.text) parts.push(labeled.text);
    used = labeled.used;
    index = labeled.nextIndex;
  }

  return {
    text: parts.join("\n\n"),
    evidenceById,
  };
}

export function resolveEvidenceIds(
  ids: string[] | undefined,
  evidenceById: Record<string, EvidenceReference>,
): EvidenceReference[] {
  if (!ids?.length) return [];
  const seen = new Set<string>();
  const resolved: EvidenceReference[] = [];
  for (const id of ids) {
    const key = id.replace(/^\[/, "").replace(/\]$/, "");
    if (seen.has(key)) continue;
    const ref = evidenceById[key] ?? evidenceById[key.toUpperCase()];
    if (ref) {
      seen.add(key);
      resolved.push(ref);
    }
  }
  return resolved;
}

export function formatEvidenceLabel(ref: EvidenceReference): string {
  const bits: string[] = [];
  if (ref.documentName) bits.push(ref.documentName);
  if (ref.section) bits.push(ref.section);
  if (ref.page) bits.push(`Page ${ref.page}`);
  return bits.join(" · ") || "Source";
}
