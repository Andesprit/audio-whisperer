import { describe, expect, it } from "vitest";
import {
  KOKORO_LANGUAGES,
  KOKORO_VOICES,
  MODEL_CATALOG,
  languagesFor,
  modelVersionsFor,
  voicesFor,
} from "./models";

describe("model catalog", () => {
  it("includes all nine official Kokoro language variants and 54 voices", () => {
    expect(KOKORO_LANGUAGES).toHaveLength(9);
    expect(KOKORO_VOICES).toHaveLength(54);
  });

  it("offers selectable runtime versions for Kokoro", () => {
    expect(modelVersionsFor("kokoro").map((version) => version.id)).toEqual([
      "kokoro-v1-q8",
      "kokoro-v1-fp32",
    ]);
    expect(MODEL_CATALOG.find((model) => model.id === "kokoro")?.languages).toEqual(
      KOKORO_LANGUAGES.map((language) => language.code),
    );
  });

  it("returns only voices belonging to the selected model language", () => {
    expect(voicesFor("kokoro", "es").map((voice) => voice.id)).toEqual([
      "ef_dora",
      "em_alex",
      "em_santa",
    ]);
  });

  it("offers the verified browser Chatterbox build as English only", () => {
    expect(modelVersionsFor("chatterbox-ml").map((version) => version.id)).toEqual([
      "chatterbox-en-v1-webgpu",
      "chatterbox-en-v1-wasm",
    ]);
    expect(languagesFor("chatterbox-ml").map((language) => language.code)).toEqual(["en"]);
    expect(voicesFor("chatterbox-ml", "en").map((voice) => voice.id)).toEqual([
      "default-reference",
    ]);
    expect(MODEL_CATALOG.find((model) => model.id === "chatterbox-ml")?.availability).toBe("ready");
  });
});
