import { describe, expect, it } from "vitest";
import {
  getEmbedDisplayHost,
  isExcalidrawEmbedUrl,
  isLoopbackUrl,
  validateEmbeddable,
} from "../src/features/embeds/url";

describe("validateEmbeddable", () => {
  it("allows web URLs when all domains are enabled", () => {
    expect(
      validateEmbeddable("https://react.dev/learn", {
        allowAllDomains: true,
        allowedDomains: [],
      })
    ).toBe(true);
    expect(
      validateEmbeddable("http://example.test", {
        allowAllDomains: true,
        allowedDomains: [],
      })
    ).toBe(true);
  });

  it("rejects non-web schemes and malformed URLs", () => {
    for (const url of [
      "javascript:alert(1)",
      "data:text/html,hi",
      "file:///tmp/test.html",
      "vscode://settings",
      "ftp://example.com",
      "not a URL",
    ]) {
      expect(
        validateEmbeddable(url, {
          allowAllDomains: true,
          allowedDomains: [],
        })
      ).toBe(false);
    }
  });

  it("always allows loopback hosts when domain access is restricted", () => {
    for (const url of [
      "http://localhost:5173",
      "https://127.0.0.1:8080",
      "http://[::1]:3000",
    ]) {
      expect(
        validateEmbeddable(url, {
          allowAllDomains: false,
          allowedDomains: [],
        })
      ).toBe(true);
    }
  });

  it("matches configured hosts and subdomains without suffix confusion", () => {
    const settings = {
      allowAllDomains: false,
      allowedDomains: ["example.com"],
    };

    expect(validateEmbeddable("https://example.com", settings)).toBe(true);
    expect(validateEmbeddable("https://docs.example.com", settings)).toBe(true);
    expect(validateEmbeddable("https://notexample.com", settings)).toBe(false);
  });
});

describe("isLoopbackUrl", () => {
  it("recognizes supported loopback hosts", () => {
    expect(isLoopbackUrl("http://localhost:5173")).toBe(true);
    expect(isLoopbackUrl("http://127.0.0.1")).toBe(true);
    expect(isLoopbackUrl("http://[::1]:3000")).toBe(true);
    expect(isLoopbackUrl("https://example.com")).toBe(false);
  });
});

describe("getEmbedDisplayHost", () => {
  it("uses a safe fallback for invalid URLs", () => {
    expect(getEmbedDisplayHost("https://react.dev/learn")).toBe("react.dev");
    expect(getEmbedDisplayHost("not a URL")).toBe("not a URL");
  });
});

describe("isExcalidrawEmbedUrl", () => {
  it("keeps Excalidraw's existing providers on its built-in renderer", () => {
    expect(isExcalidrawEmbedUrl("https://www.youtube.com/watch?v=abc")).toBe(
      true
    );
    expect(isExcalidrawEmbedUrl("https://sub.simplepdf.eu/document")).toBe(
      true
    );
    expect(isExcalidrawEmbedUrl("https://react.dev")).toBe(false);
  });
});
