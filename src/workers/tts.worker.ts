/// <reference lib="webworker" />

import {
  AutoProcessor,
  AutoTokenizer,
  ChatterboxModel,
  StyleTextToSpeech2Model,
  Tensor,
  env,
  type Processor,
  type PreTrainedTokenizer,
  type ProgressInfo,
} from "@huggingface/transformers";
import ESpeakNg from "espeak-ng";
import { KOKORO_VOICES, MODEL_VERSIONS } from "../data/models";
import { phonemizerCodeFor } from "../lib/kokoro-language";
import { decodeWav, resampleLinear } from "../lib/wav";
import type { ModelId, WorkerRequest, WorkerResponse } from "../types/tts";

const KOKORO_MODEL_ID = "onnx-community/Kokoro-82M-v1.0-ONNX";
const CHATTERBOX_MODEL_ID = "onnx-community/chatterbox-ONNX";
const CHATTERBOX_DEFAULT_VOICE = `https://huggingface.co/${CHATTERBOX_MODEL_ID}/resolve/main/default_voice.wav`;
const SAMPLE_RATE = 24_000;
const VOICE_CACHE = "audio-whisperer-voices-v1";
const CHATTERBOX_CACHE = "audio-whisperer-chatterbox-v1";
const workerScope = self as DedicatedWorkerGlobalScope;

let kokoroModel: StyleTextToSpeech2Model | null = null;
let kokoroTokenizer: PreTrainedTokenizer | null = null;
let chatterboxModel: ChatterboxModel | null = null;
let chatterboxProcessor: Processor | null = null;
let chatterboxSpeaker: Awaited<ReturnType<ChatterboxModel["encode_speech"]>> | null = null;
let activeModelId: ModelId | null = null;
let runtime: "webgpu" | "wasm" = "wasm";
const voices = new Map<string, Float32Array>();
let phonemeFileSequence = 0;

env.allowLocalModels = false;
env.useBrowserCache = true;

function respond(response: WorkerResponse, transfer: Transferable[] = []): void {
  workerScope.postMessage(response, transfer);
}

function progressValue(info: ProgressInfo): number | null {
  if (info.status === "progress_total") {
    return info.progress;
  }
  return null;
}

async function fetchVoice(voiceId: string): Promise<Float32Array> {
  const existing = voices.get(voiceId);
  if (existing) return existing;

  const url = `https://huggingface.co/${KOKORO_MODEL_ID}/resolve/main/voices/${voiceId}.bin`;
  const cache = await caches.open(VOICE_CACHE);
  let response = await cache.match(url);
  if (!response) {
    response = await fetch(url);
    if (!response.ok) throw new Error(`Could not download voice ${voiceId}`);
    await cache.put(url, response.clone());
  }

  const voice = new Float32Array(await response.arrayBuffer());
  voices.set(voiceId, voice);
  return voice;
}

async function loadKokoro(
  requestId: string,
  versionId: Extract<WorkerRequest, { type: "load" }>["versionId"],
): Promise<void> {
  const onModelProgress = (info: ProgressInfo) => {
    const progress = progressValue(info);
    if (progress !== null) {
      respond({ requestId, type: "progress", progress });
    }
  };

  async function initialize(device: "webgpu" | "wasm", dtype: "fp32" | "q8") {
    return Promise.all([
      StyleTextToSpeech2Model.from_pretrained(KOKORO_MODEL_ID, {
        device,
        dtype,
        progress_callback: onModelProgress,
      }),
      AutoTokenizer.from_pretrained(KOKORO_MODEL_ID),
    ]);
  }

  const version = MODEL_VERSIONS.find((candidate) => candidate.id === versionId);
  if (!version || version.modelId !== "kokoro" || !version.dtype) {
    throw new Error("This Kokoro version is not available");
  }
  if (version.device === "webgpu" && !("gpu" in navigator)) {
    throw new Error("This model version requires WebGPU");
  }
  runtime = version.device;
  [kokoroModel, kokoroTokenizer] = await initialize(version.device, version.dtype);
  activeModelId = "kokoro";
  respond({ requestId, type: "loaded", sampleRate: SAMPLE_RATE, runtime });
}

async function fetchChatterboxVoice(): Promise<Float32Array> {
  const cache = await caches.open(CHATTERBOX_CACHE);
  let response = await cache.match(CHATTERBOX_DEFAULT_VOICE);
  if (!response) {
    response = await fetch(CHATTERBOX_DEFAULT_VOICE);
    if (!response.ok) throw new Error("Could not download the Chatterbox reference voice");
    await cache.put(CHATTERBOX_DEFAULT_VOICE, response.clone());
  }
  const decoded = decodeWav(await response.arrayBuffer());
  return resampleLinear(decoded.audio, decoded.sampleRate, SAMPLE_RATE);
}

