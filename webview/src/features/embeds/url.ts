import type { EmbedSettings } from "../../../../src/embedTypes";

const EXCALIDRAW_EMBED_DOMAINS = [
  "youtube.com",
  "youtu.be",
  "vimeo.com",
  "player.vimeo.com",
  "figma.com",
  "link.excalidraw.com",
  "gist.github.com",
  "twitter.com",
  "x.com",
  "*.simplepdf.eu",
  "stackblitz.com",
  "val.town",
  "giphy.com",
  "reddit.com",
];

function normalizedHostname(hostname: string): string {
  return hostname
    .toLowerCase()
    .replace(/^\[|\]$/g, "")
    .replace(/\.$/, "");
}

function isLoopbackHostname(hostname: string): boolean {
  const host = normalizedHostname(hostname);
  return host === "localhost" || host === "127.0.0.1" || host === "::1";
}

function matchesDomain(hostname: string, domain: string): boolean {
  const host = normalizedHostname(hostname);
  const normalizedDomain = domain.toLowerCase().replace(/\.$/, "");

  if (normalizedDomain.startsWith("*.")) {
    return host.endsWith(normalizedDomain.slice(1));
  }

  return host === normalizedDomain || host.endsWith(`.${normalizedDomain}`);
}

export function isLoopbackUrl(value: string): boolean {
  try {
    return isLoopbackHostname(new URL(value).hostname);
  } catch {
    return false;
  }
}

export function getEmbedDisplayHost(value: string): string {
  try {
    return new URL(value).hostname;
  } catch {
    return value || "Embedded page";
  }
}

export function validateEmbeddable(
  value: string,
  settings: Pick<EmbedSettings, "allowAllDomains" | "allowedDomains">
): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return false;
    }

    if (isLoopbackHostname(url.hostname)) {
      return true;
    }

    if (settings.allowAllDomains) {
      return true;
    }

    return settings.allowedDomains.some((domain) =>
      matchesDomain(url.hostname, domain.trim())
    );
  } catch {
    return false;
  }
}

export function isExcalidrawEmbedUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return false;
    }
    return EXCALIDRAW_EMBED_DOMAINS.some((domain) =>
      matchesDomain(url.hostname, domain)
    );
  } catch {
    return false;
  }
}

export { isLoopbackHostname };
