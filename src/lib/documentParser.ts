import type { DocumentSection } from "@/types";

const HEADING_PATTERN = /^(#{1,6})\s+(.+)$/;
const UPPERCASE_HEADING = /^[A-Z][A-Z\s]{2,}$/;

export function parseIntoSections(text: string): DocumentSection[] {
  const lines = text.split("\n");
  const sections: DocumentSection[] = [];
  let currentHeading: string | null = null;
  let currentLines: string[] = [];
  let sectionIndex = 0;

  const flush = () => {
    const content = currentLines.join("\n").trim();
    if (content) {
      sections.push({
        heading: currentHeading,
        content,
        index: sectionIndex++,
      });
    }
    currentLines = [];
  };

  for (const line of lines) {
    const mdMatch = line.match(HEADING_PATTERN);
    if (mdMatch) {
      flush();
      currentHeading = mdMatch[2]!.trim();
      continue;
    }

    if (UPPERCASE_HEADING.test(line.trim()) && line.trim().length > 3) {
      flush();
      currentHeading = line.trim();
      continue;
    }

    currentLines.push(line);
  }

  flush();

  if (sections.length === 0 && text.trim()) {
    sections.push({ heading: null, content: text.trim(), index: 0 });
  }

  return sections;
}

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

export function validateFileSize(file: File): string | null {
  if (file.size > MAX_FILE_SIZE) {
    return `File is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum is 2MB.`;
  }
  return null;
}

export function getSupportedFileType(
  file: File,
): "pdf" | "txt" | "md" | null {
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return "pdf";
  if (ext === "txt") return "txt";
  if (ext === "md" || ext === "markdown") return "md";

  if (file.type === "application/pdf") return "pdf";
  if (file.type === "text/plain") return "txt";
  if (file.type === "text/markdown") return "md";

  return null;
}
