import type { DocumentLanguage } from "../lib/chunk-text";

export type ModelId = "kokoro" | "chatterbox-ml";
export type ModelVersionId =
  | "kokoro-v1-q8"
  | "kokoro-v1-fp32"
  | "chatterbox-en-v1-webgpu"
  | "chatterbox-en-v1-wasm";

export interface ModelVersion {
  id: ModelVersionId;
  modelId: ModelId;
  name: string;
  detail: string;
  sizeBytes: number;
  dtype?: "fp32" | "q8";
  device: "webgpu" | "wasm";
}

export interface Voice {
  id: string;
  name: string;
  modelId: ModelId;
  language: DocumentLanguage;
  gender: "Female" | "Male" | "Reference";
}

export interface ModelCapabilities {
  exaggeration: boolean;
  voiceCloning: boolean;
}

export interface ModelDefinition {
  id: ModelId;
  name: string;
  description: string;
  sizeBytes: number;
  sizeLabel: string;
  languages: DocumentLanguage[];
  labels: string[];
  needsWebGPU: boolean;
  license: string;
  adapterId: ModelId;
  capabilities: ModelCapabilities;
  availability: "ready" | "spike-pending";
  versions: ModelVersion[];
}

export interface SynthesisOptions {
  voice: string;
  language: DocumentLanguage;
  speed?: number;
  exaggeration?: number;
  referenceAudio?: ArrayBuffer;
}

export type WorkerRequest =
  | { requestId: string; type: "load"; modelId: ModelId; versionId: ModelVersionId }
  | { requestId: string; type: "synthesize"; text: string; options: SynthesisOptions }
  | { requestId: string; type: "unload" }
  | { requestId: string; type: "list-voices"; language: DocumentLanguage };

export type WorkerResponse =
  | { requestId: string; type: "progress"; progress: number }
  | { requestId: string; type: "loaded"; sampleRate: number; runtime: "webgpu" | "wasm" }
  | { requestId: string; type: "voices"; voices: Voice[] }
  | { requestId: string; type: "audio"; audio: ArrayBuffer; sampleRate: number }
  | { requestId: string; type: "unloaded" }
  | { requestId: string; type: "error"; message: string };
