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
const OCR_PAGE_TIMEOUT_MS = 60_000;

export class OcrInputError extends Error {
  constructor() {
    super("Invalid page image");
    this.name = "OcrInputError";
  }
}

export function isJpegBase64(value: string): boolean {
  const buffer = Buffer.from(value, "base64");
  return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
}

export function withTimeout<T>(promise: Promise<T>, ms = OCR_PAGE_TIMEOUT_MS): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("OCR page timed out")), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

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

async function dropWorker(langs: string[]): Promise<void> {
  const key = langs.join("+");
  const pending = workers.get(key);
  workers.delete(key);
  if (!pending) return;
  const worker = await pending.catch(() => null);
  if (worker) await worker.terminate().catch(() => undefined);
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
  for (const page of pages) {
    if (!isJpegBase64(page.jpegBase64)) throw new OcrInputError();
  }
  const langs = languagesFor(outputLanguage);
  const recognized = await enqueue(async () => {
    const worker = await getWorker(langs);
    const lines: { pageNumber: number; text: string }[] = [];
    for (const page of pages) {
      const image = Buffer.from(page.jpegBase64, "base64");
      try {
        const result = await withTimeout(worker.recognize(image));
        lines.push({ pageNumber: page.pageNumber, text: result.data.text });
      } catch (error) {
        await dropWorker(langs);
        throw error;
      }
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
