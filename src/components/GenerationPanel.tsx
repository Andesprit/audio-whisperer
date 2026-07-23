import { DownloadIcon, SparkIcon, WaveIcon } from "./Icons";

interface GenerationPanelProps {
  segments: string[];
  completed: number;
  narratorLabel: string;
  generating: boolean;
  exporting: boolean;
  audioUrl: string | null;
  canGenerate: boolean;
  onGenerate: () => void;
  onRegenerate: (index: number) => void;
  onExportWav: () => void;
  onExportMp3: () => void;
}

export function GenerationPanel({
  segments,
  completed,
  narratorLabel,
  generating,
  exporting,
  audioUrl,
  canGenerate,
  onGenerate,
  onRegenerate,
  onExportWav,
  onExportMp3,
}: GenerationPanelProps) {
  const percent = segments.length ? Math.round((completed / segments.length) * 100) : 0;

  return (
    <section className="generation-panel" aria-labelledby="generation-heading">
      <div className="section-heading studio-heading">
        <div>
          <h2 id="generation-heading">Studio</h2>
          <p>{narratorLabel || "Finish narrator setup to unlock generation."}</p>
        </div>
        <WaveIcon className="heading-icon" />
      </div>

      <div className="generation-summary">
        <div>
          <strong>{completed} of {segments.length}</strong>
          <span>segments rendered</span>
        </div>
        <strong>{percent}%</strong>
      </div>
      <div className="generation-progress" aria-label={`${percent}% generated`}>
        <span style={{ width: `${percent}%` }} />
      </div>

      <button className="button primary generate-button" type="button" disabled={!canGenerate || generating} onClick={onGenerate}>
        <SparkIcon />
        {generating ? `Generating ${completed + 1} of ${segments.length}…` : completed ? "Resume audiobook" : "Generate audiobook"}
      </button>
      <p className="leave-open-note">Keep this tab open while generating. Progress is saved after every segment.</p>

      {segments.length > 0 && (
        <div className="segment-preview">
          <div className="segment-preview-heading">
            <h3>Production queue</h3>
            <span>{completed} / {segments.length}</span>
          </div>
          <ol>
            {segments.slice(0, 8).map((segment, index) => (
              <li className={index < completed ? "complete" : index === completed && generating ? "current" : ""} key={`${index}-${segment.slice(0, 16)}`}>
                <span className="segment-index">{String(index + 1).padStart(2, "0")}</span>
                <p>{segment}</p>
                {index < completed && (
                  <button type="button" className="text-button" onClick={() => onRegenerate(index)} disabled={generating}>
                    Regenerate
                  </button>
                )}
              </li>
            ))}
          </ol>
          {segments.length > 8 && <p className="more-segments">+ {segments.length - 8} more segments</p>}
        </div>
      )}

      {audioUrl && (
        <div className="player-card">
          <div>
            <span className="playing-label">Generated audio</span>
            <strong>Listen while the rest renders</strong>
          </div>
          <audio controls src={audioUrl}>Your browser does not support audio playback.</audio>
          <div className="export-actions">
            <button type="button" className="button secondary" onClick={onExportWav}>
              <DownloadIcon /> WAV
            </button>
            <button type="button" className="button secondary" onClick={onExportMp3} disabled={exporting}>
              <DownloadIcon /> {exporting ? "Encoding…" : "MP3"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
