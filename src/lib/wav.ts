export interface DecodedWav {
  audio: Float32Array;
  sampleRate: number;
}

function chunkName(view: DataView, offset: number): string {
  return String.fromCharCode(
    view.getUint8(offset),
    view.getUint8(offset + 1),
    view.getUint8(offset + 2),
    view.getUint8(offset + 3),
  );
}

function pcmSample(view: DataView, offset: number, format: number, bits: number): number {
  if (format === 3 && bits === 32) return view.getFloat32(offset, true);
  if (format !== 1) throw new Error(`Unsupported WAV format ${format}`);
  if (bits === 8) return (view.getUint8(offset) - 128) / 128;
  if (bits === 16) return view.getInt16(offset, true) / 32_768;
  if (bits === 24) {
    let value = view.getUint8(offset) | (view.getUint8(offset + 1) << 8) | (view.getUint8(offset + 2) << 16);
    if (value & 0x800000) value |= ~0xffffff;
    return value / 8_388_608;
  }
  if (bits === 32) return view.getInt32(offset, true) / 2_147_483_648;
  throw new Error(`Unsupported WAV bit depth ${bits}`);
}

export function decodeWav(buffer: ArrayBuffer): DecodedWav {
  const view = new DataView(buffer);
  if (view.byteLength < 44 || chunkName(view, 0) !== "RIFF" || chunkName(view, 8) !== "WAVE") {
    throw new Error("Reference voice is not a valid WAV file");
  }

  let format = 0;
  let channels = 0;
  let sampleRate = 0;
  let bits = 0;
  let blockAlign = 0;
  let dataOffset = 0;
  let dataSize = 0;

  for (let offset = 12; offset + 8 <= view.byteLength;) {
    const name = chunkName(view, offset);
    const size = view.getUint32(offset + 4, true);
    const start = offset + 8;
    if (name === "fmt " && size >= 16) {
      format = view.getUint16(start, true);
      channels = view.getUint16(start + 2, true);
      sampleRate = view.getUint32(start + 4, true);
      blockAlign = view.getUint16(start + 12, true);
      bits = view.getUint16(start + 14, true);
    } else if (name === "data") {
      dataOffset = start;
      dataSize = Math.min(size, view.byteLength - start);
    }
    offset = start + size + (size % 2);
  }

  if (!format || !channels || !sampleRate || !bits || !blockAlign || !dataOffset) {
    throw new Error("Reference WAV is missing audio metadata");
  }

  const bytesPerSample = bits / 8;
  const frameCount = Math.floor(dataSize / blockAlign);
  const audio = new Float32Array(frameCount);
  for (let frame = 0; frame < frameCount; frame += 1) {
    let mixed = 0;
    for (let channel = 0; channel < channels; channel += 1) {
      mixed += pcmSample(view, dataOffset + frame * blockAlign + channel * bytesPerSample, format, bits);
    }
    audio[frame] = Math.max(-1, Math.min(1, mixed / channels));
  }

  return { audio, sampleRate };
}

export function resampleLinear(audio: Float32Array, fromRate: number, toRate: number): Float32Array {
  if (fromRate === toRate) return audio;
  const output = new Float32Array(Math.max(1, Math.round(audio.length * toRate / fromRate)));
  for (let index = 0; index < output.length; index += 1) {
    const position = index * fromRate / toRate;
    const left = Math.min(Math.floor(position), audio.length - 1);
    const right = Math.min(left + 1, audio.length - 1);
    const amount = position - left;
    output[index] = audio[left] * (1 - amount) + audio[right] * amount;
  }
  return output;
}
