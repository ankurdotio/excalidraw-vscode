import registry from "../../../../src/iconSets.json";
import type { IconSetDefinition, IconSetId } from "../../../../src/iconTypes";

export const ICON_SETS = Object.entries(registry).map(([id, definition]) => ({
  id: id as IconSetId,
  ...definition,
})) as IconSetDefinition[];

export const ICON_SET_BY_ID = Object.fromEntries(
  ICON_SETS.map((set) => [set.id, set])
) as Record<IconSetId, IconSetDefinition>;
