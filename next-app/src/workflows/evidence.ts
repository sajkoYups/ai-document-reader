import type { DocumentSection } from "@/types";
import type { DocumentChunk } from "@/lib/documentChunker";
import type { EvidenceReference, PageSpan } from "./types";

export interface LabeledEvidence {
  id: string;
  chunk: DocumentChunk;
  reference: EvidenceReference;
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

export function buildLabeledContext(
  chunks: DocumentChunk[],
  pages: PageSpan[],
  sections: DocumentSection[],
  documentId: string,
  documentName: string,
  maxChars: number,
): { text: string; evidenceById: Record<string, EvidenceReference> } {
  const evidenceById: Record<string, EvidenceReference> = {};
  if (chunks.length === 0) {
    return { text: "", evidenceById };
  }

  const parts: string[] = [];
  let used = 0;

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i]!;
    const id = `E${i + 1}`;
    const page = pageForOffset(pages, chunk.startChar);
    const section = sectionForOffset(sections, chunk.startChar);
    const excerpt = chunk.text.trim().slice(0, 280);
    evidenceById[id] = {
      documentId,
      documentName,
      page,
      section,
      excerpt,
    };

    const locationBits = [
      page ? `Page ${page}` : null,
      section ? section : null,
    ].filter(Boolean);
    const header = locationBits.length > 0 ? `${id} · ${locationBits.join(" · ")}` : id;
    const block = `[${header}]\n${chunk.text.trim()}`;
    if (used + block.length > maxChars && parts.length > 0) break;
    parts.push(block);
    used += block.length + 2;
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
    const ref = evidenceById[key];
    if (ref) {
      seen.add(key);
      resolved.push(ref);
    }
  }
  return resolved;
}

export function formatEvidenceLabel(ref: EvidenceReference): string {
  const bits: string[] = [];
  if (ref.section) bits.push(ref.section);
  if (ref.page) bits.push(`Page ${ref.page}`);
  if (bits.length === 0 && ref.documentName) bits.push(ref.documentName);
  return bits.join(" · ") || "Source";
}
