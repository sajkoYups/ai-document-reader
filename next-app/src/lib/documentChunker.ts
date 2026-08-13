/** Target size per chunk (~375–500 tokens). Tune down (e.g. 1200) for finer retrieval, up for more context per chunk. */
export const CHUNK_TARGET_CHARS = 1500;
/** Overlap between consecutive chunks. Skill suggests 10–20%; increase (e.g. 300) if boundary cuts hurt quality. */
export const CHUNK_OVERLAP_CHARS = 200;

export interface DocumentChunk {
  text: string;
  index: number;
  startChar: number;
  endChar: number;
  documentId?: string;
  documentName?: string;
}

/**
 * Splits a document into overlapping chunks, preferring to break at
 * paragraph boundaries. Each chunk is roughly CHUNK_TARGET_CHARS long
 * with CHUNK_OVERLAP_CHARS of overlap for continuity.
 */
export function chunkDocument(
  text: string,
  meta?: { documentId?: string; documentName?: string },
): DocumentChunk[] {
  const tag = {
    documentId: meta?.documentId,
    documentName: meta?.documentName,
  };
  if (text.length <= CHUNK_TARGET_CHARS) {
    return [{ text, index: 0, startChar: 0, endChar: text.length, ...tag }];
  }

  const chunks: DocumentChunk[] = [];
  let cursor = 0;
  let index = 0;

  while (cursor < text.length) {
    let end = Math.min(cursor + CHUNK_TARGET_CHARS, text.length);

    if (end < text.length) {
      const slice = text.slice(cursor, end + 300);
      const paraBreak = slice.lastIndexOf("\n\n");
      if (paraBreak > CHUNK_TARGET_CHARS * 0.5) {
        end = cursor + paraBreak + 2;
      } else {
        const lineBreak = slice.lastIndexOf("\n");
        if (lineBreak > CHUNK_TARGET_CHARS * 0.5) {
          end = cursor + lineBreak + 1;
        }
      }
    }

    chunks.push({
      text: text.slice(cursor, end),
      index,
      startChar: cursor,
      endChar: end,
      ...tag,
    });

    index++;
    cursor = end - CHUNK_OVERLAP_CHARS;
    if (cursor >= text.length) break;
    if (text.length - cursor < CHUNK_OVERLAP_CHARS * 2) {
      if (chunks[chunks.length - 1]!.endChar < text.length) {
        chunks.push({
          text: text.slice(cursor),
          index,
          startChar: cursor,
          endChar: text.length,
          ...tag,
        });
      }
      break;
    }
  }

  return chunks;
}

const STOP_WORDS = new Set([
  "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
  "have", "has", "had", "do", "does", "did", "will", "would", "could",
  "should", "may", "might", "shall", "can", "to", "of", "in", "for",
  "on", "with", "at", "by", "from", "as", "into", "about", "between",
  "through", "after", "before", "and", "but", "or", "not", "no", "this",
  "that", "these", "those", "it", "its", "what", "which", "who", "whom",
  "how", "where", "when", "why", "all", "each", "every", "both", "few",
  "more", "most", "other", "some", "such", "than", "too", "very",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s$€£¥.,%-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w));
}

/**
 * Scores each chunk by keyword overlap with the query. Returns chunks
 * sorted by relevance (highest first), limited to maxChars total.
 */
export function retrieveRelevantChunks(
  chunks: DocumentChunk[],
  query: string,
  maxChars: number,
): DocumentChunk[] {
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return chunks.slice(0, 3);

  const querySet = new Set(queryTokens);

  const scored = chunks.map((chunk) => {
    const chunkTokens = tokenize(chunk.text);
    let matchScore = 0;

    for (const token of chunkTokens) {
      if (querySet.has(token)) matchScore += 1;
    }

    for (const qt of queryTokens) {
      if (chunk.text.toLowerCase().includes(qt)) matchScore += 2;
    }

    const numberPattern = /\$[\d,.]+|[\d,.]+\s*(?:usd|eur|gbp|dollars?|euros?|percent|%)/gi;
    const hasNumbers = numberPattern.test(chunk.text);
    if (queryTokens.some((t) => /price|cost|amount|fee|payment|total|sum|rate|salary|value/i.test(t)) && hasNumbers) {
      matchScore += 5;
    }

    return { chunk, score: matchScore };
  });

  scored.sort((a, b) => b.score - a.score);

  const selected: DocumentChunk[] = [];
  let charBudget = maxChars;

  for (const { chunk } of scored) {
    if (charBudget <= 0) break;
    selected.push(chunk);
    charBudget -= chunk.text.length;
  }

  selected.sort((a, b) => a.index - b.index);
  return selected;
}

/**
 * Returns chunk indices in keyword-relevance order (best first), for use in RRF fusion.
 * Stops after collecting indices whose total text length reaches maxChars.
 */
export function retrieveRelevantChunkIndices(
  chunks: DocumentChunk[],
  query: string,
  maxChars: number,
): number[] {
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return chunks.slice(0, 3).map((c) => c.index);

  const querySet = new Set(queryTokens);

  const scored = chunks.map((chunk) => {
    const chunkTokens = tokenize(chunk.text);
    let matchScore = 0;

    for (const token of chunkTokens) {
      if (querySet.has(token)) matchScore += 1;
    }

    for (const qt of queryTokens) {
      if (chunk.text.toLowerCase().includes(qt)) matchScore += 2;
    }

    const numberPattern = /\$[\d,.]+|[\d,.]+\s*(?:usd|eur|gbp|dollars?|euros?|percent|%)/gi;
    const hasNumbers = numberPattern.test(chunk.text);
    if (queryTokens.some((t) => /price|cost|amount|fee|payment|total|sum|rate|salary|value/i.test(t)) && hasNumbers) {
      matchScore += 5;
    }

    return { chunk, score: matchScore };
  });

  scored.sort((a, b) => b.score - a.score);

  const indices: number[] = [];
  let charBudget = maxChars;

  for (const { chunk } of scored) {
    if (charBudget <= 0) break;
    indices.push(chunk.index);
    charBudget -= chunk.text.length;
  }

  return indices;
}
