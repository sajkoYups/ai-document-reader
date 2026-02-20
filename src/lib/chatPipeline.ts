import type { ChatMessage, DocumentSection } from "@/types";
import type { DocumentChunk } from "./documentChunker";

const MAX_CONTEXT_CHARS = 16000;

export function buildChatHistory(
  messages: ChatMessage[],
): Array<{ role: string; content: string }> {
  return messages.map((m) => ({ role: m.role, content: m.content }));
}

/**
 * Assembles context from pre-retrieved chunks, inserting [...] markers
 * between non-contiguous sections so the model knows there are gaps.
 */
export function assembleContext(
  chunks: DocumentChunk[],
  maxChars: number = MAX_CONTEXT_CHARS,
): string {
  if (chunks.length === 0) return "";

  const parts: string[] = [];
  let prevEnd = 0;
  let budget = maxChars;

  for (const chunk of chunks) {
    if (budget <= 0) break;

    if (chunk.startChar > prevEnd + 100 && parts.length > 0) {
      parts.push("\n[...]\n");
    }

    const text = chunk.text.length > budget
      ? chunk.text.slice(0, budget) + "\n[... chunk truncated ...]"
      : chunk.text;

    parts.push(text);
    budget -= text.length;
    prevEnd = chunk.endChar;
  }

  return parts.join("");
}

export function extractEvidence(
  assistantResponse: string,
  sections: DocumentSection[],
): string[] {
  const evidence: string[] = [];
  const responseLower = assistantResponse.toLowerCase();

  for (const section of sections) {
    const sentences = section.content
      .split(/[.!?]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 20);

    for (const sentence of sentences) {
      const words = sentence
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 4);

      const matchCount = words.filter((w) => responseLower.includes(w)).length;
      const matchRatio = words.length > 0 ? matchCount / words.length : 0;

      if (matchRatio > 0.5 && evidence.length < 3) {
        const prefix = section.heading ? `[${section.heading}] ` : "";
        const truncated =
          sentence.length > 150 ? sentence.slice(0, 150) + "..." : sentence;
        evidence.push(`${prefix}${truncated}`);
      }
    }
  }

  return evidence;
}
