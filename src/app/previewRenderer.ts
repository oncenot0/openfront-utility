import { PatternDecoder } from "./patternEncoding.js";

type RgbColor = { r: number; g: number; b: number };

type PreviewRendererOptions = {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  primaryColorInput: HTMLInputElement;
  secondaryColorInput: HTMLInputElement;
  canvasWrap: HTMLElement;
  getZoom: () => number;
  getSimMap?: () => { image: HTMLImageElement | null; mask: HTMLImageElement | null; width: number; height: number } | null;
  getTeamColors?: () => string[] | null;
};

type PatternSource = {
  isSetCell: (cx: number, cy: number) => boolean;
  tileWidth: number;
  tileHeight: number;
  scale: number;
};

// In-game territory fill opacity (render-settings.json > mapOverlay.territoryAlpha).
const TERRITORY_ALPHA = 0.588;

function patternSourceFromBase64(base64: string): PatternSource {
  const decoder = new PatternDecoder(base64);
  const scale = decoder.getScale();
  return {
    // Cell-level predicate: tiles the pattern across cell indices.
    isSetCell: (cx, cy) => decoder.isSet(cx << scale, cy << scale),
    tileWidth: decoder.getTileWidth(),
    tileHeight: decoder.getTileHeight(),
    scale,
  };
}

function patternSourceFromMatrix(pattern: number[][]): PatternSource {
  const height = pattern.length;
  const width = pattern[0]?.length ?? 0;
  return {
    isSetCell: (cx, cy) => (pattern[cy % height]?.[cx % width] ?? 0) === 1,
    tileWidth: width,
    tileHeight: height,
    scale: 0,
  };
}

export function hexToRgb(hex: string): RgbColor {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
    : { r: 255, g: 255, b: 255 };
}

/**
 * Returns the team colour that should replace the primary for a pixel at
 * (x, y) in a canvas of the given width/height. Sections are radial wedges
 * from the canvas centre, matching the popover's team-colour wheel.
 * `teamColors` must already be parsed (see hexToRgb) so this stays cheap to
 * call once per pixel.
 */
export function teamPrimaryFor(
  teamColors: RgbColor[] | null,
  x: number,
  y: number,
  width: number,
  height: number,
): RgbColor | null {
  if (!teamColors || teamColors.length === 0) return null;
  const dx = x - width / 2;
  const dy = y - height / 2;
  // atan2 returns -PI..PI measured from the +x axis; rotate so 0 points up
  // and sectors progress clockwise, matching the wheel's wedge layout.
  let angle = Math.atan2(dy, dx) + Math.PI / 2;
  angle = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  const idx = Math.floor((angle / (Math.PI * 2)) * teamColors.length) % teamColors.length;
  return teamColors[idx];
}

