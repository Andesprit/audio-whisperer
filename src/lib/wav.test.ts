import { describe, expect, it } from "vitest";
import { encodeWav } from "./audio";
import { decodeWav } from "./wav";

describe("decodeWav", () => {
  it("decodes the mono PCM format used by the bundled Chatterbox voice", () => {
    const encoded = encodeWav(new Float32Array([-1, -0.25, 0, 0.5, 1]), 24_000);

    const decoded = decodeWav(encoded);

    expect(decoded.sampleRate).toBe(24_000);
    expect(Array.from(decoded.audio)).toEqual([
      expect.closeTo(-1, 4),
      expect.closeTo(-0.25, 4),
      expect.closeTo(0, 4),
      expect.closeTo(0.5, 4),
      expect.closeTo(1, 4),
    ]);
  });

  it("decodes the 32-bit float WAV format used by the real default voice", () => {
    const buffer = new ArrayBuffer(52);
    const view = new DataView(buffer);
    const write = (offset: number, value: string) => {
      for (let index = 0; index < value.length; index += 1) view.setUint8(offset + index, value.charCodeAt(index));
    };
    write(0, "RIFF");
    view.setUint32(4, 44, true);
    write(8, "WAVE");
    write(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 3, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, 24_000, true);
    view.setUint32(28, 96_000, true);
    view.setUint16(32, 4, true);
    view.setUint16(34, 32, true);
    write(36, "data");
    view.setUint32(40, 8, true);
    view.setFloat32(44, -0.5, true);
    view.setFloat32(48, 0.75, true);

    expect(Array.from(decodeWav(buffer).audio)).toEqual([-0.5, 0.75]);
  });
});
