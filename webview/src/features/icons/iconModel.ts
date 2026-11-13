import { ICON_SET_IDS } from "../../../../src/iconTypes";
import type { IconReference, IconSetId } from "../../../../src/iconTypes";
import type { SceneImageElement } from "../../lib/imageElements";

export const ICON_DRAG_TYPE = "application/x-excalidraw-studio-icon";
export const ICON_SIZE_PRESETS = [24, 32, 48, 64, 96];

export type IconOptions = {
  color: string;
  size: number;
  strokeWidth: number;
};

export type IconMetadata = IconReference & {
  kind: "icon";
  v: 1;
  color: string;
  strokeWidth: number;
};

export function getIconMetadata(image: SceneImageElement): IconMetadata | null {
  const data = image.customData;
  if (
    data?.kind !== "icon" ||
    data.v !== 1 ||
    typeof data.set !== "string" ||
    !ICON_SET_IDS.includes(data.set as IconSetId) ||
    typeof data.name !== "string" ||
    typeof data.color !== "string" ||
    typeof data.strokeWidth !== "number"
  ) {
    return null;
  }
  return {
    kind: "icon",
    v: 1,
    set: data.set as IconSetId,
    name: data.name,
    color: data.color,
    strokeWidth: data.strokeWidth,
  };
}

export function parseIconDragPayload(value: string): {
  entry: IconReference;
  options: IconOptions;
} {
  const payload: unknown = JSON.parse(value);
  if (!payload || typeof payload !== "object") {
    throw new Error("The dragged icon data is invalid.");
  }
  const data = payload as Record<string, unknown>;
  if (
    typeof data.set !== "string" ||
    !ICON_SET_IDS.includes(data.set as IconSetId) ||
    typeof data.name !== "string" ||
    !/^[a-z0-9][a-z0-9-]*$/i.test(data.name) ||
    typeof data.color !== "string" ||
    !/^#(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i.test(data.color) ||
    typeof data.size !== "number" ||
    !ICON_SIZE_PRESETS.includes(data.size) ||
    typeof data.strokeWidth !== "number" ||
    !Number.isFinite(data.strokeWidth) ||
    data.strokeWidth < 1 ||
    data.strokeWidth > 8
  ) {
    throw new Error("The dragged icon data is invalid.");
  }
  return {
    entry: { set: data.set as IconSetId, name: data.name },
    options: {
      color: data.color,
      size: data.size,
      strokeWidth: data.strokeWidth,
    },
  };
}
