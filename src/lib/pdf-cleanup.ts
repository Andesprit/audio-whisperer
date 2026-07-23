const PAGE_NUMBER = /^(?:page\s+)?\d+(?:\s+of\s+\d+)?$/i;

function normalizedLines(page: string): string[] {
  return page
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function repeatedBoundaryLines(pages: string[][]): Set<string> {
  if (pages.length < 2) return new Set();

  const counts = new Map<string, number>();
  for (const lines of pages) {
    const withoutPageNumber = lines.filter((line) => !PAGE_NUMBER.test(line));
    const boundaries = new Set([
      withoutPageNumber[0],
      withoutPageNumber.at(-1),
    ]);
    for (const line of boundaries) {
      if (line) counts.set(line, (counts.get(line) ?? 0) + 1);
    }
  }

  const threshold = Math.max(2, Math.ceil(pages.length * 0.6));
  return new Set(
    [...counts.entries()]
      .filter(([, count]) => count >= threshold)
      .map(([line]) => line),
  );
}

function joinWrappedLines(lines: string[]): string {
  return lines
    .join("\n")
    .replace(/([\p{L}])-[ \t]*\n[ \t]*([\p{Ll}])/gu, "$1$2")
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function cleanPdfPages(rawPages: string[]): string {
  const pages = rawPages.map(normalizedLines);
  const repeated = repeatedBoundaryLines(pages);

  return pages
    .map((lines) =>
      joinWrappedLines(
        lines.filter((line) => !PAGE_NUMBER.test(line) && !repeated.has(line)),
      ),
    )
    .filter(Boolean)
    .join("\n\n");
}
