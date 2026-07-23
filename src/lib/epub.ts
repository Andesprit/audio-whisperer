import { strFromU8, unzipSync } from "fflate";

export interface EpubChapter {
  title: string;
  text: string;
}

function attributes(tag: string): Record<string, string> {
  return Object.fromEntries(
    Array.from(tag.matchAll(/([\w:-]+)\s*=\s*["']([^"']*)["']/g), (match) => [
      match[1],
      match[2],
    ]),
  );
}

function decodeEntities(value: string): string {
  const named: Record<string, string> = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: " ",
    quot: '"',
  };

  return value.replace(/&(#x?[\da-f]+|\w+);/gi, (entity, code: string) => {
    if (code.startsWith("#x")) return String.fromCodePoint(Number.parseInt(code.slice(2), 16));
    if (code.startsWith("#")) return String.fromCodePoint(Number.parseInt(code.slice(1), 10));
    return named[code.toLowerCase()] ?? entity;
  });
}

function xhtmlToText(xhtml: string): string {
  return decodeEntities(
    xhtml
      .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, "")
      .replace(/<\/?(?:h[1-6]|p|div|section|article|blockquote|li|br)[^>]*>/gi, "\n\n")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function headingFromXhtml(xhtml: string, fallback: string): string {
  const heading = xhtml.match(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/i)?.[1];
  return heading ? xhtmlToText(heading) : fallback;
}

function resolveRelative(basePath: string, relativePath: string): string {
  const segments = `${basePath}/${relativePath}`.split("/");
  const resolved: string[] = [];
  for (const segment of segments) {
    if (!segment || segment === ".") continue;
    if (segment === "..") resolved.pop();
    else resolved.push(segment);
  }
  return resolved.join("/");
}

export function parseEpubArchive(archive: ArrayBuffer): EpubChapter[] {
  const files = unzipSync(new Uint8Array(archive));
  const containerFile = files["META-INF/container.xml"];
  if (!containerFile) throw new Error("This EPUB has no container descriptor");

  const container = strFromU8(containerFile);
  const rootTag = container.match(/<rootfile\b[^>]*>/i)?.[0];
  const packagePath = rootTag ? attributes(rootTag)["full-path"] : undefined;
  if (!packagePath || !files[packagePath]) throw new Error("This EPUB has no readable package file");

  const packageXml = strFromU8(files[packagePath]);
  const packageDirectory = packagePath.includes("/")
    ? packagePath.slice(0, packagePath.lastIndexOf("/"))
    : "";
  const manifest = new Map<string, string>();
  for (const match of packageXml.matchAll(/<item\b[^>]*>/gi)) {
    const item = attributes(match[0]);
    if (item.id && item.href) manifest.set(item.id, item.href);
  }

  const spineIds = Array.from(packageXml.matchAll(/<itemref\b[^>]*>/gi), (match) =>
    attributes(match[0]).idref,
  ).filter(Boolean);

  return spineIds.flatMap((id, index) => {
    const href = manifest.get(id);
    if (!href) return [];
    const path = resolveRelative(packageDirectory, decodeURIComponent(href.split("#")[0]));
    const file = files[path];
    if (!file) return [];
    const xhtml = strFromU8(file);
    const text = xhtmlToText(xhtml);
    if (!text) return [];
    return [{ title: headingFromXhtml(xhtml, `Chapter ${index + 1}`), text }];
  });
}
