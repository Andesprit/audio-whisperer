import { describe, expect, it } from "vitest";
import { concatenateAudio, encodeWav } from "./audio";

describe("audio utilities", () => {
  it("concatenates generated chunks in order", () => {
    const result = concatenateAudio([
      new Float32Array([0.1, 0.2]),
      new Float32Array([-0.3]),
    ]);

    expect(Array.from(result)).toEqual([
      expect.closeTo(0.1),
      expect.closeTo(0.2),
      expect.closeTo(-0.3),
    ]);
  });

  it("encodes a valid mono 16-bit PCM WAV header", () => {
    const wav = encodeWav(new Float32Array([-1, 0, 1]), 24_000);
    const bytes = new Uint8Array(wav);
    const view = new DataView(wav);

    expect(new TextDecoder().decode(bytes.slice(0, 4))).toBe("RIFF");
    expect(new TextDecoder().decode(bytes.slice(8, 12))).toBe("WAVE");
    expect(view.getUint32(24, true)).toBe(24_000);
    expect(view.getUint32(40, true)).toBe(6);
    expect(view.getInt16(44, true)).toBe(-32_768);
    expect(view.getInt16(48, true)).toBe(32_767);
  });
});
