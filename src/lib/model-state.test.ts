import { describe, expect, it } from "vitest";
import { modelStateReducer } from "./model-state";

describe("modelStateReducer", () => {
  it("tracks download progress and activation", () => {
    const downloading = modelStateReducer(
      { status: "not-downloaded", progress: 0 },
      { type: "download-started" },
    );
    const progressed = modelStateReducer(downloading, {
      type: "download-progressed",
      progress: 64.8,
    });
    const ready = modelStateReducer(progressed, { type: "download-completed" });
    const active = modelStateReducer(ready, { type: "activated" });

  expect(progressed).toEqual({ status: "downloading", progress: 65 });
  expect(active).toEqual({ status: "active", progress: 100 });
});

it("keeps download progress monotonic and reserves 100% for a ready model", () => {
  const almostReady = modelStateReducer(
    { status: "downloading", progress: 92 },
    { type: "download-progressed", progress: 100 },
  );
  const laterAsset = modelStateReducer(almostReady, {
    type: "download-progressed",
    progress: 14,
  });

  expect(almostReady).toEqual({ status: "downloading", progress: 99 });
  expect(laterAsset).toEqual({ status: "downloading", progress: 99 });
});

  it("returns to a clean state after deletion", () => {
    const deleted = modelStateReducer(
      { status: "error", progress: 38, error: "Network interrupted" },
      { type: "deleted" },
    );

    expect(deleted).toEqual({ status: "not-downloaded", progress: 0 });
  });
});
