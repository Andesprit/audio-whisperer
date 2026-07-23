import { describe, expect, it } from "vitest";
import { chunkText } from "./chunk-text";

describe("chunkText", () => {
  it("keeps sentences intact while grouping them near the target size", () => {
    const text = [
      "The first sentence introduces our narrator.",
      "The second sentence adds enough detail to fill the scene.",
      "The final sentence closes the paragraph.",
    ].join(" ");

    const chunks = chunkText(text, "en", { minChars: 60, maxChars: 110 });

    expect(chunks).toEqual([
      "The first sentence introduces our narrator. The second sentence adds enough detail to fill the scene.",
      "The final sentence closes the paragraph.",
    ]);
  });

  it("splits an oversized sentence without losing text", () => {
    const text = "one two three four five six seven eight nine ten eleven twelve";

    const chunks = chunkText(text, "en", { minChars: 10, maxChars: 24 });

    expect(chunks.join(" ")).toBe(text);
    expect(chunks.every((chunk) => chunk.length <= 24)).toBe(true);
  });

  it("normalizes repeated whitespace and ignores blank input", () => {
    expect(chunkText("  A quiet\n\nroom.   Then a knock.  ", "en")).toEqual([
      "A quiet room. Then a knock.",
    ]);
    expect(chunkText("  \n ", "en")).toEqual([]);
  });
});
