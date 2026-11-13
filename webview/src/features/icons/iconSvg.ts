import { iconToHTML, iconToSVG, replaceIDs } from "@iconify/utils";
import type { IconifyIcon } from "@iconify/utils";
import type { IconSetStyle } from "../../../../src/iconTypes";

const INTRINSIC_SIZE = 512;
const DEFAULT_COLOR = "#1e1e1e";

function normalizeColor(color: string) {
  return /^#[\da-f]{3,8}$/i.test(color) ? color : DEFAULT_COLOR;
}

export function getIconDimensions(
  viewBox: readonly [number, number, number, number],
  size: number
) {
  const width = viewBox[2];
  const height = viewBox[3];
  const maxDimension = Math.max(width, height);
  if (!Number.isFinite(maxDimension) || maxDimension <= 0) {
    throw new Error("Icon viewBox must have positive dimensions.");
  }
  const scale = size / maxDimension;
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  };
}

export function buildIconSvg(
  icon: IconifyIcon,
  options: { color: string; style: IconSetStyle; strokeWidth: number },
  intrinsicSize = INTRINSIC_SIZE
) {
  const color = normalizeColor(options.color);
  const strokeWidth =
    Number.isFinite(options.strokeWidth) && options.strokeWidth > 0
      ? Math.min(options.strokeWidth, 8)
      : 2;
  const { attributes, body, viewBox } = iconToSVG(icon, {
    width: String(intrinsicSize),
  });
  const intrinsic = getIconDimensions(viewBox, intrinsicSize);
  let svgBody = replaceIDs(body).replace(/currentColor/g, color);
  const svgAttributes: Record<string, string> = {
    ...attributes,
    width: String(intrinsic.width),
    height: String(intrinsic.height),
  };

  if (options.style === "stroke") {
    const strokeWidthAttribute = `stroke-width="${strokeWidth}"`;
    if (/stroke-width="[^"]+"/.test(svgBody)) {
      svgBody = svgBody.replace(/stroke-width="[^"]+"/g, strokeWidthAttribute);
    } else {
      svgAttributes["stroke-width"] = String(strokeWidth);
    }
  }

  return iconToHTML(svgBody, svgAttributes);
}

export function buildIconAsset(
  icon: IconifyIcon,
  options: {
    color: string;
    style: IconSetStyle;
    strokeWidth: number;
    size: number;
  }
) {
  const { viewBox } = iconToSVG(icon, { width: String(INTRINSIC_SIZE) });
  return {
    dataURL: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
      buildIconSvg(icon, options)
    )}`,
    ...getIconDimensions(viewBox, options.size),
  };
}

export function buildIconDataURL(
  icon: IconifyIcon,
  options: { color: string; style: IconSetStyle; strokeWidth: number }
) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
    buildIconSvg(icon, options, 48)
  )}`;
}
