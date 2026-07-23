import type { DocumentLanguage } from "../lib/chunk-text";
import type {
  ModelDefinition,
  ModelId,
  ModelVersion,
  Voice,
} from "../types/tts";

// Language and voice inventory: https://huggingface.co/hexgrad/Kokoro-82M/blob/main/VOICES.md
// Browser model versions: https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX#quantizations
// Verified browser adapter: https://github.com/resemble-ai/transformersjs-chatterbox-demo

export interface ModelLanguage {
  code: DocumentLanguage;
  name: string;
}

export const KOKORO_LANGUAGES: ModelLanguage[] = [
  { code: "en-us", name: "American English" },
  { code: "en-gb", name: "British English" },
  { code: "ja", name: "Japanese" },
  { code: "zh", name: "Mandarin Chinese" },
  { code: "es", name: "Spanish" },
  { code: "fr", name: "French" },
  { code: "hi", name: "Hindi" },
  { code: "it", name: "Italian" },
  { code: "pt-br", name: "Brazilian Portuguese" },
];

export const CHATTERBOX_LANGUAGES: ModelLanguage[] = [{ code: "en", name: "English" }];

export const MODEL_VERSIONS: ModelVersion[] = [
  {
    id: "kokoro-v1-q8",
    modelId: "kokoro",
    name: "v1.0 Compact",
    detail: "q8 · 92 MB · widest compatibility",
    sizeBytes: 92_400_000,
    dtype: "q8",
    device: "wasm",
  },
  {
    id: "kokoro-v1-fp32",
    modelId: "kokoro",
    name: "v1.0 Full quality",
    detail: "fp32 · 326 MB · WebGPU",
    sizeBytes: 326_000_000,
    dtype: "fp32",
    device: "webgpu",
  },
  {
    id: "chatterbox-en-v1-webgpu",
    modelId: "chatterbox-ml",
    name: "English v1 · Fast",
    detail: "~1.5 GB · WebGPU",
    sizeBytes: 1_500_000_000,
    device: "webgpu",
  },
  {
    id: "chatterbox-en-v1-wasm",
    modelId: "chatterbox-ml",
    name: "English v1 · Compatible",
    detail: "~1.5 GB · WASM fallback",
    sizeBytes: 1_500_000_000,
    device: "wasm",
  },
];

function voice(
  id: string,
  name: string,
  language: DocumentLanguage,
  gender: Voice["gender"],
): Voice {
  return { id, name, language, gender, modelId: "kokoro" };
}

