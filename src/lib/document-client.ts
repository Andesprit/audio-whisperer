import type { Chapter, DocumentWorkerResponse } from "../types/documents";

export async function parseBookFile(
  file: File,
): Promise<{ title: string; chapters: Chapter[] }> {
  const worker = new Worker(new URL("../workers/document.worker.ts", import.meta.url), {
    type: "module",
  });
  const requestId = crypto.randomUUID();
  const buffer = await file.arrayBuffer();

  return new Promise((resolve, reject) => {
    worker.addEventListener("message", (event: MessageEvent<DocumentWorkerResponse>) => {
      if (event.data.requestId !== requestId) return;
      worker.terminate();
      if (event.data.type === "error") reject(new Error(event.data.message));
      else resolve({ title: event.data.title, chapters: event.data.chapters });
    });
    worker.addEventListener("error", () => {
      worker.terminate();
      reject(new Error("The document worker stopped unexpectedly"));
    });
    worker.postMessage(
      {
        requestId,
        type: "parse",
        file: buffer,
        filename: file.name,
        mimeType: file.type,
      },
      [buffer],
    );
  });
}
