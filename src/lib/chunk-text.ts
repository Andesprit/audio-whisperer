export type DocumentLanguage =
  | "ar"
  | "da"
  | "de"
  | "el"
  | "en"
  | "en-us"
  | "en-gb"
  | "es"
  | "fi"
  | "fr"
  | "he"
  | "hi"
  | "it"
  | "ja"
  | "ko"
  | "ms"
  | "nl"
  | "no"
  | "pl"
  | "pt"
  | "pt-br"
  | "ru"
  | "sv"
  | "sw"
  | "tr"
  | "zh";

export interface ChunkOptions {
  minChars?: number;
  maxChars?: number;
}

const DEFAULT_MIN_CHARS = 200;
const DEFAULT_MAX_CHARS = 400;

function splitOversizedSegment(segment: string, maxChars: number): string[] {
  const words = segment.split(" ");
  const chunks: string[] = [];
  let current = "";

  for (const word of words) {
    if (word.length > maxChars) {
      if (current) chunks.push(current);
      for (let index = 0; index < word.length; index += maxChars) {
        chunks.push(word.slice(index, index + maxChars));
      }
      current = "";
      continue;
    }

    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxChars) {
      chunks.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }

  if (current) chunks.push(current);
  return chunks;
}

export function chunkText(
  input: string,
  language: DocumentLanguage,
  options: ChunkOptions = {},
): string[] {
  const normalized = input.replace(/\s+/g, " ").trim();
  if (!normalized) return [];

  const minChars = options.minChars ?? DEFAULT_MIN_CHARS;
  const maxChars = Math.max(minChars, options.maxChars ?? DEFAULT_MAX_CHARS);
  const segmenter = new Intl.Segmenter(language, { granularity: "sentence" });
  const sentences = Array.from(segmenter.segment(normalized), ({ segment }) =>
    segment.trim(),
  ).flatMap((sentence) => splitOversizedSegment(sentence, maxChars));

  const chunks: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    const candidate = current ? `${current} ${sentence}` : sentence;
    if (current && candidate.length > maxChars) {
      chunks.push(current);
      current = sentence;
    } else {
      current = candidate;
    }
  }

  if (current) chunks.push(current);
  return chunks;
}
