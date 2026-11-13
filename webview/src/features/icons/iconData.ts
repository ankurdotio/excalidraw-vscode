import { getIconData } from "@iconify/utils";
import type { IconReference, IconSetId } from "../../../../src/iconTypes";
import { ICON_SET_BY_ID } from "./iconSets";
import type { IconSearchEntry } from "./searchIcons";
import { buildIconAsset } from "./iconSvg";

export type IconSetData = Parameters<typeof getIconData>[0];

type IconSearchIndex = {
  icons: IconSearchEntry[];
};

let indexPromise: Promise<IconSearchIndex> | undefined;
const setPromises = new Map<IconSetId, Promise<IconSetData>>();

function getAssetUrl(path: string) {
  const base = window.EXCALIDRAW_ASSET_PATH;
  if (!base || base.includes("{{")) {
    throw new Error("Icon assets are unavailable in this webview.");
  }
  return `${base.replace(/\/?$/, "/")}icons/${path}`;
}

async function fetchJSON<T>(path: string): Promise<T> {
  const response = await fetch(getAssetUrl(path));
  if (!response.ok) {
    throw new Error(`Failed to load icon data (${response.status}).`);
  }
  return (await response.json()) as T;
}

export function loadIconIndex() {
  if (!indexPromise) {
    indexPromise = fetchJSON<IconSearchIndex>("index.json").catch((error) => {
      indexPromise = undefined;
      throw error;
    });
  }
  return indexPromise;
}

export function loadIconSetData(set: IconSetId) {
  let promise = setPromises.get(set);
  if (!promise) {
    promise = fetchJSON<IconSetData>(`${set}.json`).catch((error) => {
      setPromises.delete(set);
      throw error;
    });
    setPromises.set(set, promise);
  }
  return promise;
}

export async function makeIconAsset(
  entry: IconReference,
  options: { color: string; size: number; strokeWidth: number }
) {
  const data = await loadIconSetData(entry.set);
  const icon = getIconData(data, entry.name);
  if (!icon) {
    throw new Error(`Icon "${entry.name}" is missing from ${entry.set}.`);
  }
  const set = ICON_SET_BY_ID[entry.set];
  return buildIconAsset(icon, {
    ...options,
    style: set.style,
  });
}
