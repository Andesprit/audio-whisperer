import { strToU8, zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { parseEpubArchive } from "./epub";

describe("parseEpubArchive", () => {
  it("returns chapters in spine order with their titles", () => {
    const archive = zipSync({
      "META-INF/container.xml": strToU8(
        '<container><rootfiles><rootfile full-path="OPS/package.opf"/></rootfiles></container>',
      ),
      "OPS/package.opf": strToU8(`
        <package><manifest>
          <item id="two" href="two.xhtml" media-type="application/xhtml+xml"/>
          <item id="one" href="one.xhtml" media-type="application/xhtml+xml"/>
        </manifest><spine><itemref idref="one"/><itemref idref="two"/></spine></package>
      `),
      "OPS/one.xhtml": strToU8("<html><body><h1>First light</h1><p>The story begins.</p></body></html>"),
      "OPS/two.xhtml": strToU8("<html><body><h2>Nightfall</h2><p>The story rests.</p></body></html>"),
    });

    const chapters = parseEpubArchive(archive.buffer as ArrayBuffer);

    expect(chapters).toEqual([
      { title: "First light", text: "First light\n\nThe story begins." },
      { title: "Nightfall", text: "Nightfall\n\nThe story rests." },
    ]);
  });
});
