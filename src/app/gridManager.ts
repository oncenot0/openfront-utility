import { brushExtent, lineCells, thickLineCells } from "./lineGeometry.js";
import { mirroredPoints, type MirrorState } from "./mirror.js";
import {
  computeGradientPattern,
  ditherBrushAction,
  ditherPatternOn,
  regionBounds,
} from "./ditherTools.js";
import type { ToolOptions } from "./toolOptions.js";
import { getCircleCellsByDiameter, type GridPoint } from "./circleGeometry.js";
import type { ClipboardManager } from "./clipboard.js";
import type { DrawingTools } from "./drawingTools.js";
import type { GuideState } from "./gridGuides.js";
import {
  invertPattern,
  rotateSelection,
  shiftPatternDown,
  shiftPatternLeft,
  shiftPatternRight,
  shiftPatternUp,
  shiftSelection,
  flipSelectionH,
  flipSelectionV,
} from "./patternTransforms.js";
import type { ToolState } from "./toolState.js";

// ─── Public API ───────────────────────────────────────────────────────────────

export type GridManager = {
  generateGrid: (pattern?: number[][]) => void;
  /** Re-apply guide/center/ruler visuals to the existing grid without rebuilding cells. */
  refreshGuides: () => void;
  getCurrentPattern: () => number[][];
  clearGrid: () => void;
  getTileWidth: () => number;
  getTileHeight: () => number;
  isCellActive: (x: number, y: number) => boolean;
  setCellActive: (x: number, y: number, active: boolean) => void;
  /** Like setCellActive, but also paints the mirror images when Mirror X/Y is on. */
  setCellMirrored: (x: number, y: number, active: boolean) => void;
  setDrawingTools: (tools: DrawingTools) => void;
  /** Returns the active selection (shared reference — read-only externally) */
  getActiveSelection: () => Set<string>;
  clearSelection: () => void;
  hasSelection: () => boolean;
  /** Invert all cells in selection (or full canvas if no selection) */
  invertGrid: () => void;
  /** Invert the selection itself — select all unselected cells, deselect all selected */
  invertSelection: () => void;
  /** Cut selection to clipboard */
  cutSelection: (clipboard: ClipboardManager) => void;
  /** Copy selection to clipboard */
  copySelection: (clipboard: ClipboardManager) => void;
  /** Paste clipboard centered on (x,y) */
  paste: (x: number, y: number, clipboard: ClipboardManager) => void;
  /** Shift selection (or full canvas) in direction */
  shiftDir: (dx: number, dy: number) => void;
  /** Rotate selection around its centroid */
  rotateDir: (direction: "left" | "right") => void;
  /** Flip selection along horizontal or vertical axis */
  flipDir: (direction: "h" | "v") => void;
};

// ─── Options ──────────────────────────────────────────────────────────────────

type GridManagerOptions = {
  gridDiv: HTMLElement;
  tileWidthInput: HTMLInputElement;
  tileHeightInput: HTMLInputElement;
  tileWidthValue: HTMLInputElement;
  tileHeightValue: HTMLInputElement;
  gridScaleInput?: HTMLSelectElement;
  guideState: GuideState;
  toolState: ToolState;
  clipboard?: ClipboardManager;
  drawingTools?: DrawingTools;
  /** When set, the grid ignores the shared size inputs and uses a fixed size. */
  fixedWidth?: number;
  fixedHeight?: number;
  onPatternChange: () => void;
  /** Called when a pencil stroke starts / ends so history can group it as one undo step. */
  onStrokeStart?: () => void;
  onStrokeEnd?: () => void;
  /** Symmetry settings shared with the mirror controls. */
  mirror?: MirrorState;
  /** Dither Brush / Gradient settings. */
  toolOptions?: ToolOptions;
};

// ─── Implementation ───────────────────────────────────────────────────────────

