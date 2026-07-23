import type { DocumentLanguage } from "./chunk-text";

const PHONEMIZER_CODES: Partial<Record<DocumentLanguage, string>> = {
  "en-us": "en-us",
  "en-gb": "en-gb",
  es: "es",
  fr: "fr-fr",
  hi: "hi",
  it: "it",
  ja: "ja",
  "pt-br": "pt-br",
  zh: "cmn",
};

export function phonemizerCodeFor(language: string): string {
  const code = PHONEMIZER_CODES[language as DocumentLanguage];
  if (!code) throw new Error("The selected language is not supported by Kokoro");
  return code;
}
