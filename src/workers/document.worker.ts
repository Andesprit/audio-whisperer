/// <reference lib="webworker" />

import { GlobalWorkerOptions, getDocument } from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { parseEpubArchive } from "../lib/epub";
import { cleanPdfPages } from "../lib/pdf-cleanup";
import type { Chapter, DocumentWorkerRequest, DocumentWorkerResponse } from "../types/documents";

const workerScope = self as DedicatedWorkerGlobalScope;
GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

function respond(response: DocumentWorkerResponse): void {
  workerScope.postMessage(response);
}

async function parsePdf(file: ArrayBuffer): Promise<Chapter[]> {
  const pdf = await getDocument({ data: new Uint8Array(file) }).promise;
  const pages: string[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const lines: string[] = [];
    let current = "";

    for (const item of content.items) {
      if (!("str" in item)) continue;
      current += `${item.str} `;
      if (item.hasEOL) {
        lines.push(current.trim());
        current = "";
      }
    }
    if (current.trim()) lines.push(current.trim());
    pages.push(lines.join("\n"));
  }

  return [{ id: crypto.randomUUID(), title: "Extracted text", text: cleanPdfPages(pages) }];
}

workerScope.addEventListener(
  "message",
  async (event: MessageEvent<DocumentWorkerRequest>) => {
    const request = event.data;
    try {
      const isEpub = request.filename.toLowerCase().endsWith(".epub");
      const chapters = isEpub
        ? parseEpubArchive(request.file).map((chapter) => ({
            ...chapter,
            id: crypto.randomUUID(),
          }))
        : await parsePdf(request.file);
      respond({
        requestId: request.requestId,
        type: "parsed",
        title: request.filename.replace(/\.(?:epub|pdf)$/i, ""),
        chapters,
      });
    } catch (error) {
      respond({
        requestId: request.requestId,
        type: "error",
        message: error instanceof Error ? error.message : "Could not read this document",
      });
    }
  },
);
