var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { createClipboardManager } from "./app/clipboard.js";
import { initColorPresetControls } from "./app/colorPresets.js";
import { copyText } from "./app/copyText.js";
import { createDrawingTools } from "./app/drawingTools.js";
import { buildDevStorageOutput, buildPreviewLink, } from "./app/exportOutputs.js";
import { setupGridGuides } from "./app/gridGuides.js";
import { createGridManager } from "./app/gridManager.js";
import { setupHistoryShortcuts } from "./app/historyShortcuts.js";
import { initImageImportOverlay } from "./app/imageImportOverlay.js";
import { initInfoModal } from "./app/infoModal.js";
import { initMapSimulation, TEAM_COLOR_HEXES } from "./app/mapSimulation.js";
import { decodePatternBase64, generatePatternBase64, } from "./app/patternEncoding.js";
import { createPatternLoader } from "./app/patternLoader.js";
import { initPaneResizeControls } from "./app/paneResizeControls.js";
import { createPreviewRenderer } from "./app/previewRenderer.js";
import { createToolState } from "./app/toolState.js";
import { createToolOptions } from "./app/toolOptions.js";
import { createMirrorState } from "./app/mirror.js";
import { createMirrorControls } from "./app/mirrorControls.js";
import { createCheatSheet } from "./app/cheatSheet.js";
import { setupToolShortcuts } from "./app/toolShortcuts.js";
import { setupTooltips } from "./app/tooltips.js";
import { setupOfflineSupport } from "./app/offlineSupport.js";
import { createHistoryManager } from "./app/undoRedo.js";
import { initWorkspaceControls } from "./app/workspaceControls.js";
import { initThemeToggle } from "./app/themeToggle.js";
import { showToast } from "./app/toast.js";
document.addEventListener("DOMContentLoaded", () => {
    var _a, _b;
    const themeToggleEl = document.getElementById("themeToggle");
    if (themeToggleEl)
        initThemeToggle(themeToggleEl);
    // ── Element references ───────────────────────────────────────────────────
    const gridDiv = document.getElementById("grid");
    const scrapGridDiv = document.getElementById("scrapGrid");
    // Tool strip
    const toolButtons = document.querySelectorAll("[data-tool]");
    const sizeSlider = document.getElementById("toolSizeSlider");
    const sizeOutput = document.getElementById("toolSizeOutput");
    const sizePopover = document.getElementById("sizePopover");
    // We use sizePopover as the sizeGroup so toolState automatically hides/shows it
    const sizeGroup = sizePopover;
    // Undo / Redo
    const undoBtn = document.getElementById("undoBtn");
    const redoBtn = document.getElementById("redoBtn");
    const scrapUndoBtn = document.getElementById("scrapUndoBtn");
    const scrapRedoBtn = document.getElementById("scrapRedoBtn");
    // Edit actions
    const cutBtn = document.getElementById("cutBtn");
    const copyBtn = document.getElementById("copyBtn");
    const pasteBtn = document.getElementById("pasteBtn");
    // Transformations
    const shiftUpBtn = document.getElementById("shiftUpBtn");
    const shiftDownBtn = document.getElementById("shiftDownBtn");
    const shiftLeftBtn = document.getElementById("shiftLeftBtn");
    const shiftRightBtn = document.getElementById("shiftRightBtn");
    const flipHBtn = document.getElementById("flipHBtn");
    const flipVBtn = document.getElementById("flipVBtn");
    const rotateLeftBtn = document.getElementById("rotateLeftBtn");
    const rotateRightBtn = document.getElementById("rotateRightBtn");
    const deselectBtn = document.getElementById("deselectBtn");
    // Canvas controls
    const tileWidthInput = document.getElementById("tileWidth");
    const tileWidthValue = document.getElementById("tileWidthValue");
    const tileWidthUpBtn = document.getElementById("tileWidthUp");
    const tileWidthDownBtn = document.getElementById("tileWidthDown");
    const tileHeightInput = document.getElementById("tileHeight");
    const tileHeightValue = document.getElementById("tileHeightValue");
    const tileHeightUpBtn = document.getElementById("tileHeightUp");
    const tileHeightDownBtn = document.getElementById("tileHeightDown");
    // Scale tabs (replaces dropdown) — drives the pattern scale (encoded scale exponent 0-7)
    const scaleTabs = document.querySelectorAll("#scaleTabs .ctrl-tab");
    const setScale = (value) => {
        const clamped = Math.max(0, Math.min(2, value));
        scaleTabs.forEach((tab) => {
            var _a;
            const isSelected = parseInt((_a = tab.dataset.scale) !== null && _a !== void 0 ? _a : "0") === clamped;
            tab.classList.toggle("selected", isSelected);
            tab.setAttribute("aria-selected", isSelected ? "true" : "false");
        });
    };
    const invertBtn = document.getElementById("invertBtn");
    const clearBtn = document.getElementById("clearBtn");
    // Canvas tab switcher
    const canvasTabMain = document.getElementById("canvasTabMain");
    const canvasTabScrap = document.getElementById("canvasTabScrap");
    const mainViewport = document.getElementById("gridViewport");
    const scrapViewport = document.getElementById("scrapViewport");
    // Import
    const base64Input = document.getElementById("base64Input");
    const loadBtn = document.getElementById("loadBtn");
    // Export / Import toggle
    const exportTabBtn = document.getElementById("exportTabBtn");
    const importTabBtn = document.getElementById("importTabBtn");
    const exportPanel = document.getElementById("exportPanel");
    const importPanel = document.getElementById("importPanel");
    // Copy buttons
    const copyJsonBtn = document.getElementById("copyJsonBtn");
    const copyDevStorageBtn = document.getElementById("copyDevStorageBtn");
    const copyPreviewBtn = document.getElementById("copyPreviewBtn");
    // Preview panel
    const previewCanvas = document.getElementById("preview");
    const previewPrimaryColor = document.getElementById("previewPrimaryColor");
    const previewSecondaryColor = document.getElementById("previewSecondaryColor");
    const swapColorsBtn = document.getElementById("swapColorsBtn");
    const colorPresetContainer = document.getElementById("colorPresetContainer");
    const selectedPresetLabel = document.getElementById("selectedPresetLabel");
    const hidePreviewBtn = document.getElementById("hidePreviewBtn");
    const showPreviewBtn = document.getElementById("showPreviewBtn");
    const floatPreviewBtn = document.getElementById("floatPreviewBtn");
    const dockPreviewBtn = document.getElementById("dockPreviewBtn");
    const previewPanel = document.querySelector(".preview-panel");
    const previewHeader = document.querySelector(".preview-header");
    const previewZoomInBtn = document.getElementById("previewZoomInBtn");
    const previewZoomOutBtn = document.getElementById("previewZoomOutBtn");
    const previewZoomValue = document.getElementById("previewZoomValue");
    const copyPreviewImageBtn = document.getElementById("copyPreviewImageBtn");
    const copyColorsBtn = document.getElementById("copyColorsBtn");
    const favoriteColorsBtn = document.getElementById("favoriteColorsBtn");
    const favoritesContainer = document.getElementById("favoritesContainer");
    const previewCanvasWrap = document.getElementById("previewCanvasWrap");
    // Map simulation
    const mapSimBtn = document.getElementById("mapSimBtn");
    const mapPopover = document.getElementById("mapPopover");
    const mapSimToggle = document.getElementById("mapSimToggle");
    const mapList = document.getElementById("mapList");
    const mapPopoverNote = document.getElementById("mapPopoverNote");
    const mapTeamToggle = document.getElementById("mapShowTeamColors");
    const mapTeamColorsWrap = document.getElementById("mapTeamColors");
    const mapTeamColorsCanvas = document.getElementById("mapTeamColorsCanvas");
    // Submission
    const submitPatternBtn = document.getElementById("submitPatternBtn");
    // Workspace zoom
    const zoomInBtn = document.getElementById("zoomInBtn");
    const zoomOutBtn = document.getElementById("zoomOutBtn");
    const resetViewBtn = document.getElementById("resetViewBtn");
    const zoomValueEl = document.getElementById("zoomValue");
    if (!colorPresetContainer)
        throw new Error("Missing #colorPresetContainer");
    const previewCtx = previewCanvas.getContext("2d");
    if (!previewCtx)
        throw new Error("2D context not supported");
    // ── Clipboard ─────────────────────────────────────────────────────────────
    const clipboard = createClipboardManager();
    // ── Canvas switcher state ─────────────────────────────────────────────────
    let isScrapActive = false;
    let workspaceRefresh = () => { };
    const switchCanvas = (scrap) => {
        isScrapActive = scrap;
        mainViewport.hidden = scrap;
        scrapViewport.hidden = !scrap;
        canvasTabMain.classList.toggle("selected", !scrap);
        canvasTabScrap.classList.toggle("selected", scrap);
        undoBtn.hidden = scrap;
        redoBtn.hidden = scrap;
        scrapUndoBtn.hidden = !scrap;
        scrapRedoBtn.hidden = !scrap;
        // The test canvas is a fixed 128×128 scratch pad — size controls are locked
        // while it is active and always show its fixed dimensions.
        const sizeControls = [
            tileWidthInput, tileWidthValue, tileWidthUpBtn, tileWidthDownBtn,
            tileHeightInput, tileHeightValue, tileHeightUpBtn, tileHeightDownBtn,
        ];
        sizeControls.forEach((c) => (c.disabled = scrap));
        if (scrap) {
            const w = scrapGrid.getTileWidth();
            const h = scrapGrid.getTileHeight();
            tileWidthInput.value = String(w);
            tileWidthValue.value = String(w);
            tileHeightInput.value = String(h);
            tileHeightValue.value = String(h);
        }
        else {
            const w = mainGrid.getTileWidth();
            const h = mainGrid.getTileHeight();
            tileWidthInput.value = String(w);
            tileWidthValue.value = String(w);
            tileHeightInput.value = String(h);
            tileHeightValue.value = String(h);
        }
        workspaceRefresh();
        updateOutput();
    };
    canvasTabMain.addEventListener("click", () => switchCanvas(false));
    canvasTabScrap.addEventListener("click", () => {
        switchCanvas(true);
        showScrapToast();
    });
    // ── Scrap (test) canvas first-use toast ───────────────────────────────────
    let scrapToastShown = false;
    const SCRAP_TOAST_DURATION = 6000;
    const showScrapToast = () => {
        if (scrapToastShown)
            return;
        scrapToastShown = true;
        showToast("<strong>Test Canvas</strong> — a fixed 128×128 scratch pad. " +
            "Anything drawn here is temporary and won't be saved or affect the main canvas.", SCRAP_TOAST_DURATION);
    };
    const toolState = createToolState({ toolButtons, sizeSlider, sizeOutput, sizeGroup });
    const toolOptions = createToolOptions(toolState);
    // Each canvas keeps its own mirror lines; the Mirror buttons toggle both.
    const mainMirror = createMirrorState();
    const scrapMirror = createMirrorState();
    const shapeTypeSelect = document.getElementById("shapeType");
    if (shapeTypeSelect) {
        shapeTypeSelect.addEventListener("change", () => {
            toolState.selectTool("shape");
        });
    }
    // ── Guide state ───────────────────────────────────────────────────────────
    let handleGuideChange = () => { };
    const guideState = setupGridGuides(document.getElementById("canvasControlsBar"), () => handleGuideChange());
    // ── MAIN grid manager ─────────────────────────────────────────────────────
    const mainGrid = createGridManager({
        gridDiv,
        tileWidthInput,
        tileHeightInput,
        tileWidthValue,
        tileHeightValue,
        guideState,
        toolState,
        clipboard,
        onPatternChange: () => { if (!isScrapActive)
            updateOutput(); },
        onStrokeStart: () => mainHistory.beginBatch(),
        onStrokeEnd: () => { mainHistory.endBatch(); updateHistoryButtons(); },
        mirror: mainMirror,
        toolOptions,
    });
    const mainDrawingTools = createDrawingTools({
        getTileWidth: mainGrid.getTileWidth,
        getTileHeight: mainGrid.getTileHeight,
        isCellActive: mainGrid.isCellActive,
        setCellActive: mainGrid.setCellActive,
        setDrawCellActive: mainGrid.setCellMirrored,
    });
    mainGrid.setDrawingTools(mainDrawingTools);
    handleGuideChange = () => {
        // Refresh both canvases so guide/center toggles stay in sync on the main
        // and test canvases without resizing either one.
        mainGrid.refreshGuides();
        scrapGrid.refreshGuides();
    };
    // ── SCRAP grid manager ────────────────────────────────────────────────────
    // The test canvas is a fixed 128×128 scratch pad that ignores the shared
    // size inputs, so it is never adjusted by (or adjusts) the main canvas.
    const SCRAP_SIZE = 128;
    const scrapGrid = createGridManager({
        gridDiv: scrapGridDiv,
        tileWidthInput,
        tileHeightInput,
        tileWidthValue,
        tileHeightValue,
        guideState,
        toolState,
        clipboard,
        fixedWidth: SCRAP_SIZE,
        fixedHeight: SCRAP_SIZE,
        onPatternChange: () => { if (isScrapActive)
            updateOutput(); },
        onStrokeStart: () => scrapHistory.beginBatch(),
        onStrokeEnd: () => { scrapHistory.endBatch(); updateHistoryButtons(); },
        mirror: scrapMirror,
        toolOptions,
    });
    const scrapDrawingTools = createDrawingTools({
        getTileWidth: scrapGrid.getTileWidth,
        getTileHeight: scrapGrid.getTileHeight,
        isCellActive: scrapGrid.isCellActive,
        setCellActive: scrapGrid.setCellActive,
        setDrawCellActive: scrapGrid.setCellMirrored,
    });
    scrapGrid.setDrawingTools(scrapDrawingTools);
    // ── Mirror lines, shortcuts, tooltips ─────────────────────────────────────
    const mirrorControls = createMirrorControls({
        xButton: document.getElementById("mirrorXBtn"),
        yButton: document.getElementById("mirrorYBtn"),
        grids: [
            { gridDiv, state: mainMirror, getWidth: mainGrid.getTileWidth, getHeight: mainGrid.getTileHeight },
            { gridDiv: scrapGridDiv, state: scrapMirror, getWidth: scrapGrid.getTileWidth, getHeight: scrapGrid.getTileHeight },
        ],
    });
    const cheatSheet = createCheatSheet(document.getElementById("shortcutsBtn"));
    setupToolShortcuts({ toolState, mirror: mirrorControls, cheatSheet });
    setupTooltips();
    setupOfflineSupport();
    // Helper — active grid
    const activeGrid = () => (isScrapActive ? scrapGrid : mainGrid);
    // ── History managers ──────────────────────────────────────────────────────
    const mainHistory = createHistoryManager();
    // The test canvas can't be base64-encoded (128×128 exceeds the format's
    // height limit), so its history stores raw pattern matrices instead.
    const scrapHistory = createHistoryManager(200, (p) => p.map((row) => row.join("")).join("|"));
    let isApplyingHistory = false;
    const updateHistoryButtons = () => {
        undoBtn.disabled = !mainHistory.canUndo();
        redoBtn.disabled = !mainHistory.canRedo();
        scrapUndoBtn.disabled = !scrapHistory.canUndo();
        scrapRedoBtn.disabled = !scrapHistory.canRedo();
    };
    // ── Scale + output state ─────────────────────────────────────────────────
    // Scale tabs drive the pattern scale (encoded scale exponent 0-7)
    const scaleExponent = () => {
        var _a;
        const selected = document.querySelector("#scaleTabs .ctrl-tab.selected");
        return selected ? parseInt((_a = selected.dataset.scale) !== null && _a !== void 0 ? _a : "0") : 0;
    };
    // ── Preview renderer ──────────────────────────────────────────────────────
    let simMapRef = null;
    let teamColorsRef = null;
    // Background shown behind the preview canvas. In simulate-map mode the
    // panel is the map's impassable/background colour (#3c3c3c), not the
    // pattern's primary colour, so zooming out never bleeds primary into view.
    const setPreviewWrapBackground = () => {
        if (!previewCanvasWrap)
            return;
        previewCanvasWrap.style.background = simMapRef ? "#3c3c3c" : previewPrimaryColor.value;
    };
    const renderPreview = createPreviewRenderer({
        canvas: previewCanvas,
        context: previewCtx,
        primaryColorInput: previewPrimaryColor,
        secondaryColorInput: previewSecondaryColor,
        canvasWrap: previewCanvasWrap,
        getZoom: () => previewZoom,
        getSimMap: () => simMapRef,
        getTeamColors: () => teamColorsRef,
    });
    // ── Preview zoom ──────────────────────────────────────────────────────────
    // Zoom is the displayed CSS px per tile cell (× the encoded pattern scale).
    // The renderer draws at device-pixel resolution, so every zoom level stays
    // pixel-exact — including 50% — on high-DPI displays.
    const PREVIEW_ZOOM_LEVELS = [0.5, 1, 2, 3, 4, 5];
    let previewZoomIndex = 1;
    let previewZoom = PREVIEW_ZOOM_LEVELS[previewZoomIndex];
    const updatePreviewZoomLabel = () => {
        previewZoomValue.textContent = `${Math.round(previewZoom * 100)}%`;
    };
    const setPreviewZoom = (index) => {
        previewZoomIndex = Math.max(0, Math.min(PREVIEW_ZOOM_LEVELS.length - 1, index));
        previewZoom = PREVIEW_ZOOM_LEVELS[previewZoomIndex];
        updatePreviewZoomLabel();
        renderPreviewOnly();
    };
    previewZoomInBtn.addEventListener("click", () => setPreviewZoom(previewZoomIndex + 1));
    previewZoomOutBtn.addEventListener("click", () => setPreviewZoom(previewZoomIndex - 1));
    // ── Copy preview image ────────────────────────────────────────────────────
    // Copies the preview canvas exactly as displayed to the clipboard as a PNG.
    copyPreviewImageBtn.addEventListener("click", () => __awaiter(void 0, void 0, void 0, function* () {
        if (previewCanvas.width === 0 || previewCanvas.height === 0)
            return;
        try {
            const blob = yield new Promise((resolve) => previewCanvas.toBlob(resolve, "image/png"));
            if (!blob) {
                showToast("Could not copy preview image.");
                return;
            }
            yield navigator.clipboard.write([
                new ClipboardItem({ "image/png": blob }),
            ]);
            showToast("Preview image copied to clipboard.");
        }
        catch (_a) {
            showToast("Could not copy preview image.");
        }
    }));
    // ── Output update ─────────────────────────────────────────────────────────
    const clonePattern = (pattern) => pattern.map((row) => [...row]);
    // Re-renders the preview bitmap only — no history/URL side effects. Safe to
    // call on panel resizes and zoom changes without polluting undo history.
    const renderPreviewOnly = () => {
        const grid = activeGrid();
        const pattern = grid.getCurrentPattern();
        if (isScrapActive) {
            renderPreview(pattern, true);
        }
        else {
            const scale = scaleExponent();
            try {
                const base64 = generatePatternBase64(pattern, grid.getTileWidth(), grid.getTileHeight(), scale);
                renderPreview(base64, false);
            }
            catch (_a) {
                return;
            }
        }
        if (previewCanvasWrap) {
            setPreviewWrapBackground();
        }
    };
    // Re-render whenever the preview panel is resized so the tile layout stays an
    // integer multiple of the pattern tile at the current zoom.
    if (typeof ResizeObserver !== "undefined" && previewCanvasWrap) {
        new ResizeObserver(() => {
            if (previewCanvasWrap.clientWidth > 0 && previewCanvasWrap.clientHeight > 0) {
                renderPreviewOnly();
            }
        }).observe(previewCanvasWrap);
    }
    let updateOutput = () => { };
    updateOutput = () => {
        const grid = activeGrid();
        const pattern = grid.getCurrentPattern();
        const primary = previewPrimaryColor.value;
        // Test canvas: render + record directly from the raw pattern. It can't be
        // base64-encoded (128×128 exceeds the format's height limit), so we skip
        // the URL hash and encoding entirely for it.
        if (isScrapActive) {
            renderPreview(pattern, true);
            if (previewCanvasWrap) {
                setPreviewWrapBackground();
            }
            if (!isApplyingHistory)
                scrapHistory.record(clonePattern(pattern));
            updateHistoryButtons();
            return;
        }
        const scale = scaleExponent();
        let base64;
        try {
            base64 = generatePatternBase64(pattern, grid.getTileWidth(), grid.getTileHeight(), scale);
        }
        catch (_a) {
            return;
        }
        const secondary = previewSecondaryColor.value;
        renderPreview(base64, false);
        if (previewCanvasWrap) {
            setPreviewWrapBackground();
        }
        // Update URL hash from MAIN canvas only
        const params = new URLSearchParams({
            primary: primary.replace("#", ""),
            secondary: secondary.replace("#", ""),
        });
        window.history.replaceState(null, "", `#${base64}?${params}`);
        if (!isApplyingHistory)
            mainHistory.record(base64);
        updateHistoryButtons();
    };
    // ── Undo / Redo ───────────────────────────────────────────────────────────
    const applyMainHistoryState = (base64) => {
        let decoded;
        try {
            decoded = decodePatternBase64(base64);
        }
        catch (_a) {
            return;
        }
        const { pattern, tileWidth, tileHeight, scale } = decoded;
        tileWidthInput.value = tileWidth.toString();
        tileWidthValue.value = tileWidthInput.value;
        tileHeightInput.value = tileHeight.toString();
        tileHeightValue.value = tileHeightInput.value;
        // Update scale tabs
        setScale(scale);
        // Clear any active selection so it doesn't mask the restored pattern
        mainGrid.clearSelection();
        isApplyingHistory = true;
        mainGrid.generateGrid(pattern);
        isApplyingHistory = false;
    };
    const applyScrapHistoryState = (pattern) => {
        scrapGrid.clearSelection();
        isApplyingHistory = true;
        scrapGrid.generateGrid(pattern);
        isApplyingHistory = false;
    };
    const handleUndo = () => {
        if (isScrapActive) {
            const s = scrapHistory.undo();
            if (s)
                applyScrapHistoryState(s);
        }
        else {
            const s = mainHistory.undo();
            if (s)
                applyMainHistoryState(s);
        }
    };
    const handleRedo = () => {
        if (isScrapActive) {
            const s = scrapHistory.redo();
            if (s)
                applyScrapHistoryState(s);
        }
        else {
            const s = mainHistory.redo();
            if (s)
                applyMainHistoryState(s);
        }
    };
    undoBtn.addEventListener("click", handleUndo);
    redoBtn.addEventListener("click", handleRedo);
    scrapUndoBtn.addEventListener("click", handleUndo);
    scrapRedoBtn.addEventListener("click", handleRedo);
    // ── Canvas size steppers ──────────────────────────────────────────────────
    const clampW = (v) => Math.max(2, Math.min(128, v));
    const clampH = (v) => Math.max(2, Math.min(64, v));
    const makeStepper = (btnUp, btnDown, input, valueLabel, clamp) => {
        const update = (delta) => {
            const v = clamp((parseInt(input.value) || 2) + delta);
            input.value = String(v);
            valueLabel.value = String(v);
            activeGrid().generateGrid();
        };
        btnUp.addEventListener("click", () => update(1));
        btnDown.addEventListener("click", () => update(-1));
        valueLabel.addEventListener("change", () => update(0));
    };
    makeStepper(tileWidthUpBtn, tileWidthDownBtn, tileWidthInput, tileWidthValue, clampW);
    makeStepper(tileHeightUpBtn, tileHeightDownBtn, tileHeightInput, tileHeightValue, clampH);
    // ── Scale tabs ────────────────────────────────────────────────────────────
    scaleTabs.forEach((tab) => {
        tab.addEventListener("click", () => {
            var _a;
            setScale(parseInt((_a = tab.dataset.scale) !== null && _a !== void 0 ? _a : "0"));
            updateOutput();
        });
    });
    // ── Invert / Clear ───────────────────────────────────────────────────────
    invertBtn.addEventListener("click", () => activeGrid().invertGrid());
    clearBtn.addEventListener("click", () => activeGrid().clearGrid());
    // ── Shift / Rotate / Flip buttons ─────────────────────────────────────────
    shiftUpBtn.addEventListener("click", () => activeGrid().shiftDir(0, -1));
    shiftDownBtn.addEventListener("click", () => activeGrid().shiftDir(0, 1));
    shiftLeftBtn.addEventListener("click", () => activeGrid().shiftDir(-1, 0));
    shiftRightBtn.addEventListener("click", () => activeGrid().shiftDir(1, 0));
    rotateLeftBtn.addEventListener("click", () => activeGrid().rotateDir("left"));
    rotateRightBtn.addEventListener("click", () => activeGrid().rotateDir("right"));
    flipHBtn.addEventListener("click", () => activeGrid().flipDir("h"));
    flipVBtn.addEventListener("click", () => activeGrid().flipDir("v"));
    deselectBtn.addEventListener("click", () => {
        activeGrid().clearSelection();
        toolState.restoreTool();
    });
    // Enable/disable transform buttons based on selection
    const updateTransformButtons = () => {
        const hasSel = activeGrid().hasSelection();
        [shiftUpBtn, shiftDownBtn, shiftLeftBtn, shiftRightBtn, rotateLeftBtn, rotateRightBtn, flipHBtn, flipVBtn, deselectBtn]
            .forEach((btn) => (btn.disabled = !hasSel));
    };
    // Poll selection state (simple approach — could be event-driven)
    setInterval(updateTransformButtons, 200);
    // ── Cut / Copy / Paste ─────────────────────────────────────────────────────
    let prePasteTool = null;
    cutBtn.addEventListener("click", () => {
        activeGrid().cutSelection(clipboard);
    });
    copyBtn.addEventListener("click", () => {
        activeGrid().copySelection(clipboard);
    });
    pasteBtn.addEventListener("click", () => {
        if (clipboard.hasContent()) {
            prePasteTool = toolState.getCurrentTool();
            toolState.selectTool("paste");
        }
    });
    // When paste tool is active and user clicks on grid, paste happens
    // This is handled via onclick in gridManager by calling paste() from app
    // We override the paste behavior by listening after tool change
    toolState.subscribeToToolChanges((tool) => {
        if (tool === "paste") {
            // Override cell onclick for paste: handled in gridManager via cell click,
            // but gridManager needs clipboard reference. We wire it here:
            const grid = activeGrid();
            const gridEl = isScrapActive ? scrapGridDiv : gridDiv;
            const onGridClick = (e) => {
                var _a, _b;
                const target = e.target;
                if (!target.classList.contains("cell"))
                    return;
                const x = parseInt((_a = target.dataset.x) !== null && _a !== void 0 ? _a : "0");
                const y = parseInt((_b = target.dataset.y) !== null && _b !== void 0 ? _b : "0");
                grid.paste(x, y, clipboard);
                // Switch back to previous tool after single paste
                toolState.selectTool(prePasteTool || "selectArea");
                prePasteTool = null;
                gridEl.removeEventListener("click", onGridClick);
            };
            gridEl.addEventListener("click", onGridClick);
        }
    });
    // ── Export / Import tab toggle ────────────────────────────────────────────
    const switchExportImport = (mode) => {
        exportPanel.hidden = mode !== "export";
        importPanel.hidden = mode !== "import";
        exportTabBtn.classList.toggle("selected", mode === "export");
        importTabBtn.classList.toggle("selected", mode === "import");
    };
    exportTabBtn.addEventListener("click", () => switchExportImport("export"));
    importTabBtn.addEventListener("click", () => switchExportImport("import"));
    switchExportImport("export");
    // ── Copy buttons ─────────────────────────────────────────────────────────
    const getOutputBase64 = () => {
        const pattern = mainGrid.getCurrentPattern();
        return generatePatternBase64(pattern, mainGrid.getTileWidth(), mainGrid.getTileHeight(), scaleExponent());
    };
    copyJsonBtn.addEventListener("click", () => {
        copyText(getOutputBase64());
        showToast("Pattern JSON copied to clipboard.");
    });
    copyDevStorageBtn.addEventListener("click", () => {
        const b64 = getOutputBase64();
        copyText(buildDevStorageOutput(b64, previewPrimaryColor.value, previewSecondaryColor.value));
        showToast("Dev LocalStorage string copied to clipboard.");
    });
    copyPreviewBtn.addEventListener("click", () => {
        const b64 = getOutputBase64();
        const link = buildPreviewLink(window.location.href, b64, previewPrimaryColor.value, previewSecondaryColor.value);
        copyText(link);
        showToast("Preview link copied to clipboard.");
    });
    // ── Import ────────────────────────────────────────────────────────────────
    const loadFromBase64 = createPatternLoader({
        base64Input,
        tileWidthInput,
        tileHeightInput,
        tileWidthValue,
        tileHeightValue,
        onPatternLoaded: (pattern, scale) => {
            setScale(scale);
            mainGrid.generateGrid(pattern);
        },
    });
    loadBtn.addEventListener("click", loadFromBase64);
    // ── Colors ───────────────────────────────────────────────────────────────
    // (Color presets initialization is deferred until URL hash parsing is complete)
    // ── Preview panel collapse ────────────────────────────────────────────────
    const collapsePreview = () => {
        var _a;
        previewPanel.classList.add("collapsed");
        (_a = document.querySelector(".editor-shell")) === null || _a === void 0 ? void 0 : _a.classList.add("preview-collapsed");
        showPreviewBtn.hidden = false;
        document.getElementById("previewResizeHandle").hidden = true;
    };
    const expandPreview = () => {
        var _a;
        previewPanel.classList.remove("collapsed");
        (_a = document.querySelector(".editor-shell")) === null || _a === void 0 ? void 0 : _a.classList.remove("preview-collapsed");
        showPreviewBtn.hidden = true;
        document.getElementById("previewResizeHandle").hidden = false;
    };
    hidePreviewBtn.addEventListener("click", collapsePreview);
    showPreviewBtn.addEventListener("click", expandPreview);
    showPreviewBtn.hidden = true;
    // Float / dock preview
    let floatingPtr = null;
    let fStartX = 0, fStartY = 0, fLeft = 0, fTop = 0;
    const floatingResizeBtn = document.getElementById("floatingResizeBtn");
    // Persisted floating preview state
    const FLOAT_STATE_KEY = "floating-preview-state";
    let savedFloatState = null;
    const loadFloatState = () => {
        try {
            const raw = localStorage.getItem(FLOAT_STATE_KEY);
            if (raw)
                return JSON.parse(raw);
        }
        catch ( /* ignore */_a) { /* ignore */ }
        return null;
    };
    const saveFloatState = () => {
        const rect = previewPanel.getBoundingClientRect();
        // Enforce minimum constraints when saving
        const width = Math.max(MIN_WIDTH, Math.round(rect.width));
        const height = Math.max(MIN_HEIGHT, Math.round(rect.height));
        const state = {
            left: Math.round(rect.left),
            top: Math.round(rect.top),
            width,
            height,
        };
        localStorage.setItem(FLOAT_STATE_KEY, JSON.stringify(state));
        savedFloatState = state;
    };
    const applyFloatState = (state) => {
        if (!state)
            return;
        // Enforce minimum size constraints
        const width = Math.max(MIN_WIDTH, state.width);
        const height = Math.max(MIN_HEIGHT, state.height);
        previewPanel.style.left = `${state.left}px`;
        previewPanel.style.top = `${state.top}px`;
        previewPanel.style.width = `${width}px`;
        previewPanel.style.height = `${height}px`;
        // Clear bottom/right since we're using explicit positioning
        previewPanel.style.bottom = "";
        previewPanel.style.right = "";
    };
    // Minimum size constraints
    const MIN_WIDTH = 260;
    const MIN_HEIGHT = 380;
    // No maximum - can resize freely
    const clampPosition = (left, top, width, height) => {
        const maxL = window.innerWidth - width - 8;
        const maxT = window.innerHeight - height - 8;
        return {
            left: Math.max(8, Math.min(maxL, left)),
            top: Math.max(8, Math.min(maxT, top)),
        };
    };
    floatPreviewBtn.addEventListener("click", () => {
        var _a;
        collapsePreview();
        previewPanel.classList.add("floating");
        (_a = document.querySelector(".editor-shell")) === null || _a === void 0 ? void 0 : _a.classList.add("preview-floating");
        dockPreviewBtn.hidden = false;
        floatPreviewBtn.hidden = true;
        hidePreviewBtn.hidden = true;
        showPreviewBtn.hidden = true;
        floatingResizeBtn.hidden = false;
        floatingResizeBtn.style.cursor = "nwse-resize";
        // Restore saved position/size or use defaults
        savedFloatState = loadFloatState();
        if (savedFloatState) {
            applyFloatState(savedFloatState);
        }
        else {
            // Default: bottom-right anchored with min width and min height
            previewPanel.style.left = "";
            previewPanel.style.top = "";
            previewPanel.style.width = `${MIN_WIDTH}px`;
            previewPanel.style.height = `${MIN_HEIGHT}px`;
        }
    });
    let rPtr = null;
    let rStartW = 0, rStartH = 0, rStartX = 0, rStartY = 0;
    let rStartL = 0, rStartT = 0;
    floatingResizeBtn.addEventListener("pointerdown", (ev) => {
        ev.preventDefault();
        ev.stopImmediatePropagation();
        rPtr = ev.pointerId;
        floatingResizeBtn.setPointerCapture(ev.pointerId);
        rStartW = previewPanel.offsetWidth;
        rStartH = previewPanel.offsetHeight;
        rStartX = ev.clientX;
        rStartY = ev.clientY;
        // Get current position (works whether using left/top or bottom/right)
        const rect = previewPanel.getBoundingClientRect();
        rStartL = rect.left;
        rStartT = rect.top;
        // Switch to explicit left/top positioning for consistent resize behavior
        previewPanel.style.left = `${rStartL}px`;
        previewPanel.style.top = `${rStartT}px`;
        previewPanel.style.bottom = "";
        previewPanel.style.right = "";
    });
    floatingResizeBtn.addEventListener("pointermove", (ev) => {
        if (rPtr !== ev.pointerId)
            return;
        const dx = ev.clientX - rStartX;
        const dy = ev.clientY - rStartY;
        // Resize handle is at top-left (in header), so:
        // - Moving mouse left (negative dx) increases width, moves left edge left
        // - Moving mouse up (negative dy) increases height, moves top edge up
        // Both width and height can be resized freely with minimums
        const w = Math.max(MIN_WIDTH, rStartW - dx);
        const h = Math.max(MIN_HEIGHT, rStartH - dy);
        const dw = w - rStartW;
        const dh = h - rStartH;
        const newLeft = rStartL - dw;
        const newTop = rStartT - dh;
        const clamped = clampPosition(newLeft, newTop, w, h);
        previewPanel.style.left = `${clamped.left}px`;
        previewPanel.style.top = `${clamped.top}px`;
        previewPanel.style.width = `${w}px`;
        previewPanel.style.height = `${h}px`;
    });
    ["pointerup", "pointercancel"].forEach(evt => floatingResizeBtn.addEventListener(evt, (ev) => {
        if (rPtr !== ev.pointerId)
            return;
        rPtr = null;
        floatingResizeBtn.releasePointerCapture(ev.pointerId);
        saveFloatState();
    }));
    dockPreviewBtn.addEventListener("click", () => {
        var _a;
        expandPreview();
        previewPanel.classList.remove("floating");
        (_a = document.querySelector(".editor-shell")) === null || _a === void 0 ? void 0 : _a.classList.remove("preview-floating");
        previewPanel.style.left = "";
        previewPanel.style.top = "";
        previewPanel.style.bottom = "";
        previewPanel.style.right = "";
        previewPanel.style.width = "";
        previewPanel.style.height = "";
        dockPreviewBtn.hidden = true;
        floatPreviewBtn.hidden = false;
        hidePreviewBtn.hidden = false;
        floatingResizeBtn.hidden = true;
    });
    dockPreviewBtn.hidden = true;
    previewHeader.addEventListener("pointerdown", (e) => {
        if (!previewPanel.classList.contains("floating"))
            return;
        // Use composedPath to check if the click originated from a button (including shadow DOM)
        const path = e.composedPath();
        if (path.some((el) => el instanceof HTMLButtonElement))
            return;
        e.preventDefault();
        floatingPtr = e.pointerId;
        const rect = previewPanel.getBoundingClientRect();
        fStartX = e.clientX;
        fStartY = e.clientY;
        fLeft = rect.left;
        fTop = rect.top;
        previewHeader.setPointerCapture(e.pointerId);
    });
    previewHeader.addEventListener("pointermove", (e) => {
        if (floatingPtr !== e.pointerId)
            return;
        const newLeft = fLeft + e.clientX - fStartX;
        const newTop = fTop + e.clientY - fStartY;
        const clamped = clampPosition(newLeft, newTop, previewPanel.offsetWidth, previewPanel.offsetHeight);
        previewPanel.style.left = `${clamped.left}px`;
        previewPanel.style.top = `${clamped.top}px`;
        // Ensure we're using explicit positioning
        previewPanel.style.bottom = "";
        previewPanel.style.right = "";
    });
    ["pointerup", "pointercancel"].forEach(ev => previewHeader.addEventListener(ev, (e) => {
        if (floatingPtr !== e.pointerId)
            return;
        floatingPtr = null;
        previewHeader.releasePointerCapture(e.pointerId);
        saveFloatState();
    }));
    // ── Workspace (zoom/pan) controls ─────────────────────────────────────────
    // Each canvas keeps its own zoom/pan state and is controlled independently.
    workspaceRefresh = initWorkspaceControls({
        workspace: document.getElementById("canvasWorkspace"),
        viewports: [
            { element: mainViewport, isActive: () => !isScrapActive },
            { element: scrapViewport, isActive: () => isScrapActive },
        ],
        zoomInButton: zoomInBtn,
        zoomOutButton: zoomOutBtn,
        resetButton: resetViewBtn,
        zoomValue: zoomValueEl,
    }).refresh;
    // ── Info Modal ────────────────────────────────────────────────────────────
    initInfoModal();
    // ── Pane resize ────────────────────────────────────────────────────────────
    initPaneResizeControls({
        workspaceSplit: document.querySelector(".workspace-split"),
        previewHandle: document.getElementById("previewResizeHandle"),
    });
    // ── Map simulation ─────────────────────────────────────────────────────────
    initMapSimulation({
        button: mapSimBtn,
        popover: mapPopover,
        toggle: mapSimToggle,
        list: mapList,
        note: mapPopoverNote,
        teamToggle: mapTeamToggle,
        onChange: (sim) => {
            simMapRef = sim.enabled && sim.meta
                ? { image: sim.image, mask: sim.mask, width: sim.meta.width, height: sim.meta.height }
                : null;
            teamColorsRef = sim.teamColors ? TEAM_COLOR_HEXES : null;
            renderPreviewOnly();
        },
    });
    // ── Image import overlay ──────────────────────────────────────────────────
    initImageImportOverlay({
        onApply: (pattern, size) => {
            tileWidthInput.value = size.width.toString();
            tileHeightInput.value = size.height.toString();
            tileWidthValue.value = tileWidthInput.value;
            tileHeightValue.value = tileHeightInput.value;
            mainGrid.generateGrid(pattern);
        },
    });
    // ── Keyboard shortcuts ─────────────────────────────────────────────────────
    setupHistoryShortcuts({
        onUndo: handleUndo,
        onRedo: handleRedo,
        onDeselect: () => {
            activeGrid().clearSelection();
            toolState.restoreTool();
        },
        onClearSelection: () => {
            if (activeGrid().hasSelection()) {
                activeGrid().clearGrid();
            }
        },
        onInvert: () => activeGrid().invertGrid(),
        onInvertSelection: () => activeGrid().invertSelection(),
        onCopy: () => activeGrid().copySelection(clipboard),
        onCut: () => activeGrid().cutSelection(clipboard),
        onPaste: () => {
            if (clipboard.hasContent()) {
                prePasteTool = toolState.getCurrentTool();
                toolState.selectTool("paste");
            }
        },
    });
    // ── Submission ────────────────────────────────────────────────────────────
    submitPatternBtn.addEventListener("click", () => {
        const b64 = getOutputBase64();
        const submitUrl = new URL("https://dashboard.openfront.io/submit");
        submitUrl.searchParams.set("pattern", b64);
        window.open(submitUrl.toString(), "_blank");
    });
    // ── URL hash load + initial state ─────────────────────────────────────────
    const normalizeHex = (v) => {
        if (!v)
            return null;
        const c = v.trim().replace(/^#/, "");
        if (!/^[0-9a-fA-F]{6}$/.test(c))
            return null;
        return `#${c.toLowerCase()}`;
    };
    const hashValue = window.location.hash.startsWith("#")
        ? window.location.hash.slice(1)
        : "";
    let initialColors = null;
    if (hashValue) {
        const [patternPart, queryPart] = hashValue.split("?");
        if (patternPart) {
            base64Input.value = patternPart;
            setTimeout(loadFromBase64, 0);
        }
        if (queryPart) {
            const params = new URLSearchParams(queryPart);
            const primary = (_a = normalizeHex(params.get("primary"))) !== null && _a !== void 0 ? _a : normalizeHex(params.get("p"));
            const secondary = (_b = normalizeHex(params.get("secondary"))) !== null && _b !== void 0 ? _b : normalizeHex(params.get("s"));
            if (primary || secondary) {
                initialColors = {
                    primary: primary !== null && primary !== void 0 ? primary : previewPrimaryColor.value,
                    secondary: secondary !== null && secondary !== void 0 ? secondary : previewSecondaryColor.value,
                };
            }
        }
    }
    // Re-init color presets with initialColors
    const colorPresetControls = initColorPresetControls({
        container: colorPresetContainer,
        primaryColorInput: previewPrimaryColor,
        secondaryColorInput: previewSecondaryColor,
        selectedLabel: selectedPresetLabel,
        favoriteButton: favoriteColorsBtn,
        favoritesContainer,
        initialColors,
        onChange: () => updateOutput(),
    });
    swapColorsBtn.addEventListener("click", () => {
        const p = previewPrimaryColor.value;
        previewPrimaryColor.value = previewSecondaryColor.value;
        previewSecondaryColor.value = p;
        colorPresetControls.setCustomSelection();
        updateOutput();
    });
    copyColorsBtn.addEventListener("click", () => {
        const primary = previewPrimaryColor.value.replace("#", "");
        const secondary = previewSecondaryColor.value.replace("#", "");
        const presetName = colorPresetControls.getCurrentPreset();
        let text = `primary=${primary}&secondary=${secondary}`;
        if (presetName) {
            text += ` (${presetName})`;
        }
        copyText(text);
    });
    previewPrimaryColor.addEventListener("input", () => {
        colorPresetControls.setCustomSelection();
        updateOutput();
    });
    previewSecondaryColor.addEventListener("input", () => {
        colorPresetControls.setCustomSelection();
        updateOutput();
    });
    // ── Initial grid + scrap grid ─────────────────────────────────────────────
    mainGrid.generateGrid();
    scrapGrid.generateGrid();
    switchCanvas(false);
    updateTransformButtons();
});
