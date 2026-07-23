import { useEffect, useMemo, useRef, useState } from "react";
import { GenerationPanel } from "./components/GenerationPanel";
import { LockIcon, WaveIcon } from "./components/Icons";
import { ModelCatalog } from "./components/ModelCatalog";
import { SourcePanel } from "./components/SourcePanel";
import { MODEL_CATALOG, MODEL_VERSIONS, voicesFor } from "./data/models";
import { concatenateAudio, downloadBlob, encodeWav } from "./lib/audio";
import { chunkText, type DocumentLanguage } from "./lib/chunk-text";
import { parseBookFile } from "./lib/document-client";
import { clearGeneration, loadGeneration, saveGeneration } from "./lib/generation-store";
import { encodeMp3 } from "./lib/mp3-client";
import { modelStateReducer, type ModelAction, type ModelState } from "./lib/model-state";
import { TtsClient } from "./lib/tts-client";
import type { BookDocument, Chapter } from "./types/documents";
import type { ModelId, ModelVersionId } from "./types/tts";

const EMPTY_MODEL: ModelState = { status: "not-downloaded", progress: 0 };

function initialModelStates(): Record<ModelId, ModelState> {
  return { kokoro: EMPTY_MODEL, "chatterbox-ml": EMPTY_MODEL };
}

