import { describe, expect, it } from "vitest";
import { TtsClient } from "./tts-client";

class FakeWorker extends EventTarget {
  postMessage(): void {}
  terminate(): void {}
}

describe("TtsClient", () => {
  it("rejects pending requests when the synthesis worker crashes", async () => {
    const worker = new FakeWorker();
    const client = new TtsClient(worker as unknown as Worker);
    const loading = client.load("kokoro", "kokoro-v1-q8", () => undefined);

    worker.dispatchEvent(
      new ErrorEvent("error", { message: "WebAssembly initialization failed" }),
    );

    await expect(loading).rejects.toThrow("WebAssembly initialization failed");
  });
});
