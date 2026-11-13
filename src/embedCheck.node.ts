import * as http from "http";
import * as https from "https";
import type { IncomingMessage } from "http";

import { getFrameBlockingReason } from "./embedHeaders";
import type { EmbedCheckResult } from "./embedTypes";

const REQUEST_TIMEOUT_MS = 5000;
const MAX_REDIRECTS = 5;
const MAX_HTML_LENGTH = 512 * 1024;
const checkCache = new Map<string, Promise<EmbedCheckResult>>();

interface LoadedPage {
  url: string;
  headers: IncomingMessage["headers"];
  html: string;
}

function getHeader(
  headers: IncomingMessage["headers"],
  name: string
): string | undefined {
  const value = Object.entries(headers).find(
    ([headerName]) => headerName.toLowerCase() === name
  )?.[1];
  return Array.isArray(value) ? value[0] : value;
}

function loadPage(
  address: string,
  deadline: number,
  redirectCount = 0
): Promise<LoadedPage> {
  const url = new URL(address);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return Promise.reject(
      new Error("Only HTTP and HTTPS redirects are allowed")
    );
  }
  if (redirectCount > MAX_REDIRECTS) {
    return Promise.reject(new Error("The page redirected too many times"));
  }

  const timeoutMs = deadline - Date.now();
  if (timeoutMs <= 0) {
    return Promise.reject(new Error("The embed check timed out"));
  }

  return new Promise((resolve, reject) => {
    const options: http.RequestOptions = {
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "Accept-Encoding": "identity",
        "User-Agent": "Excalidraw Studio embed check",
      },
    };

    const onResponse = (response: IncomingMessage) => {
      const location = getHeader(response.headers, "location");
      if (
        location &&
        response.statusCode !== undefined &&
        response.statusCode >= 300 &&
        response.statusCode < 400
      ) {
        response.resume();
        let nextUrl: URL;
        try {
          nextUrl = new URL(location, url);
        } catch (error) {
          reject(error);
          return;
        }
        loadPage(nextUrl.toString(), deadline, redirectCount + 1).then(
          resolve,
          reject
        );
        return;
      }

      let html = "";
      response.setEncoding("utf8");
      response.on("data", (chunk: string) => {
        if (html.length < MAX_HTML_LENGTH) {
          html += chunk.slice(0, MAX_HTML_LENGTH - html.length);
        }
      });
      response.on("end", () =>
        resolve({
          url: url.toString(),
          headers: response.headers,
          html,
        })
      );
      response.on("error", reject);
    };

    const request =
      url.protocol === "https:"
        ? https.get(url, options, onResponse)
        : http.get(url, options, onResponse);
    const timeout = setTimeout(
      () => request.destroy(new Error("The embed check timed out")),
      timeoutMs
    );
    request.on("close", () => clearTimeout(timeout));
    request.on("error", reject);
  });
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&#x([0-9a-f]+);?/gi, (_, code: string) =>
      String.fromCodePoint(parseInt(code, 16))
    )
    .replace(/&#(\d+);?/g, (_, code: string) =>
      String.fromCodePoint(parseInt(code, 10))
    )
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'");
}

function getPageTitle(html: string, fallback: string): string {
  const title = html.match(/<title\b[^>]*>([\s\S]*?)<\/title\s*>/i)?.[1];
  return title
    ? decodeHtmlEntities(title.replace(/<[^>]*>/g, "").trim()) || fallback
    : fallback;
}

function getFavicon(html: string, pageUrl: string): string | undefined {
  const linkPattern = /<link\b[^>]*>/gi;
  let linkMatch: RegExpExecArray | null;
  while ((linkMatch = linkPattern.exec(html))) {
    const tag = linkMatch[0];
    const attributes = new Map<string, string>();
    const attributePattern =
      /([^\s=]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g;
    let attributeMatch: RegExpExecArray | null;
    while ((attributeMatch = attributePattern.exec(tag))) {
      attributes.set(
        attributeMatch[1].toLowerCase(),
        attributeMatch[2] ?? attributeMatch[3] ?? attributeMatch[4] ?? ""
      );
    }

    const rel = attributes.get("rel")?.toLowerCase().split(/\s+/) ?? [];
    const href = attributes.get("href");
    if (!href || !rel.some((value) => value === "icon")) {
      continue;
    }

    try {
      const favicon = new URL(decodeHtmlEntities(href), pageUrl);
      if (favicon.protocol === "http:" || favicon.protocol === "https:") {
        return favicon.toString();
      }
    } catch {
      return undefined;
    }
  }

  try {
    return new URL("/favicon.ico", pageUrl).toString();
  } catch {
    return undefined;
  }
}

async function checkPage(url: string): Promise<EmbedCheckResult> {
  let fallbackTitle = url;
  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      throw new Error("Only HTTP and HTTPS URLs can be checked");
    }
    fallbackTitle = parsedUrl.hostname;

    const page = await loadPage(
      parsedUrl.toString(),
      Date.now() + REQUEST_TIMEOUT_MS
    );
    const blockingReason = getFrameBlockingReason(page.headers);
    return {
      url,
      blocked: blockingReason !== undefined,
      title: getPageTitle(page.html, fallbackTitle),
      favicon: getFavicon(page.html, page.url),
    };
  } catch (error) {
    return {
      url,
      blocked: false,
      title: fallbackTitle,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export function checkEmbed(url: string): Promise<EmbedCheckResult> {
  const cachedResult = checkCache.get(url);
  if (cachedResult) {
    return cachedResult;
  }

  const result = checkPage(url);
  checkCache.set(url, result);
  return result;
}
