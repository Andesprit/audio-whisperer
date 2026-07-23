# Audio Whisperer

A static, private audiobook studio that runs entirely in the browser. Paste text or import a PDF/EPUB, download a local narrator, listen while segments generate, resume after closing the tab, and export WAV or MP3 audio.

**Live app:** https://audio-whisperer.andesprit.com

## Run locally

```bash
npm install --ignore-scripts
npm run dev
```

The native `onnxruntime-node` install script is intentionally skipped. Audio Whisperer uses the browser-only WebGPU/WASM runtime.

## Verification

```bash
npm test
npm run lint
npm run build
```

## What works

- Pick the model, runtime version, language, and voice before adding a manuscript.
- Use all nine Kokoro v1.0 language variants and all 54 official voices.
- Choose compact q8/WASM or full-quality fp32/WebGPU Kokoro builds.
- Paste and edit a manuscript in one text area, without a separate title field.
- Extract ordered EPUB chapters in a document worker.
- Extract and clean PDF text in a document worker.
- Sentence-aware 200–400 character segmentation with `Intl.Segmenter`.
- Download and run Kokoro v1.0 across American/British English, Japanese, Mandarin Chinese, Spanish, French, Hindi, Italian, and Brazilian Portuguese.
- Download and run the verified English-only Chatterbox browser model with its bundled reference voice.
- Prefer WebGPU and retry with q8 WASM when WebGPU initialization fails.
- Stream access to completed audio while remaining segments render.
- Persist completed segments to IndexedDB and resume after reopening.
- Regenerate individual completed segments.
- Export mono 16-bit WAV and 128 kbps MP3.
- Cache the app shell and model assets for offline reuse.
- Estimate browser storage, request persistent storage, and remove cached models.

## Chatterbox browser support

Chatterbox is available in the browser as an English-only narrator. Audio Whisperer uses the verified `onnx-community/chatterbox-ONNX` build, its bundled default reference voice, and the same `ChatterboxModel`/`AutoProcessor` flow as Resemble AI's browser demo. Choose WebGPU for the practical runtime or WASM as a slower compatibility fallback. The initial model download is approximately 1.5 GB.

The multilingual Chatterbox model is not presented as supported because its `language_id` path is not part of this verified browser adapter. The interface states this limitation directly when Chatterbox is selected.

## Sources

- Kokoro browser model and quantization: https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX
- Kokoro multilingual voices: https://huggingface.co/hexgrad/Kokoro-82M/blob/main/VOICES.md
- Kokoro ONNX voice files: https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX/tree/main/voices
- eSpeak NG multilingual phonemization: https://github.com/espeak-ng/espeak-ng
- Transformers.js WebGPU guidance: https://huggingface.co/docs/transformers.js/en/guides/webgpu
- Chatterbox browser reference: https://github.com/resemble-ai/transformersjs-chatterbox-demo
- Chatterbox English ONNX model: https://huggingface.co/onnx-community/chatterbox-ONNX

## Privacy and storage

Book text, generated PCM audio, and progress stay in IndexedDB on the current browser profile. Model files are fetched from Hugging Face on first use and retained in browser Cache Storage. No application backend, account, analytics, or API key is used.

The multilingual browser phonemizer uses eSpeak NG, which is GPL-3.0-or-later. Any distributed build must comply with that dependency's license.

## License

Audio Whisperer is open source under the GNU General Public License v3.0 or later. See `LICENSE` for the full terms.
