import { config } from "../config.js";
import type { TaskType } from "../types/index.js";

const SYSTEM_PROMPTS: Record<TaskType, string> = {
  summarize: `You are a document summarization assistant. Summarize the given text clearly and concisely.

Rules:
- Start with a 1-2 sentence overview of the document
- Follow with key points as a numbered list
- Focus on findings, conclusions, and actionable items
- Do NOT add information not present in the text
- Do NOT speculate or infer beyond what is written
- Keep the summary under 300 words`,

  explain: `You are a plain-language explainer. Rewrite the given text so anyone can understand it.

Rules:
- Use simple, everyday words — avoid jargon and technical terms
- Preserve the original structure (sections, order of ideas)
- Use short sentences and short paragraphs
- When a complex concept appears, briefly explain it in parentheses
- Do NOT add information not present in the original text
- Do NOT omit important details`,

  extract: `You are a document analysis assistant. Extract structured information from the given text.

Output ONLY the following sections (skip any section with no relevant content):

## Key Points
- (bulleted list of main ideas)

## Obligations & Commitments
- (bulleted list)

## Risks & Warnings
- (bulleted list)

## Important Dates & Deadlines
- (bulleted list)

## Notable Terms & Conditions
- (bulleted list)

Rules:
- Use the exact section headings above
- Each bullet must be a direct fact from the text — do NOT infer or speculate
- Keep each bullet to one concise sentence
- If a section has no relevant content, omit it entirely`,

  draft: `You are a professional document writer. Generate a well-structured document based on the given prompt.

Rules:
- Use clear headings and logical paragraph structure
- Write in a professional, neutral tone
- Be thorough but concise — no filler or redundant sentences
- Use bullet points or numbered lists where appropriate
- Do NOT include placeholder text or unfinished sections`,

  chat: `You are a document assistant. Answer questions using ONLY the provided document.

Rules:
- Base every answer strictly on the document content
- Quote or paraphrase relevant sections to support your answer
- If the document does not contain the answer, say: "The document does not contain information about this."
- Do NOT guess, speculate, or use outside knowledge
- Keep answers concise and direct
- If the question is ambiguous, ask for clarification`,
};

interface OllamaMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface OllamaChatChunk {
  message?: { content: string };
  done: boolean;
}

function buildMessages(
  taskType: TaskType,
  documentText: string,
  userMessage?: string,
  conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>,
): OllamaMessage[] {
  const systemPrompt = SYSTEM_PROMPTS[taskType];

  if (taskType === "chat") {
    const messages: OllamaMessage[] = [
      {
        role: "system",
        content: `${systemPrompt}\n\n--- DOCUMENT ---\n${documentText}\n--- END DOCUMENT ---`,
      },
    ];

    if (conversationHistory) {
      for (const msg of conversationHistory) {
        messages.push({ role: msg.role, content: msg.content });
      }
    }

    if (userMessage) {
      messages.push({ role: "user", content: userMessage });
    }

    return messages;
  }

  return [
    { role: "system", content: systemPrompt },
    { role: "user", content: documentText },
  ];
}

export async function* streamInference(
  taskType: TaskType,
  documentText: string,
  userMessage?: string,
  conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>,
): AsyncGenerator<string> {
  const messages = buildMessages(
    taskType,
    documentText,
    userMessage,
    conversationHistory,
  );

  const response = await fetch(`${config.ollama.baseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: config.ollama.model,
      messages,
      stream: true,
      options: {
        num_ctx: config.ollama.contextWindow,
        temperature: taskType === "chat" ? 0.3 : 0.1,
        top_p: 0.9,
        repeat_penalty: 1.1,
      },
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "unknown error");
    throw new Error(`Ollama request failed (${response.status}): ${text}`);
  }

  if (!response.body) {
    throw new Error("No response body from Ollama");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const chunk = JSON.parse(line) as OllamaChatChunk;
          if (chunk.message?.content) {
            yield chunk.message.content;
          }
        } catch {
          // skip malformed JSON lines
        }
      }
    }

    if (buffer.trim()) {
      try {
        const chunk = JSON.parse(buffer) as OllamaChatChunk;
        if (chunk.message?.content) {
          yield chunk.message.content;
        }
      } catch {
        // skip
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export async function checkOllamaHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${config.ollama.baseUrl}/api/tags`, {
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
}
