/**
 * Best-effort parse of a (possibly incomplete) JSON object from a token stream.
 * Never throws. Returns null if nothing usable has arrived yet.
 */
export function parsePartialJson(raw: string): unknown | null {
  const stripped = stripFences(raw).trim();
  if (!stripped) return null;

  try {
    return JSON.parse(stripped);
  } catch {
    // continue
  }

  const repaired = closeIncompleteJson(stripped);
  if (!repaired) return null;
  try {
    return JSON.parse(repaired);
  } catch {
    return null;
  }
}

export function stripFences(raw: string): string {
  let text = raw.trim();
  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?\s*/i, "");
    text = text.replace(/\s*```\s*$/, "");
  }
  const firstBrace = text.indexOf("{");
  if (firstBrace > 0) text = text.slice(firstBrace);
  return text;
}

function closeIncompleteJson(text: string): string | null {
  let inString = false;
  let escaped = false;
  const stack: string[] = [];

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === "\\") {
        escaped = true;
        continue;
      }
      if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === "{") stack.push("}");
    else if (ch === "[") stack.push("]");
    else if (ch === "}" || ch === "]") {
      if (stack.length === 0) return null;
      stack.pop();
    }
  }

  let suffix = "";
  if (inString) suffix += '"';

  // Drop a trailing comma before closing.
  let body = text;
  if (inString) {
    // leave as-is; we closed the string
  } else {
    body = body.replace(/,\s*$/, "");
  }

  while (stack.length > 0) {
    suffix += stack.pop();
  }

  return body + suffix;
}
