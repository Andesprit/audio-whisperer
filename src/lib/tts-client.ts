import type {
  ModelId,
  ModelVersionId,
  SynthesisOptions,
  Voice,
  WorkerRequest,
  WorkerResponse,
} from "../types/tts";
import type { DocumentLanguage } from "./chunk-text";

interface PendingRequest {
  resolve: (response: WorkerResponse) => void;
  reject: (error: Error) => void;
  onProgress?: (progress: number) => void;
}

type WorkerRequestInput = WorkerRequest extends infer Request
  ? Request extends { requestId: string }
    ? Omit<Request, "requestId">
    : never
  : never;

export class TtsClient {
  private worker: Worker;
  private pending = new Map<string, PendingRequest>();

  constructor(
    worker = new Worker(new URL("../workers/tts.worker.ts", import.meta.url), {
      type: "module",
    }),
  ) {
    this.worker = worker;
    this.worker.addEventListener("message", (event: MessageEvent<WorkerResponse>) => {
      const response = event.data;
      const request = this.pending.get(response.requestId);
      if (!request) return;

      if (response.type === "progress") {
        request.onProgress?.(response.progress);
        return;
      }

      this.pending.delete(response.requestId);
      if (response.type === "error") {
        request.reject(new Error(response.message));
      } else {
        request.resolve(response);
      }
    });
    this.worker.addEventListener("error", (event: ErrorEvent) => {
      event.preventDefault();
      this.rejectPending(
        new Error(event.message || "The synthesis worker stopped unexpectedly"),
      );
    });
    this.worker.addEventListener("messageerror", () => {
      this.rejectPending(new Error("The synthesis worker returned unreadable data"));
    });
  }

  private rejectPending(error: Error): void {
    for (const request of this.pending.values()) request.reject(error);
    this.pending.clear();
  }

  private send(
    request: WorkerRequestInput,
    onProgress?: (progress: number) => void,
  ): Promise<WorkerResponse> {
    const requestId = crypto.randomUUID();
    return new Promise((resolve, reject) => {
      this.pending.set(requestId, { resolve, reject, onProgress });
      this.worker.postMessage({ ...request, requestId });
    });
  }

  async load(
    modelId: ModelId,
    versionId: ModelVersionId,
    onProgress: (progress: number) => void,
  ): Promise<{ sampleRate: number; runtime: "webgpu" | "wasm" }> {
    const response = await this.send(
      { type: "load", modelId, versionId },
      onProgress,
    );
    if (response.type !== "loaded") throw new Error("Unexpected worker response");
    return response;
  }

  async listVoices(language: DocumentLanguage): Promise<Voice[]> {
    const response = await this.send({ type: "list-voices", language });
    if (response.type !== "voices") throw new Error("Unexpected worker response");
    return response.voices;
  }

  async synthesize(
    text: string,
    options: SynthesisOptions,
  ): Promise<{ audio: Float32Array; sampleRate: number }> {
    const response = await this.send({ type: "synthesize", text, options });
    if (response.type !== "audio") throw new Error("Unexpected worker response");
    return { audio: new Float32Array(response.audio), sampleRate: response.sampleRate };
  }

  async unload(): Promise<void> {
    await this.send({ type: "unload" });
  }

  terminate(): void {
    this.worker.terminate();
    this.rejectPending(new Error("TTS worker was terminated"));
  }
}
