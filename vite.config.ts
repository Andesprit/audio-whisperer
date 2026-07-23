import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    // These are imported only by the TTS worker. Pre-bundle them at startup so
    // Vite does not invalidate the worker URL during the first model download.
    include: ["@huggingface/transformers", "espeak-ng"],
  },
  test: {
    environment: "jsdom",
    environmentOptions: {
      jsdom: { url: "http://localhost" },
    },
    setupFiles: "./src/test/setup.ts",
    css: true,
  },
  worker: {
    format: "es",
  },
});
