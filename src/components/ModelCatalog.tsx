import {
  languagesFor,
  MODEL_CATALOG,
  modelVersionsFor,
  voicesFor,
} from "../data/models";
import type { DocumentLanguage } from "../lib/chunk-text";
import type { ModelState } from "../lib/model-state";
import type { ModelId, ModelVersionId } from "../types/tts";
import { CheckIcon, DownloadIcon, TrashIcon } from "./Icons";

interface ModelCatalogProps {
  states: Record<ModelId, ModelState>;
  hasWebGPU: boolean;
  modelId: ModelId | "";
  versionId: ModelVersionId | "";
  language: DocumentLanguage | "";
  voiceId: string;
  onModelChange: (modelId: ModelId | "") => void;
  onVersionChange: (versionId: ModelVersionId | "") => void;
  onLanguageChange: (language: DocumentLanguage | "") => void;
  onVoiceChange: (voiceId: string) => void;
  onDownload: (modelId: ModelId, versionId: ModelVersionId) => void;
  onActivate: (modelId: ModelId, versionId: ModelVersionId) => void;
  onDelete: (modelId: ModelId) => void;
}

function stateLabel(state: ModelState): string {
  if (state.status === "downloading") {
    return state.progress >= 99 ? "Preparing narrator…" : `Downloading ${state.progress}%`;
  }
  if (state.status === "active") return "Active narrator";
  if (state.status === "ready") return "Ready on this device";
  if (state.status === "error") return "Download interrupted";
  return "Not downloaded";
}

export function ModelCatalog({
  states,
  hasWebGPU,
  modelId,
  versionId,
  language,
  voiceId,
  onModelChange,
  onVersionChange,
  onLanguageChange,
  onVoiceChange,
  onDownload,
  onActivate,
  onDelete,
}: ModelCatalogProps) {
  const model = MODEL_CATALOG.find((candidate) => candidate.id === modelId);
  const versions = modelId ? modelVersionsFor(modelId) : [];
  const version = versions.find((candidate) => candidate.id === versionId);
  const languages = modelId ? languagesFor(modelId) : [];
  const voices = modelId && language ? voicesFor(modelId, language) : [];
  const state = modelId ? states[modelId] : undefined;
  const configured = Boolean(model && version && language && voiceId);
  const incompatible = version?.device === "webgpu" && !hasWebGPU;

  return (
    <aside className="narrator-panel" aria-labelledby="narrator-heading">
      <div className="narrator-art" aria-hidden="true">
        <img src="/images/books-and-coffee.png" alt="" />
      </div>
      <div className="section-heading narrator-heading">
        <div>
          <h2 id="narrator-heading">Narrator setup</h2>
          <p>Choose each option in order. We only show compatible choices.</p>
        </div>
        <span className={`runtime-badge ${hasWebGPU ? "available" : "fallback"}`}>
          {hasWebGPU ? "WebGPU ready" : "WASM mode"}
        </span>
      </div>

      <ol className="narrator-steps">
        <li className={modelId ? "complete" : "current"}>
          <span className="step-number">1</span>
          <label>
            Model
            <select value={modelId} onChange={(event) => onModelChange(event.target.value as ModelId | "")}>
              <option value="">Select a model</option>
              {MODEL_CATALOG.map((candidate) => (
                <option value={candidate.id} key={candidate.id}>
                  {candidate.name}
                </option>
              ))}
            </select>
          </label>
        </li>

        {modelId && (
          <li className={versionId ? "complete" : "current"}>
            <span className="step-number">2</span>
            <label>
              Model version
              <select
                value={versionId}
                onChange={(event) => onVersionChange(event.target.value as ModelVersionId | "")}
              >
                <option value="">Select a version</option>
                {versions.map((candidate) => (
                  <option value={candidate.id} key={candidate.id}>{candidate.name} · {candidate.detail}</option>
                ))}
              </select>
            </label>
          </li>
        )}

        {versionId && (
          <li className={language ? "complete" : "current"}>
            <span className="step-number">3</span>
            <label>
              Language
              <select
                value={language}
                onChange={(event) => onLanguageChange(event.target.value as DocumentLanguage | "")}
              >
                <option value="">Select a language</option>
                {languages.map((candidate) => (
                  <option value={candidate.code} key={candidate.code}>{candidate.name}</option>
                ))}
              </select>
            </label>
          </li>
        )}

        {language && (
          <li className={voiceId ? "complete" : "current"}>
            <span className="step-number">4</span>
            <label>
              Voice
              <select value={voiceId} onChange={(event) => onVoiceChange(event.target.value)}>
                <option value="">Select a voice</option>
                {voices.map((candidate) => (
                  <option value={candidate.id} key={candidate.id}>{candidate.name} · {candidate.gender}</option>
                ))}
              </select>
            </label>
          </li>
        )}
      </ol>

      {model ? (
        <div className={`selected-model${state?.status === "active" ? " active" : ""}`}>
          <div className="model-title-row">
            <div>
              <h3>{model.name}</h3>
              <span className="model-size">
                {version?.detail ?? model.sizeLabel} · {model.license}
              </span>
            </div>
            {state && <span className={`model-state ${state.status}`}>{stateLabel(state)}</span>}
          </div>
          <p>{model.description}</p>
          <div className="tag-list">
            {model.labels.map((label) => <span key={label}>{label}</span>)}
          </div>

          {model.id === "chatterbox-ml" && (
            <p className="browser-note"><strong>Browser availability:</strong> Chatterbox currently supports English only in the browser.</p>
          )}
          {incompatible && (
            <p className="error-text" role="alert">This version requires WebGPU. Choose a WASM-compatible version on this device.</p>
          )}
          {state?.error && <p className="error-text" role="alert">{state.error}</p>}
          {state?.status === "downloading" && (
            <div className="progress-track" aria-label={state.progress >= 99 ? `Preparing ${model.name}` : `Downloading ${model.name}`}>
              <span style={{ width: `${state.progress}%` }} />
            </div>
          )}
          {state?.benchmark && <p className="benchmark">Measured ~{state.benchmark.toFixed(1)}× real-time on this device</p>}

          <div className="model-actions">
            {state?.status === "ready" ? (
              <button type="button" className="button primary" disabled={!configured || incompatible} onClick={() => onActivate(model.id, version!.id)}>
                Use this narrator
              </button>
            ) : state?.status === "active" ? (
              <span className="active-label"><CheckIcon /> Selected</span>
            ) : state?.status !== "downloading" ? (
              <button type="button" className="button primary" disabled={!configured || incompatible} onClick={() => onDownload(model.id, version!.id)}>
                <DownloadIcon /> Download narrator
              </button>
            ) : null}
            {(state?.status === "ready" || state?.status === "active") && (
              <button type="button" className="text-button danger" onClick={() => onDelete(model.id)}>
                <TrashIcon /> Remove
              </button>
            )}
          </div>
        </div>
      ) : (
        <p className="selection-empty">Start with a model. Version, language, and voice will follow.</p>
      )}
    </aside>
  );
}
