import { describe, expect, it } from "vitest";
import {
  getEmbedDisplayHost,
  isExcalidrawEmbedUrl,
  isLoopbackUrl,
  validateEmbeddable,
} from "../src/features/embeds/url";
import { isLocalHtmlUri, toLocalHtmlUri } from "../../src/localHtmlUri";

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
      "file:///tmp/test.svg",
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

  it("accepts local HTML references for host-side workspace validation", () => {
    const settings = { allowAllDomains: false, allowedDomains: [] };
    expect(validateEmbeddable("/workspace/my page.html", settings)).toBe(true);
    expect(validateEmbeddable("C:\\workspace\\page.htm", settings)).toBe(true);
    expect(
      validateEmbeddable("file:///workspace/my%20page.html", settings)
    ).toBe(true);
    expect(
      validateEmbeddable(
        "vscode-remote://ssh-remote+host/project/index.htm",
        settings
      )
    ).toBe(true);
    expect(validateEmbeddable("file:///workspace/secrets.txt", settings)).toBe(
      false
    );
    expect(
      validateEmbeddable("file:///workspace/index.html?x=1", settings)
    ).toBe(false);
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

  describe("isLocalHtmlUri", () => {
    it("converts absolute paths without treating filename characters as URL syntax", () => {
      expect(toLocalHtmlUri("/workspace/my #1%.html")).toBe(
        "file:///workspace/my%20%231%25.html"
      );
      expect(toLocalHtmlUri("C:\\workspace\\page.htm")).toBe(
        "file:///C%3A/workspace/page.htm"
      );
      expect(toLocalHtmlUri("relative/page.html")).toBeUndefined();
      expect(toLocalHtmlUri("//example.com/page.html")).toBeUndefined();
      expect(toLocalHtmlUri("/workspace/../outside/page.html")).toBe(
        "file:///workspace/../outside/page.html"
      );
    });
    it("only identifies supported local HTML file URIs", () => {
      expect(isLocalHtmlUri("file:///project/INDEX.HTML")).toBe(true);
      expect(
        isLocalHtmlUri("vscode-remote://ssh-remote+host/project/a.htm")
      ).toBe(true);
      for (const value of [
        "https://example.com/index.html",
        "file:///project/index.html#fragment",
        "file:///project/index.html?query",
        "file:///project/index.html.js",
        "javascript:alert(1)",
        "not a URL",
      ]) {
        expect(isLocalHtmlUri(value)).toBe(false);
      }
    });
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
    expect(getEmbedDisplayHost("file:///workspace/my%20page.html")).toBe(
      "my page.html"
    );
    expect(getEmbedDisplayHost("/workspace/my page.html")).toBe("my page.html");
    expect(
      getEmbedDisplayHost("vscode-remote://ssh-remote+host/project/index.htm")
    ).toBe("index.htm");
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
