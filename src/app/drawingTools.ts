import { getCircleCellsByDiameter } from "./circleGeometry.js";
import { thickLineCells } from "./lineGeometry.js";

export type DrawingTools = {
  /** `thickness` is the brush size in cells (default 1). */
  drawLine: (x0: number, y0: number, x1: number, y1: number, selection?: Set<string>, thickness?: number) => void;
  /** `diameter` is the circle's width/height in cells. */
  drawCircle: (cx: number, cy: number, diameter: number, selection?: Set<string>) => void;
  drawShape: (type: string, cx: number, cy: number, r: number, selection?: Set<string>) => void;
  floodFill: (sx: number, sy: number, selection?: Set<string>) => void;
  floodShade: (sx: number, sy: number, selection?: Set<string>) => void;
  shadeSelection: (selection: Set<string>) => void;
  invertSelection: (selection: Set<string>) => void;
  clearSelection: (selection: Set<string>) => void;
  getShapeCells: (type: string, cx: number, cy: number, r: number, selection?: Set<string>) => {x: number, y: number}[];
};

type DrawingOptions = {
  getTileWidth: () => number;
  getTileHeight: () => number;
  isCellActive: (x: number, y: number) => boolean;
  setCellActive: (x: number, y: number, active: boolean) => void;
  /** Used by Line/Circle/Shape only (so they can mirror); Fill/Shade keep using setCellActive. */
  setDrawCellActive?: (x: number, y: number, active: boolean) => void;
};

function isInSelection(x: number, y: number, selection: Set<string> | undefined): boolean {
  if (!selection || selection.size === 0) return true;
  return selection.has(`${x},${y}`);
}