function safeFilename(value: string): string {
  return (value.trim() || "audiobook")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

const BENCHMARK_TEXT: Partial<Record<DocumentLanguage, string>> = {
  en: "A quiet page turns in the evening light.",
  "en-us": "A quiet page turns in the evening light.",
  "en-gb": "A quiet page turns in the evening light.",
  es: "Una página tranquila gira bajo la luz de la tarde.",
  fr: "Une page tranquille tourne dans la lumière du soir.",
  hi: "शाम की रोशनी में एक शांत पन्ना पलटता है।",
  it: "Una pagina tranquilla gira nella luce della sera.",
  ja: "夕暮れの光の中で、静かにページがめくられます。",
  "pt-br": "Uma página tranquila vira à luz do entardecer.",
  zh: "一页书在傍晚的光线中轻轻翻过。",
};

export default function App() {
  const [sourceName, setSourceName] = useState("");
  const [text, setText] = useState("");
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [parsing, setParsing] = useState(false);
  const [selectedModelId, setSelectedModelId] = useState<ModelId | "">("");
  const [selectedVersionId, setSelectedVersionId] = useState<ModelVersionId | "">("");
  const [language, setLanguage] = useState<DocumentLanguage | "">("");
  const [voiceId, setVoiceId] = useState("");
  const [modelStates, setModelStates] = useState(initialModelStates);
  const [audioChunks, setAudioChunks] = useState<Float32Array[]>([]);
  const [sampleRate, setSampleRate] = useState(24_000);
  const [completed, setCompleted] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Choose a narrator to begin.");
  const clientRef = useRef<TtsClient | null>(null);
  const loadedModelRef = useRef(false);
  const hasWebGPU = "gpu" in navigator;

  const segments = useMemo(
    () => (language
      ? chunkText(
          text,
          language,
          selectedModelId === "chatterbox-ml" ? { minChars: 60, maxChars: 120 } : undefined,
        )
      : []),
    [text, language, selectedModelId],
  );
  const audioUrl = useMemo(() => {
    if (!audioChunks.length || typeof URL.createObjectURL !== "function") return null;
    const wav = encodeWav(concatenateAudio(audioChunks), sampleRate);
    return URL.createObjectURL(new Blob([wav], { type: "audio/wav" }));
  }, [audioChunks, sampleRate]);
  const activeModel = Object.entries(modelStates).find(([, state]) => state.status === "active")?.[0] as ModelId | undefined;
  const narratorLabel = useMemo(() => {
    if (!selectedModelId || !language || !voiceId) return "";
    const model = MODEL_CATALOG.find((entry) => entry.id === selectedModelId);
    const voice = voicesFor(selectedModelId, language).find((entry) => entry.id === voiceId);
    return model && voice ? `${model.name} · ${voice.name}` : "";
  }, [selectedModelId, language, voiceId]);

  useEffect(() => {
    if (!("indexedDB" in window)) return;
    void loadGeneration().then((saved) => {
      if (!saved) return;
      const restoredLanguage = saved.book.language === "en" && saved.modelId !== "chatterbox-ml"
        ? "en-us"
        : saved.book.language;
      setSourceName(saved.book.title);
      setSelectedModelId(saved.modelId ?? "kokoro");
      setSelectedVersionId(saved.versionId ?? "kokoro-v1-q8");
      setLanguage(restoredLanguage);
      setChapters(saved.book.chapters);
      setText(saved.book.chapters.map((chapter) => chapter.text).join("\n\n"));
      setVoiceId(saved.voiceId);
      setAudioChunks(saved.audioChunks.map((buffer) => new Float32Array(buffer)));
      setCompleted(saved.completedChunks);
      setSampleRate(saved.sampleRate);
      setStatusMessage(`Restored ${saved.completedChunks} generated segments from this device.`);
    });
    return () => clientRef.current?.terminate();
  }, []);

  useEffect(
    () => () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    },
    [audioUrl],
  );

  function dispatchModel(modelId: ModelId, action: ModelAction) {
    setModelStates((states) => ({
      ...states,
      [modelId]: modelStateReducer(states[modelId], action),
    }));
  }

  function resetAudio() {
    const hadProgress = audioChunks.length > 0 || completed > 0;
    setAudioChunks([]);
    setCompleted(0);
    if (hadProgress && typeof indexedDB !== "undefined") void clearGeneration();
  }

  function releaseLoadedModel() {
    clientRef.current?.terminate();
    clientRef.current = null;
    loadedModelRef.current = false;
    setModelStates((states) => Object.fromEntries(
      Object.entries(states).map(([id, state]) => [
        id,
        state.status === "active" ? modelStateReducer(state, { type: "deactivated" }) : state,
      ]),
    ) as Record<ModelId, ModelState>);
  }

  function changeModel(next: ModelId | "") {
    releaseLoadedModel();
    setSelectedModelId(next);
    setSelectedVersionId("");
    setLanguage("");
    setVoiceId("");
    resetAudio();
    setStatusMessage(next ? "Now choose a model version." : "Choose a narrator to begin.");
  }

  function changeVersion(next: ModelVersionId | "") {
    releaseLoadedModel();
    if (selectedModelId) dispatchModel(selectedModelId, { type: "deleted" });
    setSelectedVersionId(next);
    setLanguage("");
    setVoiceId("");
    resetAudio();
    setStatusMessage(next ? "Choose the language for your manuscript." : "Choose a model version.");
  }

  function changeLanguage(next: DocumentLanguage | "") {
    setLanguage(next);
    setVoiceId("");
    resetAudio();
    setStatusMessage(next ? "Choose a voice for this language." : "Choose the manuscript language.");
  }

  function changeVoice(next: string) {
    setVoiceId(next);
    resetAudio();
    setStatusMessage(next ? "Narrator configured. Download it to this device." : "Choose a voice.");
  }

  async function loadModel(modelId: ModelId, versionId: ModelVersionId, benchmark: boolean) {
    const model = MODEL_CATALOG.find((entry) => entry.id === modelId);
    const version = MODEL_VERSIONS.find((entry) => entry.id === versionId);
    if (!model || !version || !language || !voiceId) return;

    if (navigator.storage?.estimate) {
      const estimate = await navigator.storage.estimate();
      const available = (estimate.quota ?? 0) - (estimate.usage ?? 0);
      if (available > 0 && available < version.sizeBytes) {
        setStatusMessage(`Storage warning: ${version.name} may need more space than this browser reports available.`);
      }
    }

    dispatchModel(modelId, { type: "download-started" });
    const client = clientRef.current ?? new TtsClient();
    clientRef.current = client;

    try {
      const loaded = await client.load(modelId, versionId, (progress) =>
        dispatchModel(modelId, { type: "download-progressed", progress }),
      );
      setSampleRate(loaded.sampleRate);
      loadedModelRef.current = true;
      dispatchModel(modelId, { type: "download-completed" });
      await navigator.storage?.persist?.();
      setStatusMessage(`${model.name} ${version.name} is ready. Select it to begin.`);

      const benchmarkText = BENCHMARK_TEXT[language];
      if (benchmark && benchmarkText) {
        const started = performance.now();
        const result = await client.synthesize(benchmarkText, { voice: voiceId, language });
        const elapsed = (performance.now() - started) / 1_000;
        const measured = result.audio.length / result.sampleRate / Math.max(elapsed, 0.01);
        dispatchModel(modelId, { type: "benchmark-completed", benchmark: measured });
      }
    } catch (error) {
      if (loadedModelRef.current) {
        releaseLoadedModel();
        setStatusMessage(`${model.name} is cached. The speed check could not finish.`);
        return;
      }
      client.terminate();
      if (clientRef.current === client) clientRef.current = null;
      dispatchModel(modelId, {
        type: "failed",
        error: error instanceof Error ? error.message : "Model download failed",
      });
      setStatusMessage("The model download stopped. You can safely retry.");
    }
  }

  async function activateModel(modelId: ModelId, versionId: ModelVersionId) {
    if (!loadedModelRef.current) await loadModel(modelId, versionId, false);
    if (clientRef.current && loadedModelRef.current) {
      for (const id of Object.keys(modelStates) as ModelId[]) {
        if (modelStates[id].status === "active") dispatchModel(id, { type: "deactivated" });
      }
      dispatchModel(modelId, { type: "activated" });
      setStatusMessage("Narrator selected. Add or upload your text next.");
    }
  }

  async function deleteModel(modelId: ModelId) {
    await clientRef.current?.unload();
    releaseLoadedModel();
    if ("caches" in window) {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter((name) => name.includes("transformers") || name.includes("audio-whisperer"))
          .map((name) => caches.delete(name)),
      );
    }
    dispatchModel(modelId, { type: "deleted" });
    setStatusMessage("Model files were removed from browser storage.");
  }

  async function handleFile(file: File) {
    if (!/\.(pdf|epub)$/i.test(file.name)) {
      setStatusMessage("Choose a PDF or EPUB file.");
      return;
    }
    setParsing(true);
    setStatusMessage(`Reading ${file.name} locally…`);
    try {
      const parsed = await parseBookFile(file);
      setSourceName(parsed.title);
      setChapters(parsed.chapters);
      setText(parsed.chapters.map((chapter) => chapter.text).join("\n\n"));
      resetAudio();
      setStatusMessage(`Extracted ${parsed.chapters.length} chapter${parsed.chapters.length === 1 ? "" : "s"}. Review the text before generating.`);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Could not read this book.");
    } finally {
      setParsing(false);
    }
  }

  function bookDocument(selectedLanguage: DocumentLanguage): BookDocument {
    return {
      id: "active-book",
      title: sourceName.trim() || "Audiobook",
      language: selectedLanguage,
      chapters: chapters.length
        ? chapters
        : [{ id: "pasted-text", title: "Manuscript", text }],
    };
  }

  async function generate() {
    const client = clientRef.current;
    if (!client || !activeModel || !selectedVersionId || !language || !voiceId || !segments.length) return;
    setGenerating(true);
    setStatusMessage("Generating locally. You can listen as each segment completes.");
    const working = [...audioChunks];

    try {
      for (let index = completed; index < segments.length; index += 1) {
        const result = await client.synthesize(segments[index], { voice: voiceId, language });
        working[index] = result.audio;
        setSampleRate(result.sampleRate);
        setAudioChunks([...working]);
        setCompleted(index + 1);
        await saveGeneration({
          book: bookDocument(language),
          chunks: segments,
          audioChunks: working.map((chunk) => chunk.slice().buffer),
          sampleRate: result.sampleRate,
          modelId: activeModel,
          versionId: selectedVersionId,
          voiceId,
          completedChunks: index + 1,
          updatedAt: Date.now(),
        });
      }
      setStatusMessage("Audiobook complete. Export it as WAV or MP3.");
    } catch (error) {
      setStatusMessage(`${error instanceof Error ? error.message : "Generation stopped"} Progress through segment ${working.length} is saved.`);
    } finally {
      setGenerating(false);
    }
  }

  async function regenerate(index: number) {
    const client = clientRef.current;
    if (!client || !language || !voiceId) return;
    setGenerating(true);
    try {
      const result = await client.synthesize(segments[index], { voice: voiceId, language });
      const next = [...audioChunks];
      next[index] = result.audio;
      setAudioChunks(next);
      setStatusMessage(`Segment ${index + 1} was regenerated.`);
    } finally {
      setGenerating(false);
    }
  }

  function exportWav() {
    const wav = encodeWav(concatenateAudio(audioChunks), sampleRate);
    downloadBlob(new Blob([wav], { type: "audio/wav" }), `${safeFilename(sourceName)}.wav`);
  }

  async function exportMp3() {
    setExporting(true);
    try {
      const mp3 = await encodeMp3(concatenateAudio(audioChunks), sampleRate);
      downloadBlob(new Blob([mp3], { type: "audio/mpeg" }), `${safeFilename(sourceName)}.mp3`);
    } finally {
      setExporting(false);
    }
  }

  return (
    <>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="Audio Whisperer home">
          <span className="brand-mark"><WaveIcon /></span>
          <span>Audio Whisperer</span>
        </a>
        <div className="local-badge"><LockIcon /> 100% local · no uploads</div>
      </header>

      <main id="main-content">
        <section className="book-hero" id="top">
          <div className="hero-copy">
            <span className="hero-label">Your private reading room</span>
            <h1>Create an audiobook</h1>
            <p>Choose a voice, open your manuscript, and turn the next quiet chapter into something you can listen to.</p>
            <div className="privacy-note">
              <LockIcon />
              <div><strong>Private by design</strong><span>Your books and audio never leave this browser.</span></div>
            </div>
          </div>
          <div className="hero-image">
            <img src="/images/reading-table-hero.png" alt="" />
            <span>From page to voice, all on your device.</span>
          </div>
        </section>

        <div className="status-bar" role="status" aria-live="polite">
          <span className="status-dot" /> {statusMessage}
        </div>

        <div className="app-layout">
          <ModelCatalog
            states={modelStates}
            hasWebGPU={hasWebGPU}
            modelId={selectedModelId}
            versionId={selectedVersionId}
            language={language}
            voiceId={voiceId}
            onModelChange={changeModel}
            onVersionChange={changeVersion}
            onLanguageChange={changeLanguage}
            onVoiceChange={changeVoice}
            onDownload={(modelId, versionId) => void loadModel(modelId, versionId, true)}
            onActivate={(modelId, versionId) => void activateModel(modelId, versionId)}
            onDelete={(modelId) => void deleteModel(modelId)}
          />
          <div className="workbench">
            <SourcePanel
              text={text}
              segmentCount={segments.length}
              parsing={parsing}
              onTextChange={(next) => { setText(next); setChapters([]); setSourceName(""); resetAudio(); }}
              onFile={(file) => void handleFile(file)}
              onClear={() => { setSourceName(""); setText(""); setChapters([]); resetAudio(); }}
            />
            <GenerationPanel
              segments={segments}
              completed={completed}
              narratorLabel={narratorLabel}
              generating={generating}
              exporting={exporting}
              audioUrl={audioUrl}
              canGenerate={Boolean(activeModel === selectedModelId && segments.length && voiceId && language)}
              onGenerate={() => void generate()}
              onRegenerate={(index) => void regenerate(index)}
              onExportWav={exportWav}
              onExportMp3={() => void exportMp3()}
            />
          </div>
        </div>
      </main>

      <footer>
        <span>Audio Whisperer</span>
        <span>No account, API key, uploads, or telemetry.</span>
      </footer>
    </>
  );
}
