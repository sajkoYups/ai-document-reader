import "./domMatrixPolyfill";
import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

interface TextItem {
  str: string;
  transform: number[];
  width: number;
  height: number;
  hasEOL?: boolean;
}

function isTextItem(item: unknown): item is TextItem {
  return typeof item === "object" && item !== null && "str" in item && "transform" in item;
}

/**
 * Groups text items by their Y-position, preserving line breaks and
 * paragraph structure. Uses the vertical gap between lines to decide
 * whether to insert a line break or a paragraph break.
 */
function assemblePageText(items: unknown[]): string {
  const textItems = items.filter(isTextItem).filter((it) => it.str.trim() !== "" || it.hasEOL);

  if (textItems.length === 0) return "";

  const lines: { y: number; height: number; text: string }[] = [];
  let currentLineY = textItems[0]!.transform[5]!;
  let currentLineHeight = textItems[0]!.height || 12;
  let currentLineFragments: string[] = [];

  for (const item of textItems) {
    const y = item.transform[5]!;
    const yDelta = Math.abs(y - currentLineY);

    if (yDelta > currentLineHeight * 0.3 && currentLineFragments.length > 0) {
      lines.push({
        y: currentLineY,
        height: currentLineHeight,
        text: currentLineFragments.join("").trim(),
      });
      currentLineFragments = [];
      currentLineY = y;
      currentLineHeight = item.height || currentLineHeight;
    }

    currentLineFragments.push(item.str);
  }

  if (currentLineFragments.length > 0) {
    lines.push({
      y: currentLineY,
      height: currentLineHeight,
      text: currentLineFragments.join("").trim(),
    });
  }

  if (lines.length === 0) return "";

  const nonEmptyLines = lines.filter((l) => l.text.length > 0);
  if (nonEmptyLines.length < 2) return nonEmptyLines.map((l) => l.text).join("");

  const lineGaps: number[] = [];
  for (let i = 1; i < nonEmptyLines.length; i++) {
    lineGaps.push(Math.abs(nonEmptyLines[i]!.y - nonEmptyLines[i - 1]!.y));
  }
  const medianGap = lineGaps.length > 0
    ? [...lineGaps].sort((a, b) => a - b)[Math.floor(lineGaps.length / 2)]!
    : 14;

  const paragraphThreshold = medianGap * 1.8;

  const resultParts: string[] = [nonEmptyLines[0]!.text];
  for (let i = 1; i < nonEmptyLines.length; i++) {
    const gap = Math.abs(nonEmptyLines[i]!.y - nonEmptyLines[i - 1]!.y);
    resultParts.push(gap > paragraphThreshold ? "\n\n" : "\n");
    resultParts.push(nonEmptyLines[i]!.text);
  }

  return resultParts.join("");
}

export interface PdfPageSpan {
  pageNumber: number;
  startChar: number;
  endChar: number;
}

export interface PdfExtractionResult {
  text: string;
  pageCount: number;
  pages: PdfPageSpan[];
}

export async function extractTextFromPdf(file: File): Promise<PdfExtractionResult> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const parts: string[] = [];
  const pages: PdfPageSpan[] = [];
  let cursor = 0;

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = assemblePageText(textContent.items).trim();
    if (!pageText) continue;

    const block = `[Page ${i}]\n${pageText}`;
    if (parts.length > 0) {
      parts.push("\n\n");
      cursor += 2;
    }
    const startChar = cursor;
    parts.push(block);
    cursor += block.length;
    pages.push({ pageNumber: i, startChar, endChar: cursor });
  }

  return {
    text: parts.join(""),
    pageCount: pdf.numPages,
    pages,
  };
}