export function createDrawingTools(options: DrawingOptions): DrawingTools {
  const { getTileWidth, getTileHeight, isCellActive, setCellActive, setDrawCellActive } = options;

  // Allow intercepting setIfAllowed for previews
  let currentSetCellActive = setDrawCellActive ?? setCellActive;

  function setIfAllowed(x: number, y: number, active: boolean, selection: Set<string> | undefined) {
    if (!isInSelection(x, y, selection)) return;
    currentSetCellActive(x, y, active);
  }

  /** Bresenham line (optionally thick), respects selection constraint */
  function drawLine(x0: number, y0: number, x1: number, y1: number, selection?: Set<string>, thickness = 1) {
    const width = getTileWidth();
    const height = getTileHeight();
    for (const [x, y] of thickLineCells(x0, y0, x1, y1, thickness)) {
      // Thick brushes can overshoot the canvas; thin lines keep their old
      // behaviour (callers/mirroring clip them).
      if (thickness > 1 && (x < 0 || y < 0 || x >= width || y >= height)) continue;
      setIfAllowed(x, y, true, selection);
    }
  }

  /** Circle outline only, `diameter` cells across, respects selection constraint. */
  function drawCircle(cx: number, cy: number, diameter: number, selection?: Set<string>) {
    const points = getCircleCellsByDiameter({ x: cx, y: cy }, diameter, false, getTileWidth(), getTileHeight());
    points.forEach((p) => setIfAllowed(p.x, p.y, true, selection));
  }

  /** Shape tool: draws star or isometric cube */
  function drawShape(type: string, cx: number, cy: number, r: number, selection?: Set<string>) {
    if (r <= 0) {
      // r=0: just place the center pixel
      setIfAllowed(cx, cy, true, selection);
      return;
    }
    if (type === "cube") {
      const h = r;
      const w = Math.max(1, Math.round(r * 1.732)); // approx sqrt(3)
      // Top face
      drawLine(cx, cy - h, cx + w, cy - Math.round(h/2), selection);
      drawLine(cx + w, cy - Math.round(h/2), cx, cy, selection);
      drawLine(cx, cy, cx - w, cy - Math.round(h/2), selection);
      drawLine(cx - w, cy - Math.round(h/2), cx, cy - h, selection);
      // Bottom edges
      drawLine(cx - w, cy - Math.round(h/2), cx - w, cy + Math.round(h/2), selection);
      drawLine(cx + w, cy - Math.round(h/2), cx + w, cy + Math.round(h/2), selection);
      drawLine(cx - w, cy + Math.round(h/2), cx, cy + h, selection);
      drawLine(cx + w, cy + Math.round(h/2), cx, cy + h, selection);
      // Center vertical
      drawLine(cx, cy, cx, cy + h, selection);
      return;
    }
    
    // Default: Star
    const pts: [number, number][] = [];
    for (let i = 0; i < 5; i++) {
      const angle = ((Math.PI * 2) / 5) * i - Math.PI / 2;
      pts.push([Math.round(cx + r * Math.cos(angle)), Math.round(cy + r * Math.sin(angle))]);
    }
    for (let i = 0; i < 5; i++) {
      drawLine(cx, cy, pts[i][0], pts[i][1], selection);
      drawLine(pts[i][0], pts[i][1], pts[(i + 2) % 5][0], pts[(i + 2) % 5][1], selection);
    }
  }

  function getShapeCells(type: string, cx: number, cy: number, r: number, selection?: Set<string>): {x: number, y: number}[] {
    const width = getTileWidth();
    const height = getTileHeight();
    const pts: {x: number, y: number}[] = [];
    const originalSet = currentSetCellActive;
    // Intercept setCellActive, filter out-of-bounds
    currentSetCellActive = (x, y) => {
      if (x >= 0 && y >= 0 && x < width && y < height) pts.push({x, y});
    };
    try {
      drawShape(type, cx, cy, r, selection);
    } finally {
      currentSetCellActive = originalSet;
    }
    return pts;
  }

  function floodTraverse(sx: number, sy: number, selection?: Set<string>) {
    const width = getTileWidth();
    const height = getTileHeight();
    const target = isCellActive(sx, sy) ? 1 : 0;
    const visited = Array.from({ length: height }, () => new Array<boolean>(width).fill(false));
    const stack: [number, number][] = [[sx, sy]];
    const toApply: [number, number][] = [];
    while (stack.length) {
      const [x, y] = stack.pop()!;
      if (x < 0 || y < 0 || x >= width || y >= height) continue;
      if (visited[y][x]) continue;
      if (!isInSelection(x, y, selection)) continue;
      if ((isCellActive(x, y) ? 1 : 0) !== target) continue;
      visited[y][x] = true;
      toApply.push([x, y]);
      stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
    return toApply;
  }

  /** Flood fill from (sx,sy) — respects selection constraint */
  function floodFill(sx: number, sy: number, selection?: Set<string>) {
    if (!isInSelection(sx, sy, selection)) return;
    const target = isCellActive(sx, sy) ? 1 : 0;
    const newValue = target ? 0 : 1;
    const toApply = floodTraverse(sx, sy, selection);
    toApply.forEach(([x, y]) => setCellActive(x, y, newValue === 1));
  }

  /** Shade flood fill — fills connected same-state area with checkerboard */
  function floodShade(sx: number, sy: number, selection?: Set<string>) {
    if (!isInSelection(sx, sy, selection)) return;
    const toApply = floodTraverse(sx, sy, selection);
    const anchorParity = (sx + sy) % 2;
    toApply.forEach(([x, y]) => {
      // Checkerboard aligned with click anchor
      setCellActive(x, y, (x + y) % 2 === anchorParity);
    });
  }

  /** Fill an explicit selection set with checkerboard pattern */
  function shadeSelection(selection: Set<string>) {
    selection.forEach((key) => {
      const [xs, ys] = key.split(",").map(Number);
      // Without an anchor, just use even parity
      setCellActive(xs, ys, (xs + ys) % 2 === 0);
    });
  }

  /** Invert all pixels within an explicit selection set */
  function invertSelection(selection: Set<string>) {
    selection.forEach((key) => {
      const [xs, ys] = key.split(",").map(Number);
      setCellActive(xs, ys, !isCellActive(xs, ys));
    });
  }

  /** Clear all pixels within an explicit selection set */
  function clearSelectionPixels(selection: Set<string>) {
    selection.forEach((key) => {
      const [xs, ys] = key.split(",").map(Number);
      setCellActive(xs, ys, false);
    });
  }

  return { 
    drawLine, 
    drawCircle, 
    drawShape, 
    floodFill, 
    floodShade, 
    shadeSelection, 
    invertSelection, 
    clearSelection: clearSelectionPixels,
    getShapeCells
  };
}
