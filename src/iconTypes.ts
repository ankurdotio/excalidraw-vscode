import iconSetRegistry from "./iconSets.json";

export const ICON_SET_IDS = [
  ...Object.keys(iconSetRegistry),
] as (keyof typeof iconSetRegistry)[];

export type IconSetId = keyof typeof iconSetRegistry;

export type IconSetStyle = "stroke" | "fill";

export type IconReference = {
  set: IconSetId;
  name: string;
};

export type IconPreferences = {
  recent: IconReference[];
  favorites: IconReference[];
};

export type IconSettings = {
  enabledSets: IconSetId[];
  defaultSize: number;
};

export type IconSetDefinition = {
  id: IconSetId;
  prefix: string;
  packageName: string;
  displayName: string;
  license: string;
  style: IconSetStyle;
};

export const DEFAULT_ICON_PREFERENCES: IconPreferences = {
  recent: [],
  favorites: [],
};

export const DEFAULT_ICON_SETTINGS: IconSettings = {
  enabledSets: [...ICON_SET_IDS],
  defaultSize: 48,
};