export const KOKORO_VOICES: Voice[] = [
  voice("af_heart", "Heart", "en-us", "Female"),
  voice("af_alloy", "Alloy", "en-us", "Female"),
  voice("af_aoede", "Aoede", "en-us", "Female"),
  voice("af_bella", "Bella", "en-us", "Female"),
  voice("af_jessica", "Jessica", "en-us", "Female"),
  voice("af_kore", "Kore", "en-us", "Female"),
  voice("af_nicole", "Nicole", "en-us", "Female"),
  voice("af_nova", "Nova", "en-us", "Female"),
  voice("af_river", "River", "en-us", "Female"),
  voice("af_sarah", "Sarah", "en-us", "Female"),
  voice("af_sky", "Sky", "en-us", "Female"),
  voice("am_adam", "Adam", "en-us", "Male"),
  voice("am_echo", "Echo", "en-us", "Male"),
  voice("am_eric", "Eric", "en-us", "Male"),
  voice("am_fenrir", "Fenrir", "en-us", "Male"),
  voice("am_liam", "Liam", "en-us", "Male"),
  voice("am_michael", "Michael", "en-us", "Male"),
  voice("am_onyx", "Onyx", "en-us", "Male"),
  voice("am_puck", "Puck", "en-us", "Male"),
  voice("am_santa", "Santa", "en-us", "Male"),
  voice("bf_alice", "Alice", "en-gb", "Female"),
  voice("bf_emma", "Emma", "en-gb", "Female"),
  voice("bf_isabella", "Isabella", "en-gb", "Female"),
  voice("bf_lily", "Lily", "en-gb", "Female"),
  voice("bm_daniel", "Daniel", "en-gb", "Male"),
  voice("bm_fable", "Fable", "en-gb", "Male"),
  voice("bm_george", "George", "en-gb", "Male"),
  voice("bm_lewis", "Lewis", "en-gb", "Male"),
  voice("jf_alpha", "Alpha", "ja", "Female"),
  voice("jf_gongitsune", "Gongitsune", "ja", "Female"),
  voice("jf_nezumi", "Nezumi", "ja", "Female"),
  voice("jf_tebukuro", "Tebukuro", "ja", "Female"),
  voice("jm_kumo", "Kumo", "ja", "Male"),
  voice("zf_xiaobei", "Xiaobei", "zh", "Female"),
  voice("zf_xiaoni", "Xiaoni", "zh", "Female"),
  voice("zf_xiaoxiao", "Xiaoxiao", "zh", "Female"),
  voice("zf_xiaoyi", "Xiaoyi", "zh", "Female"),
  voice("zm_yunjian", "Yunjian", "zh", "Male"),
  voice("zm_yunxi", "Yunxi", "zh", "Male"),
  voice("zm_yunxia", "Yunxia", "zh", "Male"),
  voice("zm_yunyang", "Yunyang", "zh", "Male"),
  voice("ef_dora", "Dora", "es", "Female"),
  voice("em_alex", "Alex", "es", "Male"),
  voice("em_santa", "Santa", "es", "Male"),
  voice("ff_siwis", "Siwis", "fr", "Female"),
  voice("hf_alpha", "Alpha", "hi", "Female"),
  voice("hf_beta", "Beta", "hi", "Female"),
  voice("hm_omega", "Omega", "hi", "Male"),
  voice("hm_psi", "Psi", "hi", "Male"),
  voice("if_sara", "Sara", "it", "Female"),
  voice("im_nicola", "Nicola", "it", "Male"),
  voice("pf_dora", "Dora", "pt-br", "Female"),
  voice("pm_alex", "Alex", "pt-br", "Male"),
  voice("pm_santa", "Santa", "pt-br", "Male"),
];

export const MODEL_CATALOG: ModelDefinition[] = [
  {
    id: "kokoro",
    name: "Kokoro 82M",
    description: "A nimble local narrator with a broad built-in voice library.",
    sizeBytes: 326_000_000,
    sizeLabel: "92–326 MB",
    languages: KOKORO_LANGUAGES.map(({ code }) => code),
    labels: ["Fast", "54 voices", "9 language variants"],
    needsWebGPU: false,
    license: "Apache 2.0",
    adapterId: "kokoro",
    capabilities: { exaggeration: false, voiceCloning: false },
    availability: "ready",
    versions: MODEL_VERSIONS.filter(({ modelId }) => modelId === "kokoro"),
  },
  {
    id: "chatterbox-ml",
    name: "Chatterbox English",
    description: "An expressive English narrator using the verified browser build and its bundled reference voice.",
    sizeBytes: 1_500_000_000,
    sizeLabel: "~1.5 GB",
    languages: CHATTERBOX_LANGUAGES.map(({ code }) => code),
    labels: ["Expressive", "English only", "Bundled voice"],
    needsWebGPU: false,
    license: "MIT",
    adapterId: "chatterbox-ml",
    capabilities: { exaggeration: true, voiceCloning: false },
    availability: "ready",
    versions: MODEL_VERSIONS.filter(({ modelId }) => modelId === "chatterbox-ml"),
  },
];

export function modelVersionsFor(modelId: ModelId): ModelVersion[] {
  return MODEL_VERSIONS.filter((version) => version.modelId === modelId);
}

export function languagesFor(modelId: ModelId): ModelLanguage[] {
  return modelId === "kokoro" ? KOKORO_LANGUAGES : CHATTERBOX_LANGUAGES;
}

export function voicesFor(modelId: ModelId, language: DocumentLanguage): Voice[] {
  if (modelId === "chatterbox-ml") {
    return [{
      id: "default-reference",
      name: "Default reference voice",
      language,
      gender: "Reference",
      modelId,
    }];
  }
  return KOKORO_VOICES.filter((candidate) => candidate.language === language);
}

export const LANGUAGE_NAMES = Object.fromEntries(
  [...KOKORO_LANGUAGES, ...CHATTERBOX_LANGUAGES].map(({ code, name }) => [code, name]),
) as Record<DocumentLanguage, string>;
