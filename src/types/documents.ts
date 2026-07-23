import type { DocumentLanguage } from "../lib/chunk-text";
import type { ModelId, ModelVersionId } from "./tts";

export interface Chapter {
  id: string;
  title: string;
  text: string;
}

export interface BookDocument {
  id: string;
  title: string;
  language: DocumentLanguage;
  chapters: Chapter[];
}

export interface PersistedGeneration {
  book: BookDocument;
  chunks: string[];
  audioChunks: ArrayBuffer[];
  sampleRate: number;
  modelId?: ModelId;
  versionId?: ModelVersionId;
  voiceId: string;
  completedChunks: number;
  updatedAt: number;
}

export type DocumentWorkerRequest = {
  requestId: string;
  type: "parse";
  file: ArrayBuffer;
  filename: string;
  mimeType: string;
};

export type DocumentWorkerResponse =
  | { requestId: string; type: "parsed"; title: string; chapters: Chapter[] }
  | { requestId: string; type: "error"; message: string };
