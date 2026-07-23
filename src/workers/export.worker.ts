/// <reference lib="webworker" />

import { Mp3Encoder } from "lamejs";

interface ExportRequest {
  requestId: string;
  samples: ArrayBuffer;
  sampleRate: number;
}

const workerScope = self as DedicatedWorkerGlobalScope;

workerScope.addEventListener("message", (event: MessageEvent<ExportRequest>) => {
  const { requestId, samples, sampleRate } = event.data;
  try {
    const source = new Float32Array(samples);
    const pcm = new Int16Array(source.length);
    for (let index = 0; index < source.length; index += 1) {
      const sample = Math.max(-1, Math.min(1, source[index]));
      pcm[index] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
    }

    const encoder = new Mp3Encoder(1, sampleRate, 128);
    const parts: Uint8Array[] = [];
    for (let offset = 0; offset < pcm.length; offset += 1_152) {
      const encoded = encoder.encodeBuffer(pcm.subarray(offset, offset + 1_152));
      if (encoded.length) parts.push(new Uint8Array(encoded));
    }
    const final = encoder.flush();
    if (final.length) parts.push(new Uint8Array(final));

    const size = parts.reduce((sum, part) => sum + part.length, 0);
    const mp3 = new Uint8Array(size);
    let offset = 0;
    for (const part of parts) {
      mp3.set(part, offset);
      offset += part.length;
    }
    workerScope.postMessage({ requestId, type: "mp3", mp3: mp3.buffer }, [mp3.buffer]);
  } catch (error) {
    workerScope.postMessage({
      requestId,
      type: "error",
      message: error instanceof Error ? error.message : "MP3 encoding failed",
    });
  }
});
