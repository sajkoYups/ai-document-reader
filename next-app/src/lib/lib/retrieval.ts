/** Number of chunks to retrieve for chat (after fusion). */
export const CHAT_TOP_K = 6;

/** Number of chunks to retrieve for extract (after fusion). */
export const EXTRACT_TOP_K = 8;

/** Multiplier for candidate retrieval before fusion (e.g. 2 => retrieve 2*topK from each retriever). */
export const HYBRID_CANDIDATE_MULTIPLIER = 2;

/** Use MMR for diversity when true (e.g. for chat). Disabled for extract to keep relevance-only. */
export const USE_MMR_FOR_CHAT = true;

/** MMR lambda: 1 = relevance only, 0 = diversity only. */
export const MMR_LAMBDA = 0.5;

/**
 * Reciprocal Rank Fusion (RRF) for combining dense and sparse retrieval results.
 * score(d) = sum over each list of 1 / (k + rank(d)); default k=60.
 * Returns the top `topK` indices by combined RRF score, in ascending index order.
 */
export function fuseByRRF(
  denseIndices: number[],
  sparseIndicesInRankOrder: number[],
  topK: number,
  k: number = 60,
): number[] {
  const scoreByIndex = new Map<number, number>();

  const addRank = (index: number, rank: number) => {
    const rrf = 1 / (k + rank);
    scoreByIndex.set(index, (scoreByIndex.get(index) ?? 0) + rrf);
  };

  denseIndices.forEach((idx, rank) => addRank(idx, rank));
  sparseIndicesInRankOrder.forEach((idx, rank) => addRank(idx, rank));

  const sorted = [...scoreByIndex.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, topK)
    .map(([idx]) => idx);

  sorted.sort((a, b) => a - b);
  return sorted;
}