export function createGridManager(options: GridManagerOptions): GridManager {
  const {
    gridDiv,
    tileWidthInput,
    tileHeightInput,
    tileWidthValue,
    tileHeightValue,
    gridScaleInput,
    guideState,
    toolState,
    clipboard,
    drawingTools: initialDrawingTools,
    fixedWidth,
    fixedHeight,
    onPatternChange,
    onStrokeStart,
    onStrokeEnd,
    mirror,
    toolOptions,
  } = options;

  // ── State ─────────────────────────────────────────────────────────────────
  let drawingTools: DrawingTools | null = initialDrawingTools ?? null;
  let tileWidth = parseInt(tileWidthInput.value);
  let tileHeight = parseInt(tileHeightInput.value);
  let isMouseDown = false;
  let penToggleState: boolean | null = null;
  // A pencil stroke runs from mouse-down to mouse-up. `lastPencilCell` lets us
  // join consecutive pointer positions so a fast drag doesn't skip cells.
  let strokeActive = false;
  let lastPencilCell: GridPoint | null = null;
  let pencilPaintedOnMouseDown = false;
  // While dragging, every cell the mouse crosses used to re-encode the whole
  // pattern and redraw the preview. Now those updates are merged into at most
  // one per animation frame (and always flushed when the stroke ends).
  let changeFrame = 0;
  const flushPatternChange = () => {
    if (!changeFrame) return;
    cancelAnimationFrame(changeFrame);
    changeFrame = 0;
    onPatternChange();
  };
  const schedulePatternChange = () => {
    if (changeFrame) return;
    changeFrame = requestAnimationFrame(() => {
      changeFrame = 0;
      onPatternChange();
    });
  };
  // Gradient tool: a drag from lineStart to gradientEnd.
  let gradientDragging = false;
  let gradientEnd: GridPoint | null = null;
  let currentHeight = 0;
  let currentWidth = 0;
  let patternState: number[][] = [];
  let cellMatrix: HTMLDivElement[][] = [];

  // Circle preview
  let circlePreviewCells: GridPoint[] = [];

  // Star preview (dim overlay)
  let starPreviewCells: GridPoint[] = [];

  // Line start
  let lineStart: GridPoint | null = null;
  let linePreviews: GridPoint[] = [];

  // ── UNIFIED SELECTION ─────────────────────────────────────────────────────
  let activeSelection = new Set<string>();
  // For Select Area tool: track drag rect
  let selectAreaStart: GridPoint | null = null;
  let selectAreaEnd: GridPoint | null = null;
  let selectAreaAdding = true; // true = add to sel, false = remove
  let selectAreaPreview = new Set<string>(); // visual rect preview
  // Paste preview
  let pastePreviewCells: GridPoint[] = [];
  let pastePreviewOrigin: { ox: number; oy: number } | null = null;

  const baseCellSize = 20;

  // ── Helpers ───────────────────────────────────────────────────────────────
  const isInBounds = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < tileWidth && y < tileHeight;

  const key = (x: number, y: number) => `${x},${y}`;

  const getGridScale = () => {
    const s = gridScaleInput ? parseFloat(gridScaleInput.value) : 1;
    return Number.isFinite(s) && s > 0 ? s : 1;
  };

  const applyGridSizing = () => {
    const cellSize = baseCellSize * getGridScale();
    gridDiv.style.setProperty("--cell-size", `${cellSize}px`);
    gridDiv.style.gridTemplateColumns = `repeat(${tileWidth}, var(--cell-size))`;
    // Keep the ruler frame tracks in sync with the cell size.
    gridDiv.parentElement?.style.setProperty("--cell-size", `${cellSize}px`);
  };

  const setCellActive = (x: number, y: number, active: boolean) => {
    if (!isInBounds(x, y)) return;
    const next = active ? 1 : 0;
    const cell = cellMatrix[y]?.[x];
    // Brush stamps overlap heavily while dragging; skip cells that already
    // have the right value so we don't redo DOM writes for them. The DOM is
    // checked too, because transforms replace `patternState` wholesale and
    // then call this to bring the cells' classes in line with it.
    if (patternState[y][x] === next && (!cell || cell.classList.contains("active") === active)) return;
    patternState[y][x] = next;
    cell?.classList.toggle("active", active);
  };

  const isCellActive = (x: number, y: number) =>
    isInBounds(x, y) && patternState[y][x] === 1;

  const setDrawingTools = (tools: DrawingTools) => (drawingTools = tools);

  // ── Selection rendering ──────────────────────────────────────────────────
  const applySelectionClass = (sel: Set<string>, add: boolean) => {
    sel.forEach((k) => {
      const [x, y] = k.split(",").map(Number);
      cellMatrix[y]?.[x]?.classList.toggle("selection-cell", add);
    });
  };

  // What is currently painted, so a redraw only touches cells that changed
  // (dragging a select box used to repaint every cell on every mouse move).
  let paintedSelection = new Set<string>();
  let paintedPreview = new Set<string>();
  const cellAt = (k: string) => {
    const [x, y] = k.split(",").map(Number);
    return cellMatrix[y]?.[x];
  };
  const renderSelection = () => {
    paintedSelection.forEach((k) => {
      if (!activeSelection.has(k)) cellAt(k)?.classList.remove("selection-cell");
    });
    activeSelection.forEach((k) => {
      if (!paintedSelection.has(k)) cellAt(k)?.classList.add("selection-cell");
    });
    paintedPreview.forEach((k) => {
      if (!selectAreaPreview.has(k)) cellAt(k)?.classList.remove("select-area-preview");
    });
    selectAreaPreview.forEach((k) => {
      if (!paintedPreview.has(k)) cellAt(k)?.classList.add("select-area-preview");
    });
    paintedSelection = new Set(activeSelection);
    paintedPreview = new Set(selectAreaPreview);
    gridDiv.classList.toggle("selection-active", activeSelection.size > 0);
  };
  // Rebuilding the grid resets every cell's classes.
  const forgetPaintedSelection = () => {
    paintedSelection = new Set();
    paintedPreview = new Set();
  };

  const clearSelection = () => {
    activeSelection.clear();
    selectAreaStart = null;
    selectAreaEnd = null;
    selectAreaPreview.clear();
    renderSelection();
  };

  const hasSelection = () => activeSelection.size > 0;

  // ── Area preview for Select Area tool ─────────────────────────────────────
  const buildRectSet = (start: GridPoint, end: GridPoint) => {
    const s = new Set<string>();
    const x1 = Math.max(0, Math.min(start.x, end.x));
    const y1 = Math.max(0, Math.min(start.y, end.y));
    const x2 = Math.min(tileWidth - 1, Math.max(start.x, end.x));
    const y2 = Math.min(tileHeight - 1, Math.max(start.y, end.y));
    for (let y = y1; y <= y2; y++) {
      for (let x = x1; x <= x2; x++) {
        s.add(key(x, y));
      }
    }
    return s;
  };

  // ── Circle preview ────────────────────────────────────────────────────────
  const clearCirclePreview = () => {
    circlePreviewCells.forEach((p) =>
      cellMatrix[p.y]?.[p.x]?.classList.remove("circle-hover")
    );
    circlePreviewCells = [];
  };

  const previewCircle = (center: GridPoint, diameter: number) => {
    clearCirclePreview();
    circlePreviewCells = getCircleCellsByDiameter(center, diameter, false, tileWidth, tileHeight);
    circlePreviewCells.forEach((p) =>
      cellMatrix[p.y]?.[p.x]?.classList.add("circle-hover")
    );
  };

  const clearStarPreview = () => {
    starPreviewCells.forEach((p) =>
      cellMatrix[p.y]?.[p.x]?.classList.remove("star-hover")
    );
    starPreviewCells = [];
  };

  const previewShape = (type: string, center: GridPoint, radius: number) => {
    clearStarPreview();
    if (!drawingTools) return;
    const pts = drawingTools.getShapeCells(type, center.x, center.y, radius, activeSelection.size > 0 ? activeSelection : undefined);
    // Deduplicate and filter bounds
    const unique = new Set<string>();
    pts.forEach(p => {
      if (isInBounds(p.x, p.y)) unique.add(`${p.x},${p.y}`);
    });
    starPreviewCells = Array.from(unique).map(k => {
      const [x, y] = k.split(',').map(Number);
      return {x, y};
    });
    starPreviewCells.forEach((p) =>
      cellMatrix[p.y]?.[p.x]?.classList.add("star-hover")
    );
  };

  // ── Line preview ──────────────────────────────────────────────────────────
  const clearLinePreview = () => {
    linePreviews.forEach((p) =>
      cellMatrix[p.y]?.[p.x]?.classList.remove("line-hover")
    );
    linePreviews = [];
    if (lineStart) {
      cellMatrix[lineStart.y]?.[lineStart.x]?.classList.remove("line-start");
    }
  };

  const setLineStart = (pt: GridPoint | null) => {
    clearLinePreview();
    lineStart = pt;
    if (pt) cellMatrix[pt.y]?.[pt.x]?.classList.add("line-start");
  };

  const previewLine = (x1: number, y1: number, thickness = 1) => {
    clearLinePreview();
    if (!lineStart) return;
    cellMatrix[lineStart.y]?.[lineStart.x]?.classList.add("line-start");
    const pts: GridPoint[] = [];
    for (const [x, y] of thickLineCells(lineStart.x, lineStart.y, x1, y1, thickness)) {
      if (isInBounds(x, y)) pts.push({ x, y });
    }
    linePreviews = pts;
    // The start cell keeps its own "line-start" look when the line is 1 thick.
    linePreviews.forEach((p) => {
      if (thickness === 1 && p.x === lineStart!.x && p.y === lineStart!.y) return;
      cellMatrix[p.y]?.[p.x]?.classList.add("line-hover");
    });
  };

  // ── Paste preview ─────────────────────────────────────────────────────────
  const clearPastePreview = () => {
    pastePreviewCells.forEach((p) =>
      cellMatrix[p.y]?.[p.x]?.classList.remove("paste-hover")
    );
    pastePreviewCells = [];
    pastePreviewOrigin = null;
  };

  const showPastePreview = (
    anchorX: number,
    anchorY: number,
    entry: { cells: Array<{ x: number; y: number; active: boolean }>; originX: number; originY: number; width: number; height: number }
  ) => {
    clearPastePreview();
    pastePreviewOrigin = { ox: entry.originX, oy: entry.originY };
    // Center the paste on the cursor cell
    const halfW = Math.floor(entry.width / 2);
    const halfH = Math.floor(entry.height / 2);
    const pts: GridPoint[] = [];
    for (const c of entry.cells) {
      if (!c.active) continue;
      const tx = anchorX + (c.x - entry.originX) - halfW;
      const ty = anchorY + (c.y - entry.originY) - halfH;
      if (isInBounds(tx, ty)) {
        pts.push({ x: tx, y: ty });
        cellMatrix[ty]?.[tx]?.classList.add("paste-hover");
      }
    }
    pastePreviewCells = pts;
  };

  // ── Pencil stroke lifecycle ───────────────────────────────────────────────
  const beginStroke = () => {
    if (strokeActive) return;
    strokeActive = true;
    onStrokeStart?.();
  };
  const endStroke = () => {
    lastPencilCell = null;
    // Push out the last drawn cells before the stroke is committed to history.
    flushPatternChange();
    if (!strokeActive) return;
    strokeActive = false;
    onStrokeEnd?.();
  };

  // Paint a cell and, when Mirror X/Y is on, its reflections. Reflections obey
  // the active selection just like the cell the user actually touched.
  const setCellMirrored = (x: number, y: number, active: boolean) => {
    if (!mirror || (!mirror.x && !mirror.y)) {
      setCellActive(x, y, active);
      return;
    }
    for (const [mx, my] of mirroredPoints(x, y, mirror, tileWidth, tileHeight)) {
      if (activeSelection.size > 0 && !activeSelection.has(key(mx, my))) continue;
      setCellActive(mx, my, active);
    }
  };

  // ── Pencil brush ──────────────────────────────────────────────────────────
  const applyPencilBrush = (cx: number, cy: number, activate: boolean) => {
    const size = toolState.getPencilSize();
    // Exactly size x size cells (see brushExtent for how even sizes are placed).
    const { before, after } = brushExtent(size);
    const sel = activeSelection.size > 0 ? activeSelection : undefined;
    for (let by = cy - before; by <= cy + after; by++) {
      for (let bx = cx - before; bx <= cx + after; bx++) {
        if (!isInBounds(bx, by)) continue;
        if (sel && !sel.has(key(bx, by))) continue;
        setCellMirrored(bx, by, activate);
      }
    }
  };

  // ── Dither brush ──────────────────────────────────────────────────────────
  // Paints a dot pattern anchored to the grid. In "add" mode it only ever turns
  // cells on, so pixels that are already there are left alone.
  const applyDitherBrush = (cx: number, cy: number) => {
    const size = toolState.getDitherSize();
    const { before, after } = brushExtent(size);
    const density = toolOptions?.getDitherDensity() ?? 50;
    const mode = toolOptions?.getDitherMode() ?? "add";
    const sel = activeSelection.size > 0 ? activeSelection : undefined;
    for (let by = cy - before; by <= cy + after; by++) {
      for (let bx = cx - before; bx <= cx + after; bx++) {
        if (!isInBounds(bx, by)) continue;
        if (sel && !sel.has(key(bx, by))) continue;
        const action = ditherBrushAction(ditherPatternOn(bx, by, density), mode);
        if (action === null) continue;
        setCellMirrored(bx, by, action);
      }
    }
  };

  const paintBrush = (tool: string, cx: number, cy: number) => {
    if (tool === "ditherBrush") applyDitherBrush(cx, cy);
    else applyPencilBrush(cx, cy, penToggleState ?? true);
  };

  // ── Gradient fill ─────────────────────────────────────────────────────────
  const commitGradient = () => {
    const start = lineStart;
    const end = gradientEnd;
    gradientDragging = false;
    gradientEnd = null;
    setLineStart(null); // also clears the drag preview line
    if (!start || !toolOptions) return;
    const region = activeSelection.size > 0 ? activeSelection : null;
    let from: GridPoint = start;
    let to: GridPoint = end ?? start;
    if (from.x === to.x && from.y === to.y) {
      // A plain click: fade from the top of the area to the bottom.
      const b = regionBounds(region, tileWidth, tileHeight);
      const midX = Math.round((b.minX + b.maxX) / 2);
      from = { x: midX, y: b.minY };
      to = { x: midX, y: b.maxY };
    }
    const result = computeGradientPattern({
      width: tileWidth,
      height: tileHeight,
      from,
      to,
      region,
      style: toolOptions.getGradientStyle(),
      reverse: toolOptions.getGradientReverse(),
    });
    const keepExisting = toolOptions.getGradientMode() === "add";
    for (let y = 0; y < tileHeight; y++) {
      for (let x = 0; x < tileWidth; x++) {
        if (region && !region.has(key(x, y))) continue;
        const on = result[y][x] === 1;
        if (keepExisting && !on) continue;
        setCellActive(x, y, on);
      }
    }
    onPatternChange();
  };

  // ── Paste commit ──────────────────────────────────────────────────────────
  const paste = (anchorX: number, anchorY: number, clipboard: ClipboardManager) => {
    clearPastePreview();
    const entry = clipboard.paste();
    if (!entry) return;
    // Center on the anchor cell
    const halfW = Math.floor(entry.width / 2);
    const halfH = Math.floor(entry.height / 2);
    for (const c of entry.cells) {
      if (!c.active) continue;
      const tx = anchorX + (c.x - entry.originX) - halfW;
      const ty = anchorY + (c.y - entry.originY) - halfH;
      // Respect active selection boundary if one exists
      if (activeSelection.size > 0 && !activeSelection.has(key(tx, ty))) continue;
      setCellActive(tx, ty, c.active);
    }
    onPatternChange();
  };

  // ── Cut ───────────────────────────────────────────────────────────────────
  const cutSelection = (clipboard: ClipboardManager) => {
    if (!hasSelection()) return;
    // Snapshot selection keys before copySelection clears them
    const toErase = new Set(activeSelection);
    copySelection(clipboard); // internally calls clearSelection()
    toErase.forEach((k) => {
      const [x, y] = k.split(",").map(Number);
      setCellActive(x, y, false);
    });
    onPatternChange();
  };

  // ── Copy ──────────────────────────────────────────────────────────────────
  const copySelection = (clipboard: ClipboardManager) => {
    if (!hasSelection()) return;
    // Compute bounding box
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    activeSelection.forEach((k) => {
      const [x, y] = k.split(",").map(Number);
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    });
    const cells = Array.from(activeSelection).map((k) => {
      const [x, y] = k.split(",").map(Number);
      return { x, y, active: isCellActive(x, y) };
    });
    clipboard.copy({
      cells,
      width: maxX - minX + 1,
      height: maxY - minY + 1,
      originX: minX,
      originY: minY,
    });
    clearSelection();
  };

  // ── Invert ────────────────────────────────────────────────────────────────
  const invertGrid = () => {
    if (hasSelection()) {
      drawingTools?.invertSelection(activeSelection);
    } else {
      applyPattern(invertPattern(patternState));
    }
    onPatternChange();
  };

  // ── Invert Selection ─────────────────────────────────────────────────────
  // Toggles which cells are selected: everything not selected becomes selected.
  const invertSelection = () => {
    const newSel = new Set<string>();
    for (let y = 0; y < tileHeight; y++) {
      for (let x = 0; x < tileWidth; x++) {
        if (!activeSelection.has(key(x, y))) {
          newSel.add(key(x, y));
        }
      }
    }
    activeSelection = newSel;
    renderSelection();
  };

  // ── Shift ─────────────────────────────────────────────────────────────────
  const shiftDir = (dx: number, dy: number) => {
    if (hasSelection()) {
      const { pattern: next, movedSelection } = shiftSelection(patternState, activeSelection, dx, dy);
      patternState = next;
      activeSelection = movedSelection;
      applyPattern(patternState);
      renderSelection();
    } else {
      if (dx === -1) applyPattern(shiftPatternLeft(patternState));
      else if (dx === 1) applyPattern(shiftPatternRight(patternState));
      else if (dy === 1) applyPattern(shiftPatternDown(patternState));
      else if (dy === -1) applyPattern(shiftPatternUp(patternState));
    }
    onPatternChange();
  };

  // ── Rotate ────────────────────────────────────────────────────────────────
  const rotateDir = (direction: "left" | "right") => {
    if (!hasSelection()) return;
    const { pattern: next, rotatedSelection } = rotateSelection(patternState, activeSelection, direction);
    patternState = next;
    activeSelection = rotatedSelection;
    applyPattern(patternState);
    renderSelection();
    onPatternChange();
  };

  // ── Flip ──────────────────────────────────────────────────────────────────
  const flipDir = (direction: "h" | "v") => {
    if (!hasSelection()) return;
    const { pattern: next, flippedSelection } = direction === "h"
      ? flipSelectionH(patternState, activeSelection)
      : flipSelectionV(patternState, activeSelection);
    patternState = next;
    activeSelection = flippedSelection;
    applyPattern(patternState);
    renderSelection();
    onPatternChange();
  };

  // ── Pattern application ───────────────────────────────────────────────────
  const applyPattern = (next: number[][]) => {
    for (let y = 0; y < tileHeight; y++) {
      for (let x = 0; x < tileWidth; x++) {
        setCellActive(x, y, next[y]?.[x] === 1);
      }
    }
  };

  // ── Mouse & Key state ─────────────────────────────────────────────────────
  let isShiftDown = false;
  // Button element for the selectArea tool — used for unified shift highlight
  const selectAreaBtn = document.getElementById("tool-selectArea");

  document.addEventListener("keydown", (e) => {
    if (e.key === "Shift") {
      isShiftDown = true;
      // Highlight the select tool button while shift is held
      selectAreaBtn?.classList.add("selected");
      // Show select-mode cursor on the grid
      gridDiv.classList.add("select-mode");
    }
  });
  const releaseShift = () => {
    isShiftDown = false;
    // Only remove highlight if select tool isn't permanently active
    if (toolState.getCurrentTool() !== "selectArea") {
      selectAreaBtn?.classList.remove("selected");
    }
    gridDiv.classList.remove("select-mode");
  };
  document.addEventListener("keyup", (e) => {
    if (e.key === "Shift") {
      releaseShift();
    }
  });

  document.body.addEventListener("mousedown", () => (isMouseDown = true));
  document.body.addEventListener("mouseup", () => {
    isMouseDown = false;
    penToggleState = null;
    endStroke();
    if (gradientDragging) commitGradient();
    // Commit Select Area drag regardless of current tool if we started one
    if (selectAreaStart && selectAreaEnd) {
      const rect = buildRectSet(selectAreaStart, selectAreaEnd);
      if (selectAreaAdding) {
        rect.forEach((k) => activeSelection.add(k));
      } else {
        rect.forEach((k) => activeSelection.delete(k));
      }
      selectAreaStart = null;
      selectAreaEnd = null;
      selectAreaPreview.clear();
      renderSelection();
    }
  });

  // If the window loses focus (alt-tab) mid-stroke or while Shift is held, the
  // matching mouseup/keyup never reaches us — reset so nothing gets stuck.
  window.addEventListener("blur", () => {
    isMouseDown = false;
    penToggleState = null;
    endStroke();
    if (gradientDragging) {
      gradientDragging = false;
      gradientEnd = null;
      setLineStart(null);
    }
    if (isShiftDown) releaseShift();
  });

  gridDiv.addEventListener("mouseleave", () => {
    lastPencilCell = null;
    clearCirclePreview();
    clearStarPreview();
    clearLinePreview();
    clearPastePreview();
  });

  // ── Guides: center overlay + outside rulers ───────────────────────────────
  const updateCenterOverlay = () => {
    let centerCross = gridDiv.querySelector('.center-cross-overlay') as HTMLDivElement | null;
    if (!centerCross) {
      centerCross = document.createElement("div");
      centerCross.className = "center-cross-overlay";
      gridDiv.appendChild(centerCross);
    }
    if (guideState.isCenterEnabled()) {
      centerCross.style.display = "block";
      centerCross.style.top = "50%";
      centerCross.style.left = "50%";
    } else {
      centerCross.style.display = "none";
    }
  };

  // Ruler ticks + labels on the outside of the drawable grid. Top/left rulers
  // mark every grid line (numbered every 5). Center ticks render on all four
  // sides when the center guide is enabled — and show even without the ruler.
  const renderRulers = () => {
    const frame = gridDiv.parentElement;
    if (!frame) return;
    const topRuler = frame.querySelector<HTMLElement>(".grid-ruler-top");
    const bottomRuler = frame.querySelector<HTMLElement>(".grid-ruler-bottom");
    const leftRuler = frame.querySelector<HTMLElement>(".grid-ruler-left");
    const rightRuler = frame.querySelector<HTMLElement>(".grid-ruler-right");
    if (!topRuler || !bottomRuler || !leftRuler || !rightRuler) return;

    const rulerEnabled = guideState.isRulerEnabled();
    const centerEnabled = guideState.isCenterEnabled();
    // Keep the ruler strips visible if either the ruler or the center ticks are shown
    frame.classList.toggle("ruler-off", !rulerEnabled && !centerEnabled);

    [topRuler, bottomRuler, leftRuler, rightRuler].forEach((r) => r.replaceChildren());

    // Nothing to render when both toggles are off
    if (!rulerEnabled && !centerEnabled) return;

    const cellSize = baseCellSize * getGridScale();
    const tickMinor = Math.max(4, cellSize * 0.45);
    // Numbers sit at the outer edge of the strip; the increment ticks span from
    // the grid side up to the numbers but never intersect them.
    const numberZone = Math.max(10, cellSize * 0.5);
    const labelPos = Math.floor(numberZone / 2);

    if (rulerEnabled) {
      // Top + bottom rulers: vertical ticks at each column boundary
      for (const ruler of [topRuler, bottomRuler]) {
        for (let i = 0; i <= tileWidth; i++) {
          const x = i * cellSize;
          const major = i % 5 === 0;
          const tick = document.createElement("div");
          tick.className =
            "grid-ruler-tick grid-ruler-tick-v" + (major ? " grid-ruler-tick-major" : "");
          if (major) {
            tick.style.left = `${x}px`;
            tick.style.top = `${numberZone}px`;
            tick.style.height = `${cellSize - numberZone}px`;
          } else {
            tick.style.left = `${x}px`;
            tick.style.top = `${cellSize - tickMinor}px`;
            tick.style.height = `${tickMinor}px`;
          }
          ruler.appendChild(tick);
          if (major && i > 0) {
            const label = document.createElement("div");
            label.className = "grid-ruler-label";
            label.textContent = String(i);
            label.style.left = `${x}px`;
            label.style.top = `${labelPos}px`;
            ruler.appendChild(label);
          }
        }
      }

      // Left + right rulers: horizontal ticks at each row boundary
      for (const ruler of [leftRuler, rightRuler]) {
        for (let i = 0; i <= tileHeight; i++) {
          const y = i * cellSize;
          const major = i % 5 === 0;
          const tick = document.createElement("div");
          tick.className =
            "grid-ruler-tick grid-ruler-tick-h" + (major ? " grid-ruler-tick-major" : "");
          if (major) {
            tick.style.top = `${y}px`;
            tick.style.left = `${numberZone}px`;
            tick.style.width = `${cellSize - numberZone}px`;
          } else {
            tick.style.top = `${y}px`;
            tick.style.left = `${cellSize - tickMinor}px`;
            tick.style.width = `${tickMinor}px`;
          }
          ruler.appendChild(tick);
          if (major && i > 0) {
            const label = document.createElement("div");
            label.className = "grid-ruler-label";
            label.textContent = String(i);
            label.style.top = `${y}px`;
            label.style.left = `${labelPos}px`;
            ruler.appendChild(label);
          }
        }
      }
    }

    // Center ruler ticks — one on each side when the center guide is on.
    if (centerEnabled) {
      const centerX = (tileWidth / 2) * cellSize;
      const centerY = (tileHeight / 2) * cellSize;
      const addCenterTick = (ruler: HTMLElement, vertical: boolean, pos: number) => {
        const tick = document.createElement("div");
        tick.className = "grid-ruler-tick grid-ruler-tick-center";
        if (vertical) {
          tick.style.left = `${pos}px`;
          tick.style.top = "0";
          tick.style.height = "100%";
          tick.style.width = "2px";
        } else {
          tick.style.top = `${pos}px`;
          tick.style.left = "0";
          tick.style.width = "100%";
          tick.style.height = "2px";
        }
        ruler.appendChild(tick);
      };
      addCenterTick(topRuler, true, centerX);
      addCenterTick(bottomRuler, true, centerX);
      addCenterTick(leftRuler, false, centerY);
      addCenterTick(rightRuler, false, centerY);
    }
  };

  // Re-apply guide/center/ruler visuals to the existing grid (no rebuild).
  const refreshGuides = () => {
    for (let y = 0; y < tileHeight; y++) {
      for (let x = 0; x < tileWidth; x++) {
        const cell = cellMatrix[y]?.[x];
        if (!cell) continue;
        cell.classList.remove("guide-v", "guide-h");
        if (guideState.isBlackEnabled()) {
          if (x !== 0 && x % 5 === 0) cell.classList.add("guide-v");
          if (y !== 0 && y % 5 === 0) cell.classList.add("guide-h");
        }
      }
    }
    updateCenterOverlay();
    renderRulers();
  };

  // ── Grid generation ───────────────────────────────────────────────────────
  function generateGrid(pattern?: number[][]) {
    tileWidth = fixedWidth ?? parseInt(tileWidthInput.value);
    tileHeight = fixedHeight ?? parseInt(tileHeightInput.value);
    setLineStart(null);
    clearCirclePreview();
    clearStarPreview();
    clearPastePreview();
    clearSelection();
    applyGridSizing();

    const base = pattern ?? patternState;
    patternState = Array.from({ length: tileHeight }, (_, y) =>
      Array.from({ length: tileWidth }, (_, x) =>
        base[y]?.[x] === 1 ? 1 : 0
      )
    );

    const nextMatrix: HTMLDivElement[][] = Array.from({ length: tileHeight }, () => []);

    // Remove extra rows
    for (let y = tileHeight; y < currentHeight; y++) {
      cellMatrix[y]?.forEach((c) => c.remove());
    }
    // Remove extra cols from kept rows
    for (let y = 0; y < Math.min(tileHeight, currentHeight); y++) {
      for (let x = tileWidth; x < currentWidth; x++) {
        cellMatrix[y]?.[x]?.remove();
      }
    }
    currentWidth = tileWidth;
    currentHeight = tileHeight;

    updateCenterOverlay();

    let lastCell: HTMLDivElement | undefined;

    for (let y = 0; y < tileHeight; y++) {
      for (let x = 0; x < tileWidth; x++) {
        let cell: HTMLDivElement = cellMatrix[y]?.[x] ?? document.createElement("div");
        if (!cellMatrix[y]?.[x]) {
          cell.className = "cell";
          cell.dataset.x = x.toString();
          cell.dataset.y = y.toString();
        }

        // DOM position
        if (lastCell !== undefined) {
          if (cell.previousSibling !== lastCell) {
            gridDiv.insertBefore(cell, lastCell.nextSibling);
          }
        } else if (!cell.parentElement) {
          gridDiv.appendChild(cell);
        }

        nextMatrix[y][x] = cell;
        lastCell = cell;

        // Reset classes
        cell.className = "cell";
        cell.classList.toggle("active", patternState[y][x] === 1);

        if (guideState.isBlackEnabled()) {
          if (x !== 0 && x % 5 === 0) cell.classList.add("guide-v");
          if (y !== 0 && y % 5 === 0) cell.classList.add("guide-h");
        }

        // ── Event handlers ─────────────────────────────────────────────
        // Capture x/y in closure (re-assign to avoid stale capture issue)
        const cx = x, cy = y;

        cell.onmousedown = (e: MouseEvent) => {
          const actualTool = toolState.getCurrentTool();
          const tool = isShiftDown ? "selectArea" : actualTool;
          pencilPaintedOnMouseDown = false;

          // Paint the cell the stroke starts on, and decide whether this
          // stroke draws or erases from that cell's state.
          if ((tool === "pencil" || tool === "ditherBrush") && e.button === 0) {
            beginStroke();
            if (tool === "pencil") penToggleState = !isCellActive(cx, cy);
            paintBrush(tool, cx, cy);
            lastPencilCell = { x: cx, y: cy };
            pencilPaintedOnMouseDown = true;
            schedulePatternChange();
            return;
          }

          if (tool === "gradient" && e.button === 0) {
            gradientDragging = true;
            gradientEnd = { x: cx, y: cy };
            setLineStart({ x: cx, y: cy });
            return;
          }

          if (tool === "selectArea") {
            selectAreaStart = { x: cx, y: cy };
            selectAreaEnd = { x: cx, y: cy };
            // If starting on a selected cell, we're removing
            selectAreaAdding = !activeSelection.has(key(cx, cy));
            selectAreaPreview = buildRectSet(selectAreaStart, selectAreaEnd);
            renderSelection();
            return;
          }
        };

        cell.onmouseup = () => {
          // (commit handled on document body mouseup)
        };

        cell.onclick = () => {
          // If shift is held, the mousedown already handled the selectArea logic — don't draw.
          if (isShiftDown) return;
          const tool = toolState.getCurrentTool();
          const sel = activeSelection.size > 0 ? activeSelection : undefined;

          if (tool === "pencil") {
            // A real mouse press already painted on mouse-down; this click is
            // just its echo. A synthetic click (no mouse-down) still paints.
            if (pencilPaintedOnMouseDown) {
              pencilPaintedOnMouseDown = false;
              return;
            }
            const shouldActivate = !isCellActive(cx, cy);
            applyPencilBrush(cx, cy, shouldActivate);
            onPatternChange();
          } else if (tool === "ditherBrush") {
            if (pencilPaintedOnMouseDown) {
              pencilPaintedOnMouseDown = false;
              return;
            }
            applyDitherBrush(cx, cy);
            onPatternChange();
          } else if (tool === "line") {
            if (!lineStart) {
              setLineStart({ x: cx, y: cy });
              return;
            }
            drawingTools?.drawLine(lineStart.x, lineStart.y, cx, cy, sel, toolState.getLineThickness());
            setLineStart(null);
            onPatternChange();
          } else if (tool === "fill") {
            if (hasSelection()) {
              drawingTools?.invertSelection(activeSelection);
            } else {
              drawingTools?.floodFill(cx, cy, sel);
            }
            onPatternChange();
          } else if (tool === "shade") {
            if (hasSelection()) {
              drawingTools?.shadeSelection(activeSelection);
            } else {
              drawingTools?.floodShade(cx, cy, sel);
            }
            onPatternChange();
          } else if (tool === "shape") {
            drawingTools?.drawShape(toolState.getShapeType(), cx, cy, toolState.getShapeRadius(), sel);
            clearStarPreview(); // using same dim overlay for shape if added later
            onPatternChange();
          } else if (tool === "circle") {
            drawingTools?.drawCircle(cx, cy, toolState.getCircleDiameter(), sel);
            clearCirclePreview();
            onPatternChange();
          } else if (tool === "paste") {
            // paste handled in app.ts via clipboard
          }
        };

        cell.onmouseover = () => {
          const actualTool = toolState.getCurrentTool();
          const tool = isShiftDown ? "selectArea" : actualTool;
          const sel = activeSelection.size > 0 ? activeSelection : undefined;

          if (tool === "selectArea" && isMouseDown && selectAreaStart) {
            selectAreaEnd = { x: cx, y: cy };
            selectAreaPreview = buildRectSet(selectAreaStart, selectAreaEnd);
            renderSelection();
            return;
          }

          if (tool === "gradient" && gradientDragging && isMouseDown) {
            gradientEnd = { x: cx, y: cy };
            previewLine(cx, cy);
            return;
          }

          if (isMouseDown && (tool === "pencil" || tool === "ditherBrush")) {
            beginStroke();
            if (tool === "pencil" && penToggleState === null) penToggleState = !isCellActive(cx, cy);
            // Join the previous cell to this one so fast drags leave no gaps.
            const from = lastPencilCell ?? { x: cx, y: cy };
            for (const [lx, ly] of lineCells(from.x, from.y, cx, cy)) {
              paintBrush(tool, lx, ly);
            }
            lastPencilCell = { x: cx, y: cy };
            schedulePatternChange();
            return;
          }

          if (!isMouseDown && tool === "circle") {
            previewCircle({ x: cx, y: cy }, toolState.getCircleDiameter());
            return;
          }

          if (!isMouseDown && tool === "shape") {
            previewShape(toolState.getShapeType(), { x: cx, y: cy }, toolState.getShapeRadius());
            return;
          }

          if (tool === "line" && lineStart) {
            previewLine(cx, cy, toolState.getLineThickness());
            return;
          }

          if (!isMouseDown && tool === "paste" && clipboard?.hasContent()) {
            const entry = clipboard.paste();
            if (entry) showPastePreview(cx, cy, entry);
          }
        };
      }
    }

    cellMatrix = nextMatrix;
    // Cells were rebuilt with fresh classes, so repaint any selection from scratch.
    forgetPaintedSelection();
    renderSelection();
    renderRulers();
    onPatternChange();
  }

  // ── Input listeners ───────────────────────────────────────────────────────
  tileWidthInput.addEventListener("input", () => {
    if (fixedWidth !== undefined) return;
    tileWidthValue.value = tileWidthInput.value;
    generateGrid();
  });
  tileHeightInput.addEventListener("input", () => {
    if (fixedHeight !== undefined) return;
    tileHeightValue.value = tileHeightInput.value;
    generateGrid();
  });
  tileWidthValue.addEventListener("change", () => {
    if (fixedWidth !== undefined) return;
    tileWidthInput.value = tileWidthValue.value;
    generateGrid();
  });
  tileHeightValue.addEventListener("change", () => {
    if (fixedHeight !== undefined) return;
    tileHeightInput.value = tileHeightValue.value;
    generateGrid();
  });
  gridScaleInput?.addEventListener("change", applyGridSizing);

  // ── Tool change listener ──────────────────────────────────────────────────
  toolState.subscribeToToolChanges((tool) => {
    if (tool !== "line") setLineStart(null);
    if (tool !== "circle") clearCirclePreview();
    if (tool !== "shape") clearStarPreview();
    if (tool !== "paste") clearPastePreview();
    if (tool !== "selectArea") {
      selectAreaStart = null;
      selectAreaEnd = null;
      selectAreaPreview.clear();
    }
    // Sync select-mode cursor class with tool state
    if (tool === "selectArea") {
      gridDiv.classList.add("select-mode");
    } else if (!isShiftDown) {
      gridDiv.classList.remove("select-mode");
    }
  });

  // ── Clear grid ────────────────────────────────────────────────────────────
  function clearGrid() {
    setLineStart(null);
    clearCirclePreview();
    clearStarPreview();
    clearPastePreview();
    
    if (hasSelection() && drawingTools) {
      drawingTools.clearSelection(activeSelection);
    } else {
      for (let y = 0; y < tileHeight; y++) {
        for (let x = 0; x < tileWidth; x++) {
          setCellActive(x, y, false);
        }
      }
    }
    onPatternChange();
  }

  function getCurrentPattern() {
    return patternState;
  }

  return {
    generateGrid,
    refreshGuides,
    getCurrentPattern,
    clearGrid,
    getTileWidth: () => tileWidth,
    getTileHeight: () => tileHeight,
    isCellActive,
    setCellActive,
    setDrawingTools,
    setCellMirrored,
    getActiveSelection: () => activeSelection,
    clearSelection,
    hasSelection,
    invertGrid,
    invertSelection,
    cutSelection,
    copySelection,
    paste,
    shiftDir,
    rotateDir,
    flipDir,
  };
}
