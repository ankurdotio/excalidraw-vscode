import { describe, expect, it } from "vitest";

import {
  buildIconAsset,
  buildIconDataURL,
  buildIconSvg,
  getIconDimensions,
} from "../src/features/icons/iconSvg";

describe("buildIconSvg", () => {
  it("preserves the viewBox, uses large intrinsic dimensions, and applies color and stroke width", () => {
    const svg = buildIconSvg(
      {
        body: '<g id="clip1"><path fill="none" stroke="currentColor" stroke-width="2" d="M0 0h24v12H0z"/></g>',
        width: 24,
        height: 12,
      },
      { color: "#b42318", style: "stroke", strokeWidth: 3 }
    );

    expect(svg).toContain('viewBox="0 0 24 12"');
    expect(svg).toContain('width="512"');
    expect(svg).toContain('height="256"');
    expect(svg).toContain('stroke="#b42318"');
    expect(svg).toContain('stroke-width="3"');
    expect(svg).not.toContain("currentColor");
  });

  it("preserves non-square icon proportions at the requested canvas size", () => {
    expect(getIconDimensions([0, 0, 16, 32], 48)).toEqual({
      width: 24,
      height: 48,
    });
  });

  it("emits a decodable SVG data URL without duplicate root attributes", () => {
    const asset = buildIconAsset(
      {
        body: '<path fill="currentColor" d="M0 0h24v24H0z"/>',
        width: 24,
        height: 24,
      },
      { color: "#b42318", style: "fill", strokeWidth: 2, size: 48 }
    );
    expect(asset.dataURL).toMatch(/^data:image\/svg\+xml;charset=utf-8,/);
    const svg = decodeURIComponent(asset.dataURL.split(",")[1]);
    const root = svg.slice(0, svg.indexOf(">"));
    const attributes = [...root.matchAll(/\s([\w:-]+)="/g)].map(
      (match) => match[1]
    );
    expect(new Set(attributes).size).toBe(attributes.length);
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(svg).toContain('fill="#b42318"');
  });

  it("uses small previews without reducing the inserted asset resolution", () => {
    const icon = {
      body: '<path fill="currentColor" d="M0 0h24v12H0z"/>',
      width: 24,
      height: 12,
    };
    const options = {
      color: "#1e1e1e",
      style: "fill" as const,
      strokeWidth: 2,
    };
    const preview = decodeURIComponent(
      buildIconDataURL(icon, options).split(",")[1]
    );
    const asset = decodeURIComponent(
      buildIconAsset(icon, { ...options, size: 48 }).dataURL.split(",")[1]
    );
    expect(preview).toContain('width="48" height="24"');
    expect(asset).toContain('width="512" height="256"');
    expect(preview).toContain('viewBox="0 0 24 12"');
    expect(asset).toContain('viewBox="0 0 24 12"');
  });
});
