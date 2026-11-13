import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import type { SceneImageElement } from "../../lib/imageElements";
import { ICON_SET_BY_ID } from "./iconSets";
import type { IconSetId } from "../../../../src/iconTypes";

type Props = {
  images: SceneImageElement[];
  onColorChange: (images: SceneImageElement[], color: string) => void;
  onSizeChange: (images: SceneImageElement[], size: number) => void;
  onStrokeWidthChange: (
    images: SceneImageElement[],
    strokeWidth: number
  ) => void;
  onReplace: (image: SceneImageElement) => void;
};

const SIZE_PRESETS = [24, 32, 48, 64, 96];

function isIconElement(element: SceneImageElement) {
  return (
    element.customData?.kind === "icon" &&
    typeof element.customData.set === "string" &&
    typeof element.customData.name === "string"
  );
}

function getIconSet(element: SceneImageElement): IconSetId | undefined {
  const set = element.customData?.set;
  return typeof set === "string" &&
    Object.prototype.hasOwnProperty.call(ICON_SET_BY_ID, set)
    ? (set as IconSetId)
    : undefined;
}

export function IconSelectionToolbar({
  images,
  onColorChange,
  onReplace,
  onSizeChange,
  onStrokeWidthChange,
}: Props) {
  const iconImages = images.filter(isIconElement);
  const [color, setColor] = useState(
    typeof iconImages[0]?.customData?.color === "string"
      ? iconImages[0].customData.color
      : "#1e1e1e"
  );
  const size = Math.round(
    Math.max(
      ...iconImages.map((image) => Math.max(image.width, image.height))
    )
  );
  const strokeWidth =
    typeof iconImages[0]?.customData?.strokeWidth === "number"
      ? iconImages[0].customData.strokeWidth
      : 2;
  const supportsStroke = iconImages.some((image) => {
    const set = getIconSet(image);
    return set ? ICON_SET_BY_ID[set].style === "stroke" : false;
  });
  const colorInput = /^#[\da-f]{6}$/i.test(color) ? color : "#1e1e1e";
  useEffect(() => {
    const selectedColor = iconImages[0]?.customData?.color;
    setColor(typeof selectedColor === "string" ? selectedColor : "#1e1e1e");
  }, [iconImages[0]?.id, iconImages[0]?.customData?.color]);
  const sizeOptions = useMemo(
    () =>
      size > 0 && !SIZE_PRESETS.includes(size)
        ? [size, ...SIZE_PRESETS]
        : SIZE_PRESETS,
    [size]
  );

  if (iconImages.length === 0) {
    return null;
  }

  const changeColor = (event: ChangeEvent<HTMLInputElement>) => {
    const nextColor = event.currentTarget.value;
    setColor(nextColor);
    onColorChange(iconImages, nextColor);
  };

  return (
    <div className="studio-icon-selection-controls">
      <label title="Icon color">
        <span>Color</span>
        <input type="color" value={colorInput} onChange={changeColor} />
      </label>
      <label title="Canvas size">
        <span>Size</span>
        <select
          value={size}
          onChange={(event) =>
            onSizeChange(iconImages, Number(event.currentTarget.value))
          }
        >
          {sizeOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
      {supportsStroke && (
        <label title="Stroke width">
          <span>Stroke</span>
          <input
            type="number"
            min="1"
            max="8"
            step="0.5"
            value={strokeWidth}
            onChange={(event) => {
              const nextStrokeWidth = Number(event.currentTarget.value);
              if (Number.isFinite(nextStrokeWidth)) {
                onStrokeWidthChange(
                  iconImages,
                  Math.max(1, Math.min(8, nextStrokeWidth))
                );
              }
            }}
          />
        </label>
      )}
      {iconImages.length === 1 && (
        <button type="button" onClick={() => onReplace(iconImages[0])}>
          Replace icon
        </button>
      )}
      {iconImages.length > 1 && (
        <span className="studio-icon-selection-count">
          {iconImages.length} icons
        </span>
      )}
    </div>
  );
}