async function loadChatterbox(
  requestId: string,
  versionId: Extract<WorkerRequest, { type: "load" }>["versionId"],
): Promise<void> {
  const version = MODEL_VERSIONS.find((candidate) => candidate.id === versionId);
  if (!version || version.modelId !== "chatterbox-ml") {
    throw new Error("This Chatterbox version is not available");
  }
  if (version.device === "webgpu" && !("gpu" in navigator)) {
    throw new Error("This model version requires WebGPU");
  }

  const dtype = version.device === "webgpu"
    ? { embed_tokens: "fp32", speech_encoder: "fp32", language_model: "q4f16", conditional_decoder: "fp32" } as const
    : { embed_tokens: "fp32", speech_encoder: "fp32", language_model: "q4", conditional_decoder: "fp32" } as const;
  const onModelProgress = (info: ProgressInfo) => {
    const progress = progressValue(info);
    if (progress !== null) respond({ requestId, type: "progress", progress });
  };

  const [processor, loadedModel] = await Promise.all([
    AutoProcessor.from_pretrained(CHATTERBOX_MODEL_ID),
    ChatterboxModel.from_pretrained(CHATTERBOX_MODEL_ID, {
      device: version.device,
      dtype,
      progress_callback: onModelProgress,
    }),
  ]);
  chatterboxProcessor = processor;
  chatterboxModel = loadedModel as ChatterboxModel;
  const voice = await fetchChatterboxVoice();
  chatterboxSpeaker = await (loadedModel as ChatterboxModel).encode_speech(
    new Tensor("float32", voice, [1, voice.length]),
  );
  runtime = version.device;
  activeModelId = "chatterbox-ml";
  respond({ requestId, type: "loaded", sampleRate: SAMPLE_RATE, runtime });
}

async function synthesizeKokoro(
  request: Extract<WorkerRequest, { type: "synthesize" }>,
): Promise<void> {
  if (!kokoroModel || !kokoroTokenizer) throw new Error("Download and activate Kokoro first");

  const phonemizerLanguage = phonemizerCodeFor(request.options.language);
  const phonemeFile = `phonemes-${phonemeFileSequence += 1}`;
  const espeak = await ESpeakNg({
    arguments: [
      "--phonout",
      phonemeFile,
      "-q",
      "--ipa=3",
      "-b=1",
      "-v",
      phonemizerLanguage,
      "--",
      request.text,
    ],
  });
  const phonemes = espeak.FS.readFile(phonemeFile, { encoding: "utf8" }).trim();
  if (!phonemes) throw new Error("The selected language could not be phonemized");
  const { input_ids } = kokoroTokenizer(phonemes, { truncation: true });
  const voice = await fetchVoice(request.options.voice);
  const tokenCount = input_ids.dims.at(-1) ?? 0;
  const offset = 256 * Math.min(Math.max(tokenCount - 2, 0), 509);
  const style = voice.slice(offset, offset + 256);
  const result = await kokoroModel({
    input_ids,
    style: new Tensor("float32", style, [1, 256]),
    speed: new Tensor("float32", [request.options.speed ?? 1], [1]),
  });
  const waveform = result.waveform.data as Float32Array;
  const audio = waveform.slice().buffer;

  respond(
    { requestId: request.requestId, type: "audio", audio, sampleRate: SAMPLE_RATE },
    [audio],
  );
}

async function synthesizeChatterbox(
  request: Extract<WorkerRequest, { type: "synthesize" }>,
): Promise<void> {
  if (!chatterboxModel || !chatterboxProcessor || !chatterboxSpeaker) {
    throw new Error("Download and activate Chatterbox first");
  }
  if (request.options.language !== "en") {
    throw new Error("Chatterbox currently supports English only in the browser");
  }

  const inputs = await chatterboxProcessor._call(request.text);
  const waveform = await chatterboxModel.generate({
    ...inputs,
    ...chatterboxSpeaker,
    exaggeration: request.options.exaggeration ?? 0.5,
    max_new_tokens: 256,
  }) as Tensor;
  const waveformData = waveform.data as Float32Array;
  const audio = waveformData.buffer.slice(
    waveformData.byteOffset,
    waveformData.byteOffset + waveformData.byteLength,
  ) as ArrayBuffer;
  respond(
    { requestId: request.requestId, type: "audio", audio, sampleRate: SAMPLE_RATE },
    [audio],
  );
}

workerScope.addEventListener("message", async (event: MessageEvent<WorkerRequest>) => {
  const request = event.data;
  try {
    switch (request.type) {
      case "load":
        if (request.modelId === "kokoro") await loadKokoro(request.requestId, request.versionId);
        else await loadChatterbox(request.requestId, request.versionId);
        break;
      case "list-voices":
        respond({
          requestId: request.requestId,
          type: "voices",
          voices: activeModelId === "chatterbox-ml"
            ? [{ id: "default-reference", name: "Default reference voice", language: "en", gender: "Reference", modelId: "chatterbox-ml" }]
            : KOKORO_VOICES.filter((voice) => voice.language === request.language),
        });
        break;
      case "synthesize":
        if (activeModelId === "chatterbox-ml") await synthesizeChatterbox(request);
        else await synthesizeKokoro(request);
        break;
      case "unload":
        await kokoroModel?.dispose();
        await chatterboxModel?.dispose();
        kokoroModel = null;
        kokoroTokenizer = null;
        chatterboxModel = null;
        chatterboxProcessor = null;
        chatterboxSpeaker = null;
        activeModelId = null;
        voices.clear();
        respond({ requestId: request.requestId, type: "unloaded" });
        break;
    }
  } catch (error) {
    respond({
      requestId: request.requestId,
      type: "error",
      message: error instanceof Error ? error.message : "Unknown synthesis error",
    });
  }
});
