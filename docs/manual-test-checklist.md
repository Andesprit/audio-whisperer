# Manual audio checklist

## Narrator configuration

- Confirm model, version, language, and voice must be chosen in that order.
- Confirm Kokoro shows two runtime versions, nine language variants, and the complete voice list for each language.
- Confirm Chatterbox shows all 23 official languages and its reference voice, while download remains compatibility-gated.
- Confirm changing model or version clears the dependent language and voice choices.

## Kokoro fp32 WebGPU

- Select Kokoro, v1.0 Full quality, a language, and a voice in Chrome or Edge with WebGPU enabled.
- Download the narrator and confirm it reports ready and shows a measured real-time factor.
- Generate a short segment and confirm it uses the selected voice.

## Kokoro q8 WASM

- Select Kokoro, v1.0 Compact, a language, and a voice.
- Download Kokoro and confirm the compact version runs in WASM mode.
- Generate a short segment while typing and scrolling remain responsive.

## Kokoro languages and voices

- Generate one short sample with every American and British English voice.
- Generate one short sample with every Japanese and Mandarin Chinese voice; review pronunciation carefully because the browser uses eSpeak fallback rather than Misaki.
- Generate one short sample with every Spanish, French, Hindi, Italian, and Brazilian Portuguese voice.
- Confirm each output is intelligible and matches the selected language and voice.

## Long-form and resume

- Confirm there is one manuscript text area and no separate title field.
- Import a public-domain EPUB and confirm chapter order appears in that text area.
- Import a PDF and confirm repeated page furniture and hyphenation are cleaned.
- Start a multi-segment generation and play the completed audio before generation ends.
- Close the tab after at least two segments, reopen, and confirm the generated count and audio return.
- Regenerate one completed segment.

## Export and offline

- Export WAV and play it in an external player.
- Export MP3 and play it in an external player.
- Reload once after model download, enable browser offline mode, and confirm the app opens.
- Generate a cached voice while offline.
- Remove Kokoro and confirm Cache Storage usage drops and generation is disabled.
