import { describe, expect, it } from "vitest";
import { cleanPdfPages } from "./pdf-cleanup";

describe("cleanPdfPages", () => {
  it("removes repeated headers, footers, and page numbers", () => {
    const result = cleanPdfPages([
      "THE QUIET LIBRARY\nFirst page text.\nCollected edition\n1",
      "THE QUIET LIBRARY\nSecond page text.\nCollected edition\n2",
      "THE QUIET LIBRARY\nThird page text.\nCollected edition\n3",
    ]);

    expect(result).toBe("First page text.\n\nSecond page text.\n\nThird page text.");
  });

  it("rejoins words hyphenated across line breaks", () => {
    const result = cleanPdfPages(["A won-\nderful story with\nwrapped lines."]);

    expect(result).toBe("A wonderful story with wrapped lines.");
  });
});
