import { describe, expect, it } from "vitest";
import { phonemizerCodeFor } from "./kokoro-language";

describe("Kokoro language mapping", () => {
  it("maps every selectable Kokoro language to its multilingual phonemizer voice", () => {
    expect([
      "en-us",
      "en-gb",
      "ja",
      "zh",
      "es",
      "fr",
      "hi",
      "it",
      "pt-br",
    ].map((language) => phonemizerCodeFor(language))).toEqual([
      "en-us",
      "en-gb",
      "ja",
      "cmn",
      "es",
      "fr-fr",
      "hi",
      "it",
      "pt-br",
    ]);
  });

  it("rejects languages that belong only to another model", () => {
    expect(() => phonemizerCodeFor("de")).toThrow("not supported by Kokoro");
  });
});
