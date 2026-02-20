export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!;
    normA += a[i]! * a[i]!;
    normB += b[i]! * b[i]!;
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

/**
 * Returns the indices of the top-K most similar embeddings,
 * sorted by similarity (highest first).
 */
export function findTopK(
  queryEmbedding: number[],
  chunkEmbeddings: number[][],
  topK: number,
): number[] {
  const scored = chunkEmbeddings.map((emb, idx) => ({
    idx,
    score: cosineSimilarity(queryEmbedding, emb),
  }));

  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, topK).map((s) => s.idx);
}
