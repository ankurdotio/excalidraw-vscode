import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, DragEvent } from "react";
import type {
  IconPreferences,
  IconReference,
  IconSetId,
  IconSettings,
} from "../../../../src/iconTypes";
import { ICON_SETS } from "./iconSets";
import {
  loadIconIndex,
  loadIconSetData,
} from "./iconData";
import type { IconSetData } from "./iconData";
import { IconGrid } from "./IconGrid";
import type { IconSearchEntry } from "./searchIcons";
import { searchIcons } from "./searchIcons";
import { ICON_DRAG_TYPE, ICON_SIZE_PRESETS } from "./iconModel";
import type { IconOptions } from "./iconModel";

type Props = {
  open: boolean;
  selectedIcon?: IconReference;
  selectedOptions?: IconOptions;
  settings: IconSettings;
  preferences: IconPreferences;
  currentColor: string;
  onPreferencesChange: (preferences: IconPreferences) => void;
  onApply?: (options: IconOptions) => void;
  onChoose: (
    entry: IconSearchEntry,
    options: { color: string; size: number; strokeWidth: number }
  ) => void;
};

type LibraryTab = "search" | "recent" | "favorites";
type SetFilter = IconSetId | "all";

function referenceKey(reference: IconReference) {
  return `${reference.set}/${reference.name}`;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export function IconLibrary({
  currentColor,
  onApply,
  onChoose,
  onPreferencesChange,
  open,
  preferences,
  selectedIcon,
  selectedOptions,
  settings,
}: Props) {
  const [activeTab, setActiveTab] = useState<LibraryTab>("search");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [setFilter, setSetFilter] = useState<SetFilter>("all");
  const [color, setColor] = useState(currentColor);
  const [size, setSize] = useState(settings.defaultSize);
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [index, setIndex] = useState<IconSearchEntry[]>();
  const [indexError, setIndexError] = useState("");
  const [dataBySet, setDataBySet] = useState<
    Partial<Record<IconSetId, IconSetData>>
  >({});
  const [loadingSets, setLoadingSets] = useState<Set<IconSetId>>(new Set());
  const [errorsBySet, setErrorsBySet] = useState<
    Partial<Record<IconSetId, string>>
  >({});
  const loadingPromises = useRef(new Map<IconSetId, Promise<void>>());
  const selectedSet = selectedIcon?.set;
  const selectedName = selectedIcon?.name;
  const selectedColor = selectedOptions?.color;
  const selectedSize = selectedOptions?.size;
  const selectedStrokeWidth = selectedOptions?.strokeWidth;

  const loadIndex = useCallback(async () => {
    setIndexError("");
    try {
      const loaded = await loadIconIndex();
      setIndex(loaded.icons);
    } catch (error) {
      setIndexError(getErrorMessage(error));
    }
  }, []);

  useEffect(() => {
    if (open && !index && !indexError) {
      void loadIndex();
    }
  }, [index, indexError, loadIndex, open]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query), 60);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (open) {
      setColor(selectedColor ?? currentColor);
      setSize(selectedSize ?? settings.defaultSize);
      setStrokeWidth(selectedStrokeWidth ?? 2);
    }
  }, [currentColor, open, selectedColor, selectedSize, selectedStrokeWidth, settings.defaultSize]);

  useEffect(() => {
    if (selectedSet && selectedName) {
      setActiveTab("search");
      setQuery(selectedName);
      setSetFilter(selectedSet);
    }
  }, [selectedName, selectedSet]);

  useEffect(() => {
    if (setFilter !== "all" && !settings.enabledSets.includes(setFilter)) {
      setSetFilter("all");
    }
  }, [setFilter, settings.enabledSets]);

  const loadSet = useCallback(
    (setId: IconSetId) => {
      if (dataBySet[setId]) {
        return Promise.resolve();
      }
      const currentRequest = loadingPromises.current.get(setId);
      if (currentRequest) {
        return currentRequest;
      }

      setLoadingSets((current) => new Set(current).add(setId));
      setErrorsBySet((current) => {
        const next = { ...current };
        delete next[setId];
        return next;
      });

      const request = loadIconSetData(setId)
        .then((data) => {
          setDataBySet((current) => ({ ...current, [setId]: data }));
        })
        .catch((error: unknown) => {
          setErrorsBySet((current) => ({
            ...current,
            [setId]: getErrorMessage(error),
          }));
        })
        .finally(() => {
          loadingPromises.current.delete(setId);
          setLoadingSets((current) => {
            const next = new Set(current);
            next.delete(setId);
            return next;
          });
        });
      loadingPromises.current.set(setId, request);
      return request;
    },
    [dataBySet]
  );

  const entriesByKey = useMemo(() => {
    const result = new Map<string, IconSearchEntry>();
    for (const entry of index ?? []) {
      result.set(referenceKey(entry), entry);
    }
    return result;
  }, [index]);

  const visibleEntries = useMemo(() => {
    let entries: IconSearchEntry[] = [];
    if (activeTab === "search") {
      if (debouncedQuery.trim()) {
        entries = searchIcons(
          index ?? [],
          debouncedQuery,
          settings.enabledSets,
          setFilter
        );
      } else {
        entries = (index ?? []).filter((entry) =>
          settings.enabledSets.includes(entry.set) &&
          (setFilter === "all" || entry.set === setFilter)
        );
      }
    } else {
      const references =
        activeTab === "recent" ? preferences.recent : preferences.favorites;
      entries = references
        .map((reference) => entriesByKey.get(referenceKey(reference)))
        .filter((entry): entry is IconSearchEntry => Boolean(entry))
        .filter(
          (entry) =>
            settings.enabledSets.includes(entry.set) &&
            (setFilter === "all" || entry.set === setFilter)
        );
    }
    return entries;
  }, [
    activeTab,
    debouncedQuery,
    entriesByKey,
    index,
    preferences.favorites,
    preferences.recent,
    setFilter,
    settings.enabledSets,
  ]);

  const loadVisibleSets = useCallback(
    (sets: IconSetId[]) => {
      if (!open) {
        return;
      }
      for (const setId of sets) {
        void loadSet(setId);
      }
    },
    [loadSet, open]
  );

  const favoriteKeys = useMemo(
    () => new Set(preferences.favorites.map(referenceKey)),
    [preferences.favorites]
  );

  const chooseIcon = useCallback(
    (entry: IconSearchEntry) => {
      onChoose(entry, { color, size, strokeWidth });
    },
    [color, onChoose, size, strokeWidth]
  );

  const toggleFavorite = useCallback(
    (entry: IconSearchEntry) => {
      const reference = { set: entry.set, name: entry.name };
      const key = referenceKey(reference);
      const favorites = favoriteKeys.has(key)
        ? preferences.favorites.filter(
            (item) => referenceKey(item) !== key
          )
        : [reference, ...preferences.favorites];
      onPreferencesChange({ ...preferences, favorites });
    },
    [favoriteKeys, onPreferencesChange, preferences]
  );

  const handleDragStart = useCallback(
    (entry: IconSearchEntry, event: DragEvent) => {
      event.dataTransfer.effectAllowed = "copy";
      event.dataTransfer.setData(
        ICON_DRAG_TYPE,
        JSON.stringify({
          set: entry.set,
          name: entry.name,
          color,
          size,
          strokeWidth,
        })
      );
    },
    [color, size, strokeWidth]
  );

  const handleColorChange = (event: ChangeEvent<HTMLInputElement>) => {
    setColor(event.currentTarget.value);
  };

  const handleStrokeWidthChange = (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const value = Number(event.currentTarget.value);
    if (Number.isFinite(value)) {
      setStrokeWidth(Math.max(1, Math.min(8, value)));
    }
  };

  const favoriteCount = preferences.favorites.length;
  const recentCount = preferences.recent.length;

  return (
    <div className="studio-icon-library">
      <div className="studio-icon-tabs" role="tablist" aria-label="Icon view">
        {([
          ["search", "Search"],
          ["recent", `Recent (${recentCount})`],
          ["favorites", `Favorites (${favoriteCount})`],
        ] as const).map(([tab, label]) => (
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === tab}
            className={activeTab === tab ? "is-active" : ""}
            key={tab}
            onClick={() => setActiveTab(tab)}
          >
            {label}
          </button>
        ))}
      </div>

      <label className="studio-icon-search">
        <span className="studio-icon-sr-only">Search icons</span>
        <input
          type="search"
          value={query}
          placeholder="Search icons and aliases"
          onChange={(event) => setQuery(event.currentTarget.value)}
          onKeyDownCapture={(event) => event.stopPropagation()}
          onKeyUpCapture={(event) => event.stopPropagation()}
        />
      </label>

      <div className="studio-icon-set-filters" aria-label="Filter by icon set">
        <button
          type="button"
          className={setFilter === "all" ? "is-active" : ""}
          aria-pressed={setFilter === "all"}
          onClick={() => setSetFilter("all")}
        >
          All
        </button>
        {/* {ICON_SETS.filter((set) =>
          settings.enabledSets.includes(set.id)
        ).map((set) => (
          <button
            type="button"
            key={set.id}
            className={setFilter === set.id ? "is-active" : ""}
            aria-pressed={setFilter === set.id}
            title={`${set.displayName} · ${set.license}`}
            onClick={() => setSetFilter(set.id)}
          >
            {set.displayName}
          </button>
        ))} */}
      </div>

      <div className="studio-icon-options">
        <label>
          Color
          <input
            type="color"
            value={/^#[\da-f]{6}$/i.test(color) ? color : "#1e1e1e"}
            onChange={handleColorChange}
          />
        </label>
        <div className="studio-icon-size-options" role="group" aria-label="Icon size">
          <span>Size</span>
          {ICON_SIZE_PRESETS.map((preset) => (
            <button
              type="button"
              className={size === preset ? "is-active" : ""}
              aria-pressed={size === preset}
              key={preset}
              onClick={() => setSize(preset)}
            >
              {preset}
            </button>
          ))}
        </div>
        {settings.enabledSets.some(
          (set) => ICON_SETS.find((item) => item.id === set)?.style === "stroke"
        ) && (
          <label>
            Stroke
            <input
              type="number"
              min="1"
              max="8"
              step="0.5"
              value={strokeWidth}
              onChange={handleStrokeWidthChange}
            />
          </label>
        )}
      </div>

      {onApply && (
        <button type="button" onClick={() => onApply({ color, size, strokeWidth })}>
          Apply changes
        </button>
      )}

      {indexError ? (
        <div className="studio-icon-error" role="alert">
          <span>Unable to load icon index: {indexError}</span>
          <button type="button" onClick={() => void loadIndex()}>
            Retry
          </button>
        </div>
      ) : !index ? (
        <div className="studio-icon-loading" role="status">
          Loading icon index…
        </div>
      ) : (
        <IconGrid
          entries={visibleEntries}
          dataBySet={dataBySet}
          loadingSets={loadingSets}
          errorsBySet={errorsBySet}
          favorites={favoriteKeys}
          color={color}
          strokeWidth={strokeWidth}
          onVisibleSets={loadVisibleSets}
          onRetrySet={(setId) => void loadSet(setId)}
          onPick={chooseIcon}
          onToggleFavorite={toggleFavorite}
          onDragStart={handleDragStart}
        />
      )}
    </div>
  );
}
