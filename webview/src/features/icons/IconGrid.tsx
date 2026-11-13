import { memo, useEffect, useMemo, useRef, useState } from "react";
import type { DragEvent } from "react";
import { getIconData } from "@iconify/utils";
import type { IconSetId } from "../../../../src/iconTypes";
import { ICON_SET_BY_ID } from "./iconSets";
import type { IconSearchEntry } from "./searchIcons";
import type { IconSetData } from "./iconData";
import { buildIconDataURL } from "./iconSvg";

type Props = {
  entries: readonly IconSearchEntry[];
  dataBySet: Partial<Record<IconSetId, IconSetData>>;
  loadingSets: ReadonlySet<IconSetId>;
  errorsBySet: Partial<Record<IconSetId, string>>;
  favorites: ReadonlySet<string>;
  color: string;
  strokeWidth: number;
  onVisibleSets: (sets: IconSetId[]) => void;
  onRetrySet: (set: IconSetId) => void;
  onPick: (entry: IconSearchEntry) => void;
  onToggleFavorite: (entry: IconSearchEntry) => void;
  onDragStart: (entry: IconSearchEntry, event: DragEvent) => void;
};

const ROW_HEIGHT = 84;
const COLUMN_WIDTH = 88;
const OVERSCAN_ROWS = 2;

function iconKey(entry: IconSearchEntry) {
  return `${entry.set}/${entry.name}`;
}

const IconTile = memo(function IconTile({
  entry,
  data,
  favorite,
  color,
  strokeWidth,
  onRetrySet,
  onPick,
  onToggleFavorite,
  onDragStart,
  error,
}: {
  entry: IconSearchEntry;
  data?: IconSetData;
  favorite: boolean;
  color: string;
  strokeWidth: number;
  onRetrySet: (set: IconSetId) => void;
  onPick: (entry: IconSearchEntry) => void;
  onToggleFavorite: (entry: IconSearchEntry) => void;
  onDragStart: (entry: IconSearchEntry, event: DragEvent) => void;
  error?: string;
}) {
  const set = ICON_SET_BY_ID[entry.set];
  const preview = useMemo(() => {
    const icon = data ? getIconData(data, entry.name) : null;
    return icon
      ? buildIconDataURL(icon, {
          color,
          style: set.style,
          strokeWidth,
        })
      : undefined;
  }, [color, data, entry.name, set.style, strokeWidth]);

  if (!data) {
    return (
      <div
        className={`studio-icon-tile ${
          error ? "studio-icon-tile--error" : "studio-icon-tile--loading"
        }`}
      >
        <span>{error || entry.name}</span>
        {error && (
          <button type="button" onClick={() => onRetrySet(entry.set)}>
            Retry
          </button>
        )}
      </div>
    );
  }
  if (!preview) {
    return (
      <div className="studio-icon-tile studio-icon-tile--error">
        <span>{entry.name}</span>
        <button type="button" onClick={() => onRetrySet(entry.set)}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="studio-icon-tile-wrap">
      <button
        type="button"
        className="studio-icon-tile"
        title={`${set.displayName}: ${entry.name} (${set.license})`}
        draggable
        onClick={() => onPick(entry)}
        onDragStart={(event) => onDragStart(entry, event)}
      >
        <img src={preview} alt="" draggable={false} decoding="async" />
        <span>{entry.name}</span>
      </button>
      <button
        type="button"
        className={`studio-icon-favorite${favorite ? " is-favorite" : ""}`}
        aria-label={`${favorite ? "Remove" : "Add"} ${entry.name} ${
          favorite ? "from" : "to"
        } favorites`}
        aria-pressed={favorite}
        onClick={() => onToggleFavorite(entry)}
      >
        {favorite ? "★" : "☆"}
      </button>
    </div>
  );
});

export function IconGrid({
  color,
  dataBySet,
  entries,
  errorsBySet,
  favorites,
  loadingSets,
  onDragStart,
  onPick,
  onRetrySet,
  onToggleFavorite,
  onVisibleSets,
  strokeWidth,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 280, height: 420 });
  const [scrollTop, setScrollTop] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }
    const observer = new ResizeObserver(() => {
      setDimensions((current) => {
        const width = container.clientWidth;
        const height = container.clientHeight;
        return current.width === width && current.height === height
          ? current
          : { width, height };
      });
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
    setScrollTop(0);
  }, [entries]);

  const columns = Math.max(1, Math.floor(dimensions.width / COLUMN_WIDTH));
  const rowCount = Math.ceil(entries.length / columns);
  const firstRow = Math.max(
    0,
    Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN_ROWS
  );
  const lastRow = Math.min(
    rowCount,
    Math.ceil((scrollTop + dimensions.height) / ROW_HEIGHT) + OVERSCAN_ROWS
  );
  const startIndex = firstRow * columns;
  const visibleEntries = useMemo(
    () => entries.slice(startIndex, lastRow * columns),
    [columns, entries, lastRow, startIndex]
  );
  const visibleSets = useMemo(
    () => [...new Set(visibleEntries.map((entry) => entry.set))],
    [visibleEntries]
  );
  const gridStyle = {
    top: firstRow * ROW_HEIGHT,
    gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
    gridAutoRows: ROW_HEIGHT - 6,
  };

  useEffect(() => {
    onVisibleSets(visibleSets);
  }, [onVisibleSets, visibleSets]);

  return (
    <div
      className="studio-icon-grid-scroll"
      ref={containerRef}
      onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
    >
      {entries.length === 0 ? (
        <div className="studio-icon-empty">No icons found.</div>
      ) : (
        <div
          className="studio-icon-grid-spacer"
          style={{ height: Math.max(1, rowCount * ROW_HEIGHT) }}
        >
          <div className="studio-icon-grid" style={gridStyle}>
            {visibleEntries.map((entry) => (
              <IconTile
                key={iconKey(entry)}
                entry={entry}
                data={dataBySet[entry.set]}
                error={errorsBySet[entry.set]}
                favorite={favorites.has(iconKey(entry))}
                color={color}
                strokeWidth={strokeWidth}
                onRetrySet={onRetrySet}
                onPick={onPick}
                onToggleFavorite={onToggleFavorite}
                onDragStart={onDragStart}
              />
            ))}
          </div>
        </div>
      )}
      {visibleSets.some((set) => loadingSets.has(set)) && (
        <div className="studio-icon-loading" role="status">
          Loading icon set…
        </div>
      )}
      {visibleSets.some((set) => errorsBySet[set]) && (
        <div className="studio-icon-error" role="alert">
          {visibleSets
            .filter((set) => errorsBySet[set])
            .map(
              (set) => `${ICON_SET_BY_ID[set].displayName}: ${errorsBySet[set]}`
            )
            .join(" ")}
        </div>
      )}
    </div>
  );
}
