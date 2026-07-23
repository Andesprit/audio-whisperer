export async function encodeMp3(
  samples: Float32Array,
  sampleRate: number,
): Promise<ArrayBuffer> {
  const worker = new Worker(new URL("../workers/export.worker.ts", import.meta.url), {
    type: "module",
  });
  const requestId = crypto.randomUUID();
  const transferable = samples.slice().buffer;

  return new Promise((resolve, reject) => {
    worker.addEventListener("message", (event) => {
      if (event.data.requestId !== requestId) return;
      worker.terminate();
      if (event.data.type === "error") reject(new Error(event.data.message));
      else resolve(event.data.mp3 as ArrayBuffer);
    });
    worker.postMessage({ requestId, samples: transferable, sampleRate }, [transferable]);
  });
}
