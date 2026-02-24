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

/**
 * Maximal Marginal Relevance: rerank candidate indices to balance relevance and diversity.
 * score(d) = λ * sim(q, d) - (1-λ) * max over selected of sim(d, d_selected).
 * @param lambdaMult 1 = relevance only, 0 = diversity only; 0.5 is a common balance.
 */
export function findTopKWithMMR(
  queryEmbedding: number[],
  chunkEmbeddings: number[][],
  candidateIndices: number[],
  topK: number,
  lambdaMult: number = 0.5,
): number[] {
  if (candidateIndices.length <= topK) return [...candidateIndices].sort((a, b) => a - b);

  const selected: number[] = [];
  let remaining = [...candidateIndices];

  while (selected.length < topK && remaining.length > 0) {
    let bestIdx = remaining[0]!;
    let bestScore = -Infinity;

    for (const idx of remaining) {
      const emb = chunkEmbeddings[idx]!;
      const rel = cosineSimilarity(queryEmbedding, emb);
      let maxSim = 0;
      for (const s of selected) {
        const sim = cosineSimilarity(emb, chunkEmbeddings[s]!);
        if (sim > maxSim) maxSim = sim;
      }
      const score = lambdaMult * rel - (1 - lambdaMult) * maxSim;
      if (score > bestScore) {
        bestScore = score;
        bestIdx = idx;
      }
    }

    selected.push(bestIdx);
    remaining = remaining.filter((i) => i !== bestIdx);
  }

  return selected.sort((a, b) => a - b);
}
