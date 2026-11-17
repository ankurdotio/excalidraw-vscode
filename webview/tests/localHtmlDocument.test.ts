import { describe, expect, it } from "vitest";
import { inlineLocalHtml } from "../../src/localHtmlDocument";

const encode = (text: string) => new TextEncoder().encode(text);
const decodeDataUrl = (dataUrl: string) =>
  Buffer.from(dataUrl.split(",")[1], "base64").toString("utf8");

describe("inlineLocalHtml", () => {
  const files: Record<string, string> = {
    "file:///ws/site/style.css": "body{background:url('img/bg.png')}",
    "file:///ws/site/img/bg.png": "PNG",
    "file:///ws/site/app.js": "console.log('hi')",
    "file:///ws/shared/logo.svg": "<svg/>",
  };
  const requested: string[] = [];
  const load = async (url: string) => {
    requested.push(url);
    return files[url] === undefined ? undefined : encode(files[url]);
  };

  it("inlines relative assets and leaves other references untouched", async () => {
    requested.length = 0;
    const output = await inlineLocalHtml(
      [
        '<link rel="stylesheet" href="style.css?v=1">',
        "<script src='app.js'></script>",
        '<img src="../shared/logo.svg"><img src="missing.png">',
        '<link href="https://fonts.googleapis.com/css2?family=X">',
        '<a href="other.html">x</a><img src="#frag"><img src="/abs.png">',
        "<style>.a{background:url(img/bg.png)}</style>",
      ].join(""),
      "file:///ws/site/EJS%20%26%20SSR.html",
      load
    );

    const css = output.match(/href="(data:text\/css[^"]+)"/)?.[1];
    expect(css && decodeDataUrl(css)).toBe(
      "body{background:url('data:image/png;base64,UE5H')}"
    );
    expect(output).toContain(
      `<script src='data:text/javascript;base64,${Buffer.from(
        files["file:///ws/site/app.js"]
      ).toString("base64")}'>`
    );
    expect(output).toContain('<img src="data:image/svg+xml;base64,');
    expect(output).toContain('<img src="missing.png">');
    expect(output).toContain(
      'href="https://fonts.googleapis.com/css2?family=X"'
    );
    expect(output).toContain('<a href="other.html">');
    expect(output).toContain('<img src="#frag"><img src="/abs.png">');
    expect(output).toContain(
      "<style>.a{background:url(data:image/png;base64,UE5H)}</style>"
    );
    expect(requested.every((url) => url.startsWith("file:///ws/"))).toBe(true);
    expect(requested.filter((url) => url.endsWith("bg.png"))).toHaveLength(1);
  });

  it("passes self-contained HTML through unchanged", async () => {
    const html =
      "<html><body><script>document.body.textContent='ok'</script></body></html>";
    expect(await inlineLocalHtml(html, "file:///ws/a.html", load)).toBe(html);
  });
});
