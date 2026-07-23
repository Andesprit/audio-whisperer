import { useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { TrashIcon, UploadIcon } from "./Icons";

interface SourcePanelProps {
  text: string;
  segmentCount: number;
  parsing: boolean;
  onTextChange: (text: string) => void;
  onFile: (file: File) => void;
  onClear: () => void;
}

export function SourcePanel({
  text,
  segmentCount,
  parsing,
  onTextChange,
  onFile,
  onClear,
}: SourcePanelProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) onFile(file);
    event.target.value = "";
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files[0];
    if (file) onFile(file);
  }

  return (
    <section
      className={`source-panel${dragging ? " is-dragging" : ""}`}
      aria-labelledby="source-heading"
      onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
      }}
      onDrop={handleDrop}
    >
      <div className="section-heading">
        <div>
          <h2 id="source-heading">Manuscript</h2>
          <p>Paste your text below or import a PDF or EPUB from this device.</p>
        </div>
      </div>

      <div className="editor-toolbar">
        <button
          type="button"
          className="button secondary"
          onClick={() => fileRef.current?.click()}
          disabled={parsing}
        >
          <UploadIcon /> {parsing ? "Reading book…" : "Import PDF or EPUB"}
        </button>
        <input
          ref={fileRef}
          hidden
          type="file"
          accept=".pdf,.epub,application/pdf,application/epub+zip"
          onChange={handleFile}
        />
        <span className="drop-hint">or drop a file here</span>
        <span className="field-meta" aria-live="polite">
          {segmentCount} {segmentCount === 1 ? "segment" : "segments"} ready
        </span>
        {text && (
          <button className="text-button danger clear-button" type="button" onClick={onClear}>
            <TrashIcon /> Clear
          </button>
        )}
      </div>

      <div className={`editor-surface${parsing ? " is-loading" : ""}`}>
        {dragging && <div className="drop-overlay"><UploadIcon /> Drop your book to import it</div>}
        <label className="visually-hidden" htmlFor="book-text">Book text</label>
        <textarea
          id="book-text"
          aria-label="Book text"
          value={text}
          onChange={(event) => onTextChange(event.target.value)}
          placeholder="Paste a chapter, essay, or full manuscript here…"
          rows={18}
        />
      </div>
      <p className="helper">Review imported text before generating. Your edits are saved locally.</p>
    </section>
  );
}