export function createPreviewRenderer(options: PreviewRendererOptions) {
  const { canvas, context, primaryColorInput, secondaryColorInput, canvasWrap, getZoom, getSimMap, getTeamColors } = options;

  return function renderPreview(pattern: string | number[][], isScrap = false) {
    const source =
      typeof pattern === "string"
        ? patternSourceFromBase64(pattern)
        : patternSourceFromMatrix(pattern);

    const wrapRect = canvasWrap.getBoundingClientRect();
    const availW = wrapRect.width;
    const availH = wrapRect.height;

    const primaryRgb = hexToRgb(primaryColorInput.value);
    const secondaryRgb = hexToRgb(secondaryColorInput.value);
    // Parse once per render, not once per pixel.
    const teamColors = getTeamColors?.()?.map(hexToRgb) ?? null;

    const simMap = getSimMap?.() ?? null;

    if (simMap && simMap.image && simMap.mask) {
      renderMapSimulation(source, simMap, primaryRgb, secondaryRgb, availW, availH, teamColors);
      return;
    }

    // Displayed size of one tile cell in CSS px (zoom × encoded pattern scale).
    const zoomScale = Math.max(0.5, getZoom()) * (1 << source.scale);

    // Render at device-pixel resolution so the bitmap maps 1:1 to physical
    // pixels and the compositor never scales (no half-pixel rounding). Each
    // cell becomes a whole number of device px; only sub-device-pixel cells
    // (e.g. 50% of a scale-0 pattern on a 1x screen) fall back to
    // nearest-neighbour downsampling via image-rendering.
    const dpr = window.devicePixelRatio || 1;
    const deviceCell = zoomScale * dpr;
    const bitmapCell = deviceCell >= 1 ? Math.round(deviceCell) : 1;
    const deviceScale = deviceCell >= 1 ? 1 : deviceCell;

    // Actual displayed CSS px per cell after rounding to whole device pixels.
    // Rounding can shift this from the intended zoomScale (e.g. a fractional
    // devicePixelRatio), so the tile count must come from here — not zoomScale —
    // or the canvas would fall short of the panel edges.
    const cellDisplayPx = (bitmapCell * deviceScale) / dpr;

    // Repeat the pattern to the panel edges; partial edge tiles are clipped by
    // the overflow-hidden wrap, so the preview always fills regardless of panel
    // size or zoom.
    const cols = Math.max(1, Math.ceil(availW / cellDisplayPx));
    const rows = Math.max(1, Math.ceil(availH / cellDisplayPx));

    const width = cols * bitmapCell;
    const height = rows * bitmapCell;

    canvas.width = width;
    canvas.height = height;
    canvas.style.width = `${(width * deviceScale) / dpr}px`;
    canvas.style.height = `${(height * deviceScale) / dpr}px`;

    const imageData = context.createImageData(width, height);
    const data = imageData.data;
    let i = 0;
    for (let y = 0; y < height; y++) {
      const cy = Math.floor(y / bitmapCell);
      for (let x = 0; x < width; x++) {
        const cx = Math.floor(x / bitmapCell);
        if (source.isSetCell(cx, cy)) {
          data[i++] = secondaryRgb.r;
          data[i++] = secondaryRgb.g;
          data[i++] = secondaryRgb.b;
        } else {
          const primary = teamColors
            ? teamPrimaryFor(teamColors, x, y, width, height) ?? primaryRgb
            : primaryRgb;
          data[i++] = primary.r;
          data[i++] = primary.g;
          data[i++] = primary.b;
        }
        data[i++] = 255;
      }
    }
    context.putImageData(imageData, 0, 0);

    // Scrap canvas watermark
    if (isScrap) {
      context.save();
      context.globalAlpha = 0.55;
      context.fillStyle = "#000000";
      context.fillRect(0, height - 34, width, 34);
      context.globalAlpha = 1;
      context.fillStyle = "#ffffff";
      context.font = "bold 15px 'Space Grotesk', sans-serif";
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText("< Test Canvas >", width / 2, height - 17);
      context.restore();
    }
  };

  /**
   * Draw the map filling the preview panel (cover) and overlay the pattern at
   * the in-game scale: one pattern cell covers 2^scale map tiles, primary for
   * bit-0 cells and secondary for bit-1 cells, both blended at the in-game
   * territory alpha over land only (the grayscale land mask picks land).
   */
  function renderMapSimulation(
    source: PatternSource,
    simMap: NonNullable<ReturnType<NonNullable<PreviewRendererOptions["getSimMap"]>>>,
    primaryRgb: RgbColor,
    secondaryRgb: RgbColor,
    availW: number,
    availH: number,
    teamColors: RgbColor[] | null,
  ) {
    const { image, mask, width: mapW, height: mapH } = simMap;
    const dpr = window.devicePixelRatio || 1;
    const zoomScale = Math.max(0.5, getZoom());

    // Scale the map to cover the panel ("match the current pattern preview
    // size display"), preserving aspect ratio. Zoom magnifies the map and the
    // pattern together, exactly like zooming the in-game map.
    const cover = Math.max(availW / mapW, availH / mapH) * zoomScale;
    const dispW = Math.round(mapW * cover * dpr);
    const dispH = Math.round(mapH * cover * dpr);

    canvas.width = dispW;
    canvas.height = dispH;
    canvas.style.width = `${dispW / dpr}px`;
    canvas.style.height = `${dispH / dpr}px`;
    // In-game impassable / outside-map background so no primary colour shows
    // through sub-pixel gaps when zoomed out.
    canvas.style.background = "#3c3c3c";

    context.imageSmoothingEnabled = false;
    context.drawImage(image!, 0, 0, dispW, dispH);
    const imageData = context.getImageData(0, 0, dispW, dispH);
    const data = imageData.data;

    // Read the land mask into a separate buffer (offscreen canvas) so it can't
    // clobber the map's RGB; only land (white) tiles get pattern overlay.
    let maskData: Uint8ClampedArray | undefined;
    if (mask) {
      const off = document.createElement("canvas");
      off.width = dispW;
      off.height = dispH;
      const offCtx = off.getContext("2d", { willReadFrequently: true });
      if (offCtx) {
        offCtx.imageSmoothingEnabled = false;
        offCtx.drawImage(mask, 0, 0, dispW, dispH);
        maskData = offCtx.getImageData(0, 0, dispW, dispH).data;
      }
    }

    // Map tiles per CSS px — with the same cover scale the pattern uses.
    const tilePx = cover;
    const scale = source.scale;

    for (let py = 0; py < dispH; py++) {
      const yCss = py / dpr;
      for (let px = 0; px < dispW; px++) {
        const idx = (py * dispW + px) * 4;
        // Land mask from the grayscale mask's red channel; water/impassable stay untouched.
        if (!maskData || maskData[idx] < 128) continue;

        const xCss = px / dpr;
        const tileX = Math.floor(xCss / tilePx);
        const tileY = Math.floor(yCss / tilePx);
        const cx = tileX >> scale;
        const cy = tileY >> scale;

        const primary = teamColors
          ? teamPrimaryFor(teamColors, px, py, dispW, dispH) ?? primaryRgb
          : primaryRgb;
        const c = source.isSetCell(cx, cy) ? secondaryRgb : primary;
        data[idx] = Math.round(c.r * TERRITORY_ALPHA + data[idx] * (1 - TERRITORY_ALPHA));
        data[idx + 1] = Math.round(c.g * TERRITORY_ALPHA + data[idx + 1] * (1 - TERRITORY_ALPHA));
        data[idx + 2] = Math.round(c.b * TERRITORY_ALPHA + data[idx + 2] * (1 - TERRITORY_ALPHA));
        data[idx + 3] = 255;
      }
    }

    context.putImageData(imageData, 0, 0);
  }
}