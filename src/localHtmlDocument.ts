import { Base64 } from "js-base64";

// Returns the bytes for a resolved resource URL, or undefined when it must not or cannot be read.
export type LocalResourceLoader = (
  resolvedUrl: string
) => Promise<Uint8Array | undefined>;

const MAX_INLINED_BYTES = 25 * 1024 * 1024;

const MIME_TYPES: Record<string, string> = {
  css: "text/css",
  js: "text/javascript",
  mjs: "text/javascript",
  json: "application/json",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  svg: "image/svg+xml",
  webp: "image/webp",
  avif: "image/avif",
  ico: "image/x-icon",
  bmp: "image/bmp",
  woff: "font/woff",
  woff2: "font/woff2",
  ttf: "font/ttf",
  otf: "font/otf",
  mp4: "video/mp4",
  webm: "video/webm",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  ogg: "audio/ogg",
  vtt: "text/vtt",
};

const RESOURCE_TAG =
  /<(?:script|link|img|source|video|audio|track|input)\b[^>]*>/gi;
const RESOURCE_ATTRIBUTE = /(\s(?:src|href|poster)\s*=\s*)(["'])(.*?)\2/gi;
const STYLE_BLOCK = /(<style\b[^>]*>)([\s\S]*?)(<\/style>)/gi;
const CSS_URL = /url\(\s*(["']?)(.*?)\1\s*\)/gi;

function isRelativeReference(reference: string) {
  return (
    reference.length > 0 &&
    !reference.startsWith("#") &&
    !reference.startsWith("/") &&
    !reference.startsWith("\\") &&
    !/^[a-z][a-z\d+.-]*:/i.test(reference)
  );
}

function getMimeType(url: string) {
  const extension = url.split(/[?#]/)[0].split(".").pop()?.toLowerCase();
  return (extension && MIME_TYPES[extension]) || "application/octet-stream";
}

async function replaceAsync(
  input: string,
  pattern: RegExp,
  replace: (...match: string[]) => Promise<string>
) {
  const matches = Array.from(input.matchAll(pattern));
  let output = "";
  let index = 0;
  for (const match of matches) {
    output += input.slice(index, match.index) + (await replace(...match));
    index = (match.index ?? 0) + match[0].length;
  }
  return output + input.slice(index);
}

/**
 * Makes a local HTML file renderable from an iframe `srcdoc` by inlining its
 * relative scripts, stylesheets, media and CSS `url()` references as data URIs.
 */
export async function inlineLocalHtml(
  html: string,
  htmlUrl: string,
  load: LocalResourceLoader
) {
  let budget = MAX_INLINED_BYTES;
  const cache = new Map<string, Promise<string | undefined>>();

  const toDataUrl = (reference: string, baseUrl: string) => {
    const decoded = reference.trim().replace(/&amp;/g, "&");
    if (!isRelativeReference(decoded)) {
      return Promise.resolve(undefined);
    }
    let resolved: string;
    try {
      const url = new URL(decoded, baseUrl);
      url.search = "";
      url.hash = "";
      resolved = url.toString();
    } catch {
      return Promise.resolve(undefined);
    }
    if (!cache.has(resolved)) {
      cache.set(
        resolved,
        (async () => {
          const bytes = await load(resolved);
          if (!bytes || bytes.byteLength > budget) {
            return undefined;
          }
          budget -= bytes.byteLength;
          const mimeType = getMimeType(resolved);
          if (mimeType === "text/css") {
            const css = await inlineCss(
              new TextDecoder().decode(bytes),
              resolved
            );
            return `data:text/css;charset=utf-8;base64,${Base64.fromUint8Array(
              new TextEncoder().encode(css)
            )}`;
          }
          return `data:${mimeType};base64,${Base64.fromUint8Array(bytes)}`;
        })()
      );
    }
    return cache.get(resolved)!;
  };

  const inlineCss = (css: string, baseUrl: string) =>
    replaceAsync(css, CSS_URL, async (match, quote, reference) => {
      const dataUrl = await toDataUrl(reference, baseUrl);
      return dataUrl ? `url(${quote}${dataUrl}${quote})` : match;
    });

  let output = await replaceAsync(html, RESOURCE_TAG, (tag) =>
    replaceAsync(
      tag,
      RESOURCE_ATTRIBUTE,
      async (match, prefix, quote, value) => {
        const dataUrl = await toDataUrl(value, htmlUrl);
        return dataUrl ? `${prefix}${quote}${dataUrl}${quote}` : match;
      }
    )
  );
  output = await replaceAsync(
    output,
    STYLE_BLOCK,
    async (_match, open, css, close) =>
      `${open}${await inlineCss(css, htmlUrl)}${close}`
  );
  return output;
}
