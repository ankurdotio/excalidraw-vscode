import { createServer } from "http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { checkEmbed } from "../../src/embedCheck.node";

const requestCounts = new Map<string, number>();
const server = createServer((request, response) => {
  const path = request.url ?? "/";
  requestCounts.set(path, (requestCounts.get(path) ?? 0) + 1);

  if (path === "/redirect") {
    response.writeHead(302, { Location: "/blocked" });
    response.end();
    return;
  }

  if (path === "/blocked") {
    response.writeHead(200, {
      "Content-Security-Policy": "frame-ancestors 'none'",
      "X-Frame-Options": "DENY",
    });
    response.end(
      '<html><head><title>Blocked test page</title><link rel="icon" href="/icon.svg"></head></html>'
    );
    return;
  }

  response.writeHead(200, {
    "Content-Security-Policy": "frame-ancestors https:",
  });
  response.end("<html><head><title>Allowed test page</title></head></html>");
});

function localUrl(path: string): string {
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("The embed-check test server is not listening");
  }
  return `http://127.0.0.1:${address.port}${path}`;
}

describe("checkEmbed", () => {
  beforeAll(
    () =>
      new Promise<void>((resolve) => {
        server.listen(0, "127.0.0.1", resolve);
      })
  );

  afterAll(
    () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      })
  );

  it("follows redirects and returns blocked-page metadata", async () => {
    const url = localUrl("/redirect");
    const result = await checkEmbed(url);

    expect(result.blocked).toBe(true);
    expect(result.title).toBe("Blocked test page");
    expect(result.favicon).toBe(`${new URL(url).origin}/icon.svg`);
    expect(requestCounts.get("/redirect")).toBe(1);
    expect(requestCounts.get("/blocked")).toBe(1);
  });

  it("caches each URL check for the session", async () => {
    const url = localUrl("/allowed-cache");
    const first = await checkEmbed(url);
    const second = await checkEmbed(url);

    expect(first).toEqual(second);
    expect(first.blocked).toBe(false);
    expect(first.title).toBe("Allowed test page");
    expect(requestCounts.get("/allowed-cache")).toBe(1);
  });
});
