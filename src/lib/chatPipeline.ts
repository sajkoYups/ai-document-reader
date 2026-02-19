import type { ChatMessage, DocumentSection } from "@/types";

const MAX_CONTEXT_CHARS = 3000;

export function buildChatHistory(
  messages: ChatMessage[],
): Array<{ role: string; content: string }> {
  return messages.map((m) => ({ role: m.role, content: m.content }));
}

export function truncateDocumentForContext(rawText: string): string {
  if (rawText.length <= MAX_CONTEXT_CHARS) return rawText;
  return rawText.slice(0, MAX_CONTEXT_CHARS) + "\n\n[... document truncated for context window ...]";
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
