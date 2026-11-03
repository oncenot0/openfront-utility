import { brushExtent, lineCells } from "./lineGeometry.js";
import { mirroredPoints } from "./mirror.js";
import { computeGradientPattern, ditherBrushAction, ditherPatternOn, regionBounds, } from "./ditherTools.js";
import { getCircleCells } from "./circleGeometry.js";
import { invertPattern, rotateSelection, shiftPatternDown, shiftPatternLeft, shiftPatternRight, shiftPatternUp, shiftSelection, flipSelectionH, flipSelectionV, } from "./patternTransforms.js";
// ─── Implementation ───────────────────────────────────────────────────────────
export function createGridManager(options) {
    const { gridDiv, tileWidthInput, tileHeightInput, tileWidthValue, tileHeightValue, gridScaleInput, guideState, toolState, clipboard, drawingTools: initialDrawingTools, fixedWidth, fixedHeight, onPatternChange, onStrokeStart, onStrokeEnd, mirror, toolOptions, } = options;
    // ── State ─────────────────────────────────────────────────────────────────
    let drawingTools = initialDrawingTools !== null && initialDrawingTools !== void 0 ? initialDrawingTools : null;
    let tileWidth = parseInt(tileWidthInput.value);
    let tileHeight = parseInt(tileHeightInput.value);
    let isMouseDown = false;
    let penToggleState = null;
    // A pencil stroke runs from mouse-down to mouse-up. `lastPencilCell` lets us
    // join consecutive pointer positions so a fast drag doesn't skip cells.
    let strokeActive = false;
    let lastPencilCell = null;
    let pencilPaintedOnMouseDown = false;
    // Gradient tool: a drag from lineStart to gradientEnd.
    let gradientDragging = false;
    let gradientEnd = null;
    let currentHeight = 0;
    let currentWidth = 0;
    let patternState = [];
    let cellMatrix = [];
    // Circle preview
    let circlePreviewCells = [];
    // Star preview (dim overlay)
    let starPreviewCells = [];
    // Line start
    let lineStart = null;
    let linePreviews = [];
    // ── UNIFIED SELECTION ─────────────────────────────────────────────────────
    let activeSelection = new Set();
    // For Select Area tool: track drag rect
    let selectAreaStart = null;
    let selectAreaEnd = null;
    let selectAreaAdding = true; // true = add to sel, false = remove
    let selectAreaPreview = new Set(); // visual rect preview
    // Paste preview
    let pastePreviewCells = [];
    let pastePreviewOrigin = null;
    const baseCellSize = 20;
    // ── Helpers ───────────────────────────────────────────────────────────────
    const isInBounds = (x, y) => x >= 0 && y >= 0 && x < tileWidth && y < tileHeight;
    const key = (x, y) => `${x},${y}`;
    const getGridScale = () => {
        const s = gridScaleInput ? parseFloat(gridScaleInput.value) : 1;
        return Number.isFinite(s) && s > 0 ? s : 1;
    };
    const applyGridSizing = () => {
        var _a;
        const cellSize = baseCellSize * getGridScale();
        gridDiv.style.setProperty("--cell-size", `${cellSize}px`);
        gridDiv.style.gridTemplateColumns = `repeat(${tileWidth}, var(--cell-size))`;
        // Keep the ruler frame tracks in sync with the cell size.
        (_a = gridDiv.parentElement) === null || _a === void 0 ? void 0 : _a.style.setProperty("--cell-size", `${cellSize}px`);
    };
    const setCellActive = (x, y, active) => {
        var _a, _b;
        if (!isInBounds(x, y))
            return;
        patternState[y][x] = active ? 1 : 0;
        (_b = (_a = cellMatrix[y]) === null || _a === void 0 ? void 0 : _a[x]) === null || _b === void 0 ? void 0 : _b.classList.toggle("active", active);
    };
    const isCellActive = (x, y) => isInBounds(x, y) && patternState[y][x] === 1;
    const setDrawingTools = (tools) => (drawingTools = tools);
    // ── Selection rendering ──────────────────────────────────────────────────
    const applySelectionClass = (sel, add) => {
        sel.forEach((k) => {
            var _a, _b;
            const [x, y] = k.split(",").map(Number);
            (_b = (_a = cellMatrix[y]) === null || _a === void 0 ? void 0 : _a[x]) === null || _b === void 0 ? void 0 : _b.classList.toggle("selection-cell", add);
        });
    };
    const renderSelection = () => {
        var _a, _b;
        // Clear all selection classes first then re-apply current selection
        for (let y = 0; y < tileHeight; y++) {
            for (let x = 0; x < tileWidth; x++) {
                (_b = (_a = cellMatrix[y]) === null || _a === void 0 ? void 0 : _a[x]) === null || _b === void 0 ? void 0 : _b.classList.remove("selection-cell", "select-area-preview");
            }
        }
        applySelectionClass(activeSelection, true);
        // show area preview
        selectAreaPreview.forEach((k) => {
            var _a, _b;
            const [x, y] = k.split(",").map(Number);
            (_b = (_a = cellMatrix[y]) === null || _a === void 0 ? void 0 : _a[x]) === null || _b === void 0 ? void 0 : _b.classList.add("select-area-preview");
        });
        gridDiv.classList.toggle("selection-active", activeSelection.size > 0);
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
    const buildRectSet = (start, end) => {
        const s = new Set();
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
        circlePreviewCells.forEach((p) => { var _a, _b; return (_b = (_a = cellMatrix[p.y]) === null || _a === void 0 ? void 0 : _a[p.x]) === null || _b === void 0 ? void 0 : _b.classList.remove("circle-hover"); });
        circlePreviewCells = [];
    };
    const previewCircle = (center, radius) => {
        clearCirclePreview();
        circlePreviewCells =
            radius === 0
                ? isInBounds(center.x, center.y)
                    ? [center]
                    : []
                : getCircleCells(center, Math.max(0, radius), false, tileWidth, tileHeight);
        circlePreviewCells.forEach((p) => { var _a, _b; return (_b = (_a = cellMatrix[p.y]) === null || _a === void 0 ? void 0 : _a[p.x]) === null || _b === void 0 ? void 0 : _b.classList.add("circle-hover"); });
    };
    const clearStarPreview = () => {
        starPreviewCells.forEach((p) => { var _a, _b; return (_b = (_a = cellMatrix[p.y]) === null || _a === void 0 ? void 0 : _a[p.x]) === null || _b === void 0 ? void 0 : _b.classList.remove("star-hover"); });
        starPreviewCells = [];
    };
    const previewShape = (type, center, radius) => {
        clearStarPreview();
        if (!drawingTools)
            return;
        const pts = drawingTools.getShapeCells(type, center.x, center.y, radius, activeSelection.size > 0 ? activeSelection : undefined);
        // Deduplicate and filter bounds
        const unique = new Set();
        pts.forEach(p => {
            if (isInBounds(p.x, p.y))
                unique.add(`${p.x},${p.y}`);
        });
        starPreviewCells = Array.from(unique).map(k => {
            const [x, y] = k.split(',').map(Number);
            return { x, y };
        });
        starPreviewCells.forEach((p) => { var _a, _b; return (_b = (_a = cellMatrix[p.y]) === null || _a === void 0 ? void 0 : _a[p.x]) === null || _b === void 0 ? void 0 : _b.classList.add("star-hover"); });
    };
    // ── Line preview ──────────────────────────────────────────────────────────
    const clearLinePreview = () => {
        var _a, _b;
        linePreviews.forEach((p) => { var _a, _b; return (_b = (_a = cellMatrix[p.y]) === null || _a === void 0 ? void 0 : _a[p.x]) === null || _b === void 0 ? void 0 : _b.classList.remove("line-hover"); });
        linePreviews = [];
        if (lineStart) {
            (_b = (_a = cellMatrix[lineStart.y]) === null || _a === void 0 ? void 0 : _a[lineStart.x]) === null || _b === void 0 ? void 0 : _b.classList.remove("line-start");
        }
    };
    const setLineStart = (pt) => {
        var _a, _b;
        clearLinePreview();
        lineStart = pt;
        if (pt)
            (_b = (_a = cellMatrix[pt.y]) === null || _a === void 0 ? void 0 : _a[pt.x]) === null || _b === void 0 ? void 0 : _b.classList.add("line-start");
    };
    const previewLine = (x1, y1) => {
        var _a, _b;
        clearLinePreview();
        if (!lineStart)
            return;
        if (lineStart)
            (_b = (_a = cellMatrix[lineStart.y]) === null || _a === void 0 ? void 0 : _a[lineStart.x]) === null || _b === void 0 ? void 0 : _b.classList.add("line-start");
        // Bresenham
        let x0 = lineStart.x, y0 = lineStart.y;
        let dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
        let dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
        let err = dx + dy, e2;
        const pts = [];
        while (true) {
            if (isInBounds(x0, y0))
                pts.push({ x: x0, y: y0 });
            if (x0 === x1 && y0 === y1)
                break;
            e2 = 2 * err;
            if (e2 >= dy) {
                err += dy;
                x0 += sx;
            }
            if (e2 <= dx) {
                err += dx;
                y0 += sy;
            }
        }
        linePreviews = pts;
        linePreviews.forEach((p) => {
            var _a, _b;
            if (p.x === lineStart.x && p.y === lineStart.y)
                return;
            (_b = (_a = cellMatrix[p.y]) === null || _a === void 0 ? void 0 : _a[p.x]) === null || _b === void 0 ? void 0 : _b.classList.add("line-hover");
        });
    };
    // ── Paste preview ─────────────────────────────────────────────────────────
    const clearPastePreview = () => {
        pastePreviewCells.forEach((p) => { var _a, _b; return (_b = (_a = cellMatrix[p.y]) === null || _a === void 0 ? void 0 : _a[p.x]) === null || _b === void 0 ? void 0 : _b.classList.remove("paste-hover"); });
        pastePreviewCells = [];
        pastePreviewOrigin = null;
    };
    const showPastePreview = (anchorX, anchorY, entry) => {
        var _a, _b;
        clearPastePreview();
        pastePreviewOrigin = { ox: entry.originX, oy: entry.originY };
        // Center the paste on the cursor cell
        const halfW = Math.floor(entry.width / 2);
        const halfH = Math.floor(entry.height / 2);
        const pts = [];
        for (const c of entry.cells) {
            if (!c.active)
                continue;
            const tx = anchorX + (c.x - entry.originX) - halfW;
            const ty = anchorY + (c.y - entry.originY) - halfH;
            if (isInBounds(tx, ty)) {
                pts.push({ x: tx, y: ty });
                (_b = (_a = cellMatrix[ty]) === null || _a === void 0 ? void 0 : _a[tx]) === null || _b === void 0 ? void 0 : _b.classList.add("paste-hover");
            }
        }
        pastePreviewCells = pts;
    };
    // ── Pencil stroke lifecycle ───────────────────────────────────────────────
    const beginStroke = () => {
        if (strokeActive)
            return;
        strokeActive = true;
        onStrokeStart === null || onStrokeStart === void 0 ? void 0 : onStrokeStart();
    };
    const endStroke = () => {
        lastPencilCell = null;
        if (!strokeActive)
            return;
        strokeActive = false;
        onStrokeEnd === null || onStrokeEnd === void 0 ? void 0 : onStrokeEnd();
    };
    // Paint a cell and, when Mirror X/Y is on, its reflections. Reflections obey
    // the active selection just like the cell the user actually touched.
    const setCellMirrored = (x, y, active) => {
        if (!mirror || (!mirror.x && !mirror.y)) {
            setCellActive(x, y, active);
            return;
        }
        for (const [mx, my] of mirroredPoints(x, y, mirror, tileWidth, tileHeight)) {
            if (activeSelection.size > 0 && !activeSelection.has(key(mx, my)))
                continue;
            setCellActive(mx, my, active);
        }
    };
    // ── Pencil brush ──────────────────────────────────────────────────────────
    const applyPencilBrush = (cx, cy, activate) => {
        const size = toolState.getPencilSize();
        // Exactly size x size cells (see brushExtent for how even sizes are placed).
        const { before, after } = brushExtent(size);
        const sel = activeSelection.size > 0 ? activeSelection : undefined;
        for (let by = cy - before; by <= cy + after; by++) {
            for (let bx = cx - before; bx <= cx + after; bx++) {
                if (!isInBounds(bx, by))
                    continue;
                if (sel && !sel.has(key(bx, by)))
                    continue;
                setCellMirrored(bx, by, activate);
            }
        }
    };
    // ── Dither brush ──────────────────────────────────────────────────────────
    // Paints a dot pattern anchored to the grid. In "add" mode it only ever turns
    // cells on, so pixels that are already there are left alone.
    const applyDitherBrush = (cx, cy) => {
        var _a, _b;
        const size = toolState.getDitherSize();
        const { before, after } = brushExtent(size);
        const density = (_a = toolOptions === null || toolOptions === void 0 ? void 0 : toolOptions.getDitherDensity()) !== null && _a !== void 0 ? _a : 50;
        const mode = (_b = toolOptions === null || toolOptions === void 0 ? void 0 : toolOptions.getDitherMode()) !== null && _b !== void 0 ? _b : "add";
        const sel = activeSelection.size > 0 ? activeSelection : undefined;
        for (let by = cy - before; by <= cy + after; by++) {
            for (let bx = cx - before; bx <= cx + after; bx++) {
                if (!isInBounds(bx, by))
                    continue;
                if (sel && !sel.has(key(bx, by)))
                    continue;
                const action = ditherBrushAction(ditherPatternOn(bx, by, density), mode);
                if (action === null)
                    continue;
                setCellMirrored(bx, by, action);
            }
        }
    };
    const paintBrush = (tool, cx, cy) => {
        if (tool === "ditherBrush")
            applyDitherBrush(cx, cy);
        else
            applyPencilBrush(cx, cy, penToggleState !== null && penToggleState !== void 0 ? penToggleState : true);
    };
    // ── Gradient fill ─────────────────────────────────────────────────────────
    const commitGradient = () => {
        const start = lineStart;
        const end = gradientEnd;
        gradientDragging = false;
        gradientEnd = null;
        setLineStart(null); // also clears the drag preview line
        if (!start || !toolOptions)
            return;
        const region = activeSelection.size > 0 ? activeSelection : null;
        let from = start;
        let to = end !== null && end !== void 0 ? end : start;
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
                if (region && !region.has(key(x, y)))
                    continue;
                const on = result[y][x] === 1;
                if (keepExisting && !on)
                    continue;
                setCellActive(x, y, on);
            }
        }
        onPatternChange();
    };
    // ── Paste commit ──────────────────────────────────────────────────────────
    const paste = (anchorX, anchorY, clipboard) => {
        clearPastePreview();
        const entry = clipboard.paste();
        if (!entry)
            return;
        // Center on the anchor cell
        const halfW = Math.floor(entry.width / 2);
        const halfH = Math.floor(entry.height / 2);
        for (const c of entry.cells) {
            if (!c.active)
                continue;
            const tx = anchorX + (c.x - entry.originX) - halfW;
            const ty = anchorY + (c.y - entry.originY) - halfH;
            // Respect active selection boundary if one exists
            if (activeSelection.size > 0 && !activeSelection.has(key(tx, ty)))
                continue;
            setCellActive(tx, ty, c.active);
        }
        onPatternChange();
    };
    // ── Cut ───────────────────────────────────────────────────────────────────
    const cutSelection = (clipboard) => {
        if (!hasSelection())
            return;
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
    const copySelection = (clipboard) => {
        if (!hasSelection())
            return;
        // Compute bounding box
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        activeSelection.forEach((k) => {
            const [x, y] = k.split(",").map(Number);
            if (x < minX)
                minX = x;
            if (y < minY)
                minY = y;
            if (x > maxX)
                maxX = x;
            if (y > maxY)
                maxY = y;
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
            drawingTools === null || drawingTools === void 0 ? void 0 : drawingTools.invertSelection(activeSelection);
        }
        else {
            applyPattern(invertPattern(patternState));
        }
        onPatternChange();
    };
    // ── Invert Selection ─────────────────────────────────────────────────────
    // Toggles which cells are selected: everything not selected becomes selected.
    const invertSelection = () => {
        const newSel = new Set();
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
    const shiftDir = (dx, dy) => {
        if (hasSelection()) {
            const { pattern: next, movedSelection } = shiftSelection(patternState, activeSelection, dx, dy);
            patternState = next;
            activeSelection = movedSelection;
            applyPattern(patternState);
            renderSelection();
        }
        else {
            if (dx === -1)
                applyPattern(shiftPatternLeft(patternState));
            else if (dx === 1)
                applyPattern(shiftPatternRight(patternState));
            else if (dy === 1)
                applyPattern(shiftPatternDown(patternState));
            else if (dy === -1)
                applyPattern(shiftPatternUp(patternState));
        }
        onPatternChange();
    };
    // ── Rotate ────────────────────────────────────────────────────────────────
    const rotateDir = (direction) => {
        if (!hasSelection())
            return;
        const { pattern: next, rotatedSelection } = rotateSelection(patternState, activeSelection, direction);
        patternState = next;
        activeSelection = rotatedSelection;
        applyPattern(patternState);
        renderSelection();
        onPatternChange();
    };
    // ── Flip ──────────────────────────────────────────────────────────────────
    const flipDir = (direction) => {
        if (!hasSelection())
            return;
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
    const applyPattern = (next) => {
        var _a;
        for (let y = 0; y < tileHeight; y++) {
            for (let x = 0; x < tileWidth; x++) {
                setCellActive(x, y, ((_a = next[y]) === null || _a === void 0 ? void 0 : _a[x]) === 1);
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
            selectAreaBtn === null || selectAreaBtn === void 0 ? void 0 : selectAreaBtn.classList.add("selected");
            // Show select-mode cursor on the grid
            gridDiv.classList.add("select-mode");
        }
    });
    const releaseShift = () => {
        isShiftDown = false;
        // Only remove highlight if select tool isn't permanently active
        if (toolState.getCurrentTool() !== "selectArea") {
            selectAreaBtn === null || selectAreaBtn === void 0 ? void 0 : selectAreaBtn.classList.remove("selected");
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
        if (gradientDragging)
            commitGradient();
        // Commit Select Area drag regardless of current tool if we started one
        if (selectAreaStart && selectAreaEnd) {
            const rect = buildRectSet(selectAreaStart, selectAreaEnd);
            if (selectAreaAdding) {
                rect.forEach((k) => activeSelection.add(k));
            }
            else {
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
        if (isShiftDown)
            releaseShift();
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
        let centerCross = gridDiv.querySelector('.center-cross-overlay');
        if (!centerCross) {
            centerCross = document.createElement("div");
            centerCross.className = "center-cross-overlay";
            gridDiv.appendChild(centerCross);
        }
        if (guideState.isCenterEnabled()) {
            centerCross.style.display = "block";
            centerCross.style.top = "50%";
            centerCross.style.left = "50%";
        }
        else {
            centerCross.style.display = "none";
        }
    };
    // Ruler ticks + labels on the outside of the drawable grid. Top/left rulers
    // mark every grid line (numbered every 5). Center ticks render on all four
    // sides when the center guide is enabled — and show even without the ruler.
    const renderRulers = () => {
        const frame = gridDiv.parentElement;
        if (!frame)
            return;
        const topRuler = frame.querySelector(".grid-ruler-top");
        const bottomRuler = frame.querySelector(".grid-ruler-bottom");
        const leftRuler = frame.querySelector(".grid-ruler-left");
        const rightRuler = frame.querySelector(".grid-ruler-right");
        if (!topRuler || !bottomRuler || !leftRuler || !rightRuler)
            return;
        const rulerEnabled = guideState.isRulerEnabled();
        const centerEnabled = guideState.isCenterEnabled();
        // Keep the ruler strips visible if either the ruler or the center ticks are shown
        frame.classList.toggle("ruler-off", !rulerEnabled && !centerEnabled);
        [topRuler, bottomRuler, leftRuler, rightRuler].forEach((r) => r.replaceChildren());
        // Nothing to render when both toggles are off
        if (!rulerEnabled && !centerEnabled)
            return;
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
                    }
                    else {
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
                    }
                    else {
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
            const addCenterTick = (ruler, vertical, pos) => {
                const tick = document.createElement("div");
                tick.className = "grid-ruler-tick grid-ruler-tick-center";
                if (vertical) {
                    tick.style.left = `${pos}px`;
                    tick.style.top = "0";
                    tick.style.height = "100%";
                    tick.style.width = "2px";
                }
                else {
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
        var _a;
        for (let y = 0; y < tileHeight; y++) {
            for (let x = 0; x < tileWidth; x++) {
                const cell = (_a = cellMatrix[y]) === null || _a === void 0 ? void 0 : _a[x];
                if (!cell)
                    continue;
                cell.classList.remove("guide-v", "guide-h");
                if (guideState.isBlackEnabled()) {
                    if (x !== 0 && x % 5 === 0)
                        cell.classList.add("guide-v");
                    if (y !== 0 && y % 5 === 0)
                        cell.classList.add("guide-h");
                }
            }
        }
        updateCenterOverlay();
        renderRulers();
    };
    // ── Grid generation ───────────────────────────────────────────────────────
    function generateGrid(pattern) {
        var _a, _b, _c, _d, _e, _f;
        tileWidth = fixedWidth !== null && fixedWidth !== void 0 ? fixedWidth : parseInt(tileWidthInput.value);
        tileHeight = fixedHeight !== null && fixedHeight !== void 0 ? fixedHeight : parseInt(tileHeightInput.value);
        setLineStart(null);
        clearCirclePreview();
        clearStarPreview();
        clearPastePreview();
        clearSelection();
        applyGridSizing();
        const base = pattern !== null && pattern !== void 0 ? pattern : patternState;
        patternState = Array.from({ length: tileHeight }, (_, y) => Array.from({ length: tileWidth }, (_, x) => { var _a; return ((_a = base[y]) === null || _a === void 0 ? void 0 : _a[x]) === 1 ? 1 : 0; }));
        const nextMatrix = Array.from({ length: tileHeight }, () => []);
        // Remove extra rows
        for (let y = tileHeight; y < currentHeight; y++) {
            (_a = cellMatrix[y]) === null || _a === void 0 ? void 0 : _a.forEach((c) => c.remove());
        }
        // Remove extra cols from kept rows
        for (let y = 0; y < Math.min(tileHeight, currentHeight); y++) {
            for (let x = tileWidth; x < currentWidth; x++) {
                (_c = (_b = cellMatrix[y]) === null || _b === void 0 ? void 0 : _b[x]) === null || _c === void 0 ? void 0 : _c.remove();
            }
        }
        currentWidth = tileWidth;
        currentHeight = tileHeight;
        updateCenterOverlay();
        let lastCell;
        for (let y = 0; y < tileHeight; y++) {
            for (let x = 0; x < tileWidth; x++) {
                let cell = (_e = (_d = cellMatrix[y]) === null || _d === void 0 ? void 0 : _d[x]) !== null && _e !== void 0 ? _e : document.createElement("div");
                if (!((_f = cellMatrix[y]) === null || _f === void 0 ? void 0 : _f[x])) {
                    cell.className = "cell";
                    cell.dataset.x = x.toString();
                    cell.dataset.y = y.toString();
                }
                // DOM position
                if (lastCell !== undefined) {
                    if (cell.previousSibling !== lastCell) {
                        gridDiv.insertBefore(cell, lastCell.nextSibling);
                    }
                }
                else if (!cell.parentElement) {
                    gridDiv.appendChild(cell);
                }
                nextMatrix[y][x] = cell;
                lastCell = cell;
                // Reset classes
                cell.className = "cell";
                cell.classList.toggle("active", patternState[y][x] === 1);
                if (guideState.isBlackEnabled()) {
                    if (x !== 0 && x % 5 === 0)
                        cell.classList.add("guide-v");
                    if (y !== 0 && y % 5 === 0)
                        cell.classList.add("guide-h");
                }
                // ── Event handlers ─────────────────────────────────────────────
                // Capture x/y in closure (re-assign to avoid stale capture issue)
                const cx = x, cy = y;
                cell.onmousedown = (e) => {
                    const actualTool = toolState.getCurrentTool();
                    const tool = isShiftDown ? "selectArea" : actualTool;
                    pencilPaintedOnMouseDown = false;
                    // Paint the cell the stroke starts on, and decide whether this
                    // stroke draws or erases from that cell's state.
                    if ((tool === "pencil" || tool === "ditherBrush") && e.button === 0) {
                        beginStroke();
                        if (tool === "pencil")
                            penToggleState = !isCellActive(cx, cy);
                        paintBrush(tool, cx, cy);
                        lastPencilCell = { x: cx, y: cy };
                        pencilPaintedOnMouseDown = true;
                        onPatternChange();
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
                    if (isShiftDown)
                        return;
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
                    }
                    else if (tool === "ditherBrush") {
                        if (pencilPaintedOnMouseDown) {
                            pencilPaintedOnMouseDown = false;
                            return;
                        }
                        applyDitherBrush(cx, cy);
                        onPatternChange();
                    }
                    else if (tool === "line") {
                        if (!lineStart) {
                            setLineStart({ x: cx, y: cy });
                            return;
                        }
                        drawingTools === null || drawingTools === void 0 ? void 0 : drawingTools.drawLine(lineStart.x, lineStart.y, cx, cy, sel);
                        setLineStart(null);
                        onPatternChange();
                    }
                    else if (tool === "fill") {
                        if (hasSelection()) {
                            drawingTools === null || drawingTools === void 0 ? void 0 : drawingTools.invertSelection(activeSelection);
                        }
                        else {
                            drawingTools === null || drawingTools === void 0 ? void 0 : drawingTools.floodFill(cx, cy, sel);
                        }
                        onPatternChange();
                    }
                    else if (tool === "shade") {
                        if (hasSelection()) {
                            drawingTools === null || drawingTools === void 0 ? void 0 : drawingTools.shadeSelection(activeSelection);
                        }
                        else {
                            drawingTools === null || drawingTools === void 0 ? void 0 : drawingTools.floodShade(cx, cy, sel);
                        }
                        onPatternChange();
                    }
                    else if (tool === "shape") {
                        drawingTools === null || drawingTools === void 0 ? void 0 : drawingTools.drawShape(toolState.getShapeType(), cx, cy, toolState.getShapeRadius(), sel);
                        clearStarPreview(); // using same dim overlay for shape if added later
                        onPatternChange();
                    }
                    else if (tool === "circle") {
                        drawingTools === null || drawingTools === void 0 ? void 0 : drawingTools.drawCircle(cx, cy, toolState.getCircleRadius(), sel);
                        clearCirclePreview();
                        onPatternChange();
                    }
                    else if (tool === "paste") {
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
                        if (tool === "pencil" && penToggleState === null)
                            penToggleState = !isCellActive(cx, cy);
                        // Join the previous cell to this one so fast drags leave no gaps.
                        const from = lastPencilCell !== null && lastPencilCell !== void 0 ? lastPencilCell : { x: cx, y: cy };
                        for (const [lx, ly] of lineCells(from.x, from.y, cx, cy)) {
                            paintBrush(tool, lx, ly);
                        }
                        lastPencilCell = { x: cx, y: cy };
                        onPatternChange();
                        return;
                    }
                    if (!isMouseDown && tool === "circle") {
                        previewCircle({ x: cx, y: cy }, toolState.getCircleRadius());
                        return;
                    }
                    if (!isMouseDown && tool === "shape") {
                        previewShape(toolState.getShapeType(), { x: cx, y: cy }, toolState.getShapeRadius());
                        return;
                    }
                    if (tool === "line" && lineStart) {
                        previewLine(cx, cy);
                        return;
                    }
                    if (!isMouseDown && tool === "paste" && (clipboard === null || clipboard === void 0 ? void 0 : clipboard.hasContent())) {
                        const entry = clipboard.paste();
                        if (entry)
                            showPastePreview(cx, cy, entry);
                    }
                };
            }
        }
        cellMatrix = nextMatrix;
        renderRulers();
        onPatternChange();
    }
    // ── Input listeners ───────────────────────────────────────────────────────
    tileWidthInput.addEventListener("input", () => {
        if (fixedWidth !== undefined)
            return;
        tileWidthValue.value = tileWidthInput.value;
        generateGrid();
    });
    tileHeightInput.addEventListener("input", () => {
        if (fixedHeight !== undefined)
            return;
        tileHeightValue.value = tileHeightInput.value;
        generateGrid();
    });
    tileWidthValue.addEventListener("change", () => {
        if (fixedWidth !== undefined)
            return;
        tileWidthInput.value = tileWidthValue.value;
        generateGrid();
    });
    tileHeightValue.addEventListener("change", () => {
        if (fixedHeight !== undefined)
            return;
        tileHeightInput.value = tileHeightValue.value;
        generateGrid();
    });
    gridScaleInput === null || gridScaleInput === void 0 ? void 0 : gridScaleInput.addEventListener("change", applyGridSizing);
    // ── Tool change listener ──────────────────────────────────────────────────
    toolState.subscribeToToolChanges((tool) => {
        if (tool !== "line")
            setLineStart(null);
        if (tool !== "circle")
            clearCirclePreview();
        if (tool !== "shape")
            clearStarPreview();
        if (tool !== "paste")
            clearPastePreview();
        if (tool !== "selectArea") {
            selectAreaStart = null;
            selectAreaEnd = null;
            selectAreaPreview.clear();
        }
        // Sync select-mode cursor class with tool state
        if (tool === "selectArea") {
            gridDiv.classList.add("select-mode");
        }
        else if (!isShiftDown) {
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
        }
        else {
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
