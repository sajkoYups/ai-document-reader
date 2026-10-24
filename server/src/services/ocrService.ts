import { createWorker } from "tesseract.js";
import type { OutputLanguage } from "../types/index.js";

type OcrWorker = Awaited<ReturnType<typeof createWorker>>;

const TESSERACT_LANG: Record<OutputLanguage, string> = {
  en: "eng",
  de: "deu",
  fr: "fra",
  cs: "ces",
  mk: "mkd",
};

const workers = new Map<string, Promise<OcrWorker>>();
let queue: Promise<unknown> = Promise.resolve();

function languagesFor(outputLanguage: OutputLanguage): string[] {
  const extra = TESSERACT_LANG[outputLanguage];
  return extra === "eng" ? ["eng"] : ["eng", extra];
}

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task, task);
  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function getWorker(langs: string[]): Promise<OcrWorker> {
  const key = langs.join("+");
  const existing = workers.get(key);
  if (existing) return existing;

  const created = createWorker(langs).catch((error: unknown) => {
    workers.delete(key);
    throw error;
  });
  workers.set(key, created);
  return created;
}

export interface OcrPageInput {
  pageNumber: number;
  jpegBase64: string;
}

export interface OcrPageSpan {
  pageNumber: number;
  startChar: number;
  endChar: number;
}

export interface OcrResult {
  text: string;
  pageCount: number;
  pages: OcrPageSpan[];
}

export async function recognizePageImages(
  pages: OcrPageInput[],
  outputLanguage: OutputLanguage,
): Promise<OcrResult> {
  const langs = languagesFor(outputLanguage);
  const recognized = await enqueue(async () => {
    const worker = await getWorker(langs);
    const lines: { pageNumber: number; text: string }[] = [];
    for (const page of pages) {
      const image = Buffer.from(page.jpegBase64, "base64");
      const result = await worker.recognize(image);
      lines.push({ pageNumber: page.pageNumber, text: result.data.text });
    }
    return lines;
  });

  const parts: string[] = [];
  const spans: OcrPageSpan[] = [];
  let cursor = 0;
  const lastPage = pages[pages.length - 1]?.pageNumber ?? pages.length;

  for (const page of recognized) {
    const pageText = page.text.trim();
    if (!pageText) continue;
    const block = `[Page ${page.pageNumber}]\n${pageText}`;
    if (parts.length > 0) {
      parts.push("\n\n");
      cursor += 2;
    }
    const startChar = cursor;
    parts.push(block);
    cursor += block.length;
    spans.push({ pageNumber: page.pageNumber, startChar, endChar: cursor });
  }

  return {
    text: parts.join(""),
    pageCount: lastPage,
    pages: spans,
  };
}
