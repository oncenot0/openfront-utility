import { createClipboardManager } from "./app/clipboard.js";
import { initColorPresetControls } from "./app/colorPresets.js";
import { copyText } from "./app/copyText.js";
import { createDrawingTools } from "./app/drawingTools.js";
import {
  buildDevStorageOutput,
  buildPreviewLink,
} from "./app/exportOutputs.js";
import { setupGridGuides } from "./app/gridGuides.js";
import { createGridManager } from "./app/gridManager.js";
import { setupHistoryShortcuts } from "./app/historyShortcuts.js";
import { initImageImportOverlay } from "./app/imageImportOverlay.js";
import { initInfoModal } from "./app/infoModal.js";
import { initMapSimulation, TEAM_COLOR_HEXES } from "./app/mapSimulation.js";
import {
  decodePatternBase64,
  generatePatternBase64,
} from "./app/patternEncoding.js";
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
  const themeToggleEl = document.getElementById("themeToggle") as HTMLInputElement;
  if (themeToggleEl) initThemeToggle(themeToggleEl);

  // ── Element references ───────────────────────────────────────────────────
  const gridDiv = document.getElementById("grid")!;
  const scrapGridDiv = document.getElementById("scrapGrid")!;

  // Tool strip
  const toolButtons = document.querySelectorAll<HTMLButtonElement>("[data-tool]");
  const sizeSlider = document.getElementById("toolSizeSlider") as HTMLInputElement;
  const sizeOutput = document.getElementById("toolSizeOutput") as HTMLInputElement;
  const sizePopover = document.getElementById("sizePopover") as HTMLDivElement;

  // We use sizePopover as the sizeGroup so toolState automatically hides/shows it
  const sizeGroup = sizePopover;

  // Undo / Redo
  const undoBtn = document.getElementById("undoBtn") as HTMLButtonElement;
  const redoBtn = document.getElementById("redoBtn") as HTMLButtonElement;
  const scrapUndoBtn = document.getElementById("scrapUndoBtn") as HTMLButtonElement;
  const scrapRedoBtn = document.getElementById("scrapRedoBtn") as HTMLButtonElement;

  // Edit actions
  const cutBtn = document.getElementById("cutBtn") as HTMLButtonElement;
  const copyBtn = document.getElementById("copyBtn") as HTMLButtonElement;
  const pasteBtn = document.getElementById("pasteBtn") as HTMLButtonElement;

  // Transformations
  const shiftUpBtn = document.getElementById("shiftUpBtn") as HTMLButtonElement;
  const shiftDownBtn = document.getElementById("shiftDownBtn") as HTMLButtonElement;
  const shiftLeftBtn = document.getElementById("shiftLeftBtn") as HTMLButtonElement;
  const shiftRightBtn = document.getElementById("shiftRightBtn") as HTMLButtonElement;
  const flipHBtn = document.getElementById("flipHBtn") as HTMLButtonElement;
  const flipVBtn = document.getElementById("flipVBtn") as HTMLButtonElement;
  const rotateLeftBtn = document.getElementById("rotateLeftBtn") as HTMLButtonElement;
  const rotateRightBtn = document.getElementById("rotateRightBtn") as HTMLButtonElement;
  const deselectBtn = document.getElementById("deselectBtn") as HTMLButtonElement;

  // Canvas controls
  const tileWidthInput = document.getElementById("tileWidth") as HTMLInputElement;
  const tileWidthValue = document.getElementById("tileWidthValue") as HTMLInputElement;
  const tileWidthUpBtn = document.getElementById("tileWidthUp") as HTMLButtonElement;
  const tileWidthDownBtn = document.getElementById("tileWidthDown") as HTMLButtonElement;
  const tileHeightInput = document.getElementById("tileHeight") as HTMLInputElement;
  const tileHeightValue = document.getElementById("tileHeightValue") as HTMLInputElement;
  const tileHeightUpBtn = document.getElementById("tileHeightUp") as HTMLButtonElement;
  const tileHeightDownBtn = document.getElementById("tileHeightDown") as HTMLButtonElement;
  // Scale tabs (replaces dropdown) — drives the pattern scale (encoded scale exponent 0-7)
  const scaleTabs = document.querySelectorAll<HTMLButtonElement>("#scaleTabs .ctrl-tab");
  const setScale = (value: number) => {
    const clamped = Math.max(0, Math.min(2, value));
    scaleTabs.forEach((tab) => {
      const isSelected = parseInt(tab.dataset.scale ?? "0") === clamped;
      tab.classList.toggle("selected", isSelected);
      tab.setAttribute("aria-selected", isSelected ? "true" : "false");
    });
  };
  const invertBtn = document.getElementById("invertBtn") as HTMLButtonElement;
  const clearBtn = document.getElementById("clearBtn") as HTMLButtonElement;

  // Canvas tab switcher
  const canvasTabMain = document.getElementById("canvasTabMain") as HTMLButtonElement;
  const canvasTabScrap = document.getElementById("canvasTabScrap") as HTMLButtonElement;
  const mainViewport = document.getElementById("gridViewport") as HTMLElement;
  const scrapViewport = document.getElementById("scrapViewport") as HTMLElement;

  // Import
  const base64Input = document.getElementById("base64Input") as HTMLInputElement;
  const loadBtn = document.getElementById("loadBtn") as HTMLButtonElement;

  // Export / Import toggle
  const exportTabBtn = document.getElementById("exportTabBtn") as HTMLButtonElement;
  const importTabBtn = document.getElementById("importTabBtn") as HTMLButtonElement;
  const exportPanel = document.getElementById("exportPanel") as HTMLElement;
  const importPanel = document.getElementById("importPanel") as HTMLElement;

  // Copy buttons
  const copyJsonBtn = document.getElementById("copyJsonBtn") as HTMLButtonElement;
  const copyDevStorageBtn = document.getElementById("copyDevStorageBtn") as HTMLButtonElement;
  const copyPreviewBtn = document.getElementById("copyPreviewBtn") as HTMLButtonElement;

  // Preview panel
  const previewCanvas = document.getElementById("preview") as HTMLCanvasElement;
  const previewPrimaryColor = document.getElementById("previewPrimaryColor") as HTMLInputElement;
  const previewSecondaryColor = document.getElementById("previewSecondaryColor") as HTMLInputElement;
  const swapColorsBtn = document.getElementById("swapColorsBtn") as HTMLButtonElement;
  const colorPresetContainer = document.getElementById("colorPresetContainer") as HTMLDivElement;
  const selectedPresetLabel = document.getElementById("selectedPresetLabel");
  const hidePreviewBtn = document.getElementById("hidePreviewBtn") as HTMLButtonElement;
  const showPreviewBtn = document.getElementById("showPreviewBtn") as HTMLButtonElement;
  const floatPreviewBtn = document.getElementById("floatPreviewBtn") as HTMLButtonElement;
  const dockPreviewBtn = document.getElementById("dockPreviewBtn") as HTMLButtonElement;
  const previewPanel = document.querySelector<HTMLElement>(".preview-panel")!;
  const previewHeader = document.querySelector<HTMLElement>(".preview-header")!;
  const previewZoomInBtn = document.getElementById("previewZoomInBtn") as HTMLButtonElement;
  const previewZoomOutBtn = document.getElementById("previewZoomOutBtn") as HTMLButtonElement;
  const previewZoomValue = document.getElementById("previewZoomValue") as HTMLOutputElement;
  const copyPreviewImageBtn = document.getElementById("copyPreviewImageBtn") as HTMLButtonElement;
  const copyColorsBtn = document.getElementById("copyColorsBtn") as HTMLButtonElement;
  const favoriteColorsBtn = document.getElementById("favoriteColorsBtn") as HTMLButtonElement;
  const favoritesContainer = document.getElementById("favoritesContainer") as HTMLDivElement;
  const previewCanvasWrap = document.getElementById("previewCanvasWrap") as HTMLElement;

  // Map simulation
  const mapSimBtn = document.getElementById("mapSimBtn") as HTMLButtonElement;
  const mapPopover = document.getElementById("mapPopover") as HTMLDivElement;
  const mapSimToggle = document.getElementById("mapSimToggle") as HTMLInputElement;
  const mapList = document.getElementById("mapList") as HTMLDivElement;
  const mapPopoverNote = document.getElementById("mapPopoverNote") as HTMLParagraphElement;
  const mapTeamToggle = document.getElementById("mapShowTeamColors") as HTMLInputElement;
  const mapTeamColorsWrap = document.getElementById("mapTeamColors") as HTMLDivElement;
  const mapTeamColorsCanvas = document.getElementById("mapTeamColorsCanvas") as HTMLCanvasElement;

  // Submission
  const submitPatternBtn = document.getElementById("submitPatternBtn") as HTMLButtonElement;

  // Workspace zoom
  const zoomInBtn = document.getElementById("zoomInBtn") as HTMLButtonElement;
  const zoomOutBtn = document.getElementById("zoomOutBtn") as HTMLButtonElement;
  const resetViewBtn = document.getElementById("resetViewBtn") as HTMLButtonElement;
  const zoomValueEl = document.getElementById("zoomValue") as HTMLOutputElement;

  if (!colorPresetContainer) throw new Error("Missing #colorPresetContainer");
  const previewCtx = previewCanvas.getContext("2d");
  if (!previewCtx) throw new Error("2D context not supported");

  // ── Clipboard ─────────────────────────────────────────────────────────────
  const clipboard = createClipboardManager();

  // ── Canvas switcher state ─────────────────────────────────────────────────
  let isScrapActive = false;
  let workspaceRefresh = () => {};

  const switchCanvas = (scrap: boolean) => {
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
    } else {
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
    if (scrapToastShown) return;
    scrapToastShown = true;
    showToast(
      "<strong>Test Canvas</strong> — a fixed 128×128 scratch pad. " +
        "Anything drawn here is temporary and won't be saved or affect the main canvas.",
      SCRAP_TOAST_DURATION
    );
  };

  const toolState = createToolState({ toolButtons, sizeSlider, sizeOutput, sizeGroup });
  const toolOptions = createToolOptions(toolState);
  // Each canvas keeps its own mirror lines; the Mirror buttons toggle both.
  const mainMirror = createMirrorState();
  const scrapMirror = createMirrorState();
  const shapeTypeSelect = document.getElementById("shapeType") as HTMLSelectElement;
  if (shapeTypeSelect) {
    shapeTypeSelect.addEventListener("change", () => {
      toolState.selectTool("shape");
    });
  }

  // ── Guide state ───────────────────────────────────────────────────────────
  let handleGuideChange = () => {};
  const guideState = setupGridGuides(
    document.getElementById("canvasControlsBar"),
    () => handleGuideChange()
  );

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
    onPatternChange: () => { if (!isScrapActive) updateOutput(); },
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
    onPatternChange: () => { if (isScrapActive) updateOutput(); },
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
    xButton: document.getElementById("mirrorXBtn") as HTMLButtonElement,
    yButton: document.getElementById("mirrorYBtn") as HTMLButtonElement,
    centerButton: document.getElementById("mirrorCenterBtn") as HTMLButtonElement,
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
  const scrapHistory = createHistoryManager<number[][]>(
    200,
    (p) => p.map((row) => row.join("")).join("|")
  );
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
    const selected = document.querySelector<HTMLButtonElement>("#scaleTabs .ctrl-tab.selected");
    return selected ? parseInt(selected.dataset.scale ?? "0") : 0;
  };

  // ── Preview renderer ──────────────────────────────────────────────────────
  let simMapRef: {
    image: HTMLImageElement | null;
    mask: HTMLImageElement | null;
    width: number;
    height: number;
  } | null = null;
  let teamColorsRef: string[] | null = null;

  // Background shown behind the preview canvas. In simulate-map mode the
  // panel is the map's impassable/background colour (#3c3c3c), not the
  // pattern's primary colour, so zooming out never bleeds primary into view.
  const setPreviewWrapBackground = () => {
    if (!previewCanvasWrap) return;
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

  const setPreviewZoom = (index: number) => {
    previewZoomIndex = Math.max(
      0,
      Math.min(PREVIEW_ZOOM_LEVELS.length - 1, index)
    );
    previewZoom = PREVIEW_ZOOM_LEVELS[previewZoomIndex];
    updatePreviewZoomLabel();
    renderPreviewOnly();
  };

  previewZoomInBtn.addEventListener("click", () =>
    setPreviewZoom(previewZoomIndex + 1)
  );
  previewZoomOutBtn.addEventListener("click", () =>
    setPreviewZoom(previewZoomIndex - 1)
  );

  // ── Copy preview image ────────────────────────────────────────────────────
  // Copies the preview canvas exactly as displayed to the clipboard as a PNG.
  copyPreviewImageBtn.addEventListener("click", async () => {
    if (previewCanvas.width === 0 || previewCanvas.height === 0) return;
    try {
      const blob = await new Promise<Blob | null>((resolve) =>
        previewCanvas.toBlob(resolve, "image/png")
      );
      if (!blob) {
        showToast("Could not copy preview image.");
        return;
      }
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);
      showToast("Preview image copied to clipboard.");
    } catch {
      showToast("Could not copy preview image.");
    }
  });

  // ── Output update ─────────────────────────────────────────────────────────
  const clonePattern = (pattern: number[][]) => pattern.map((row) => [...row]);

  // Re-renders the preview bitmap only — no history/URL side effects. Safe to
  // call on panel resizes and zoom changes without polluting undo history.
  const renderPreviewOnly = () => {
    const grid = activeGrid();
    const pattern = grid.getCurrentPattern();

    if (isScrapActive) {
      renderPreview(pattern, true);
    } else {
      const scale = scaleExponent();
      try {
        const base64 = generatePatternBase64(
          pattern,
          grid.getTileWidth(),
          grid.getTileHeight(),
          scale
        );
        renderPreview(base64, false);
      } catch {
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

  let updateOutput = () => {};
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
      if (!isApplyingHistory) scrapHistory.record(clonePattern(pattern));
      updateHistoryButtons();
      return;
    }

    const scale = scaleExponent();
    let base64: string;
    try {
      base64 = generatePatternBase64(pattern, grid.getTileWidth(), grid.getTileHeight(), scale);
    } catch {
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
    if (!isApplyingHistory) mainHistory.record(base64);

    updateHistoryButtons();
  };

  // ── Undo / Redo ───────────────────────────────────────────────────────────
  const applyMainHistoryState = (base64: string) => {
    let decoded;
    try { decoded = decodePatternBase64(base64); } catch { return; }
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

  const applyScrapHistoryState = (pattern: number[][]) => {
    scrapGrid.clearSelection();
    isApplyingHistory = true;
    scrapGrid.generateGrid(pattern);
    isApplyingHistory = false;
  };

  const handleUndo = () => {
    if (isScrapActive) {
      const s = scrapHistory.undo();
      if (s) applyScrapHistoryState(s);
    } else {
      const s = mainHistory.undo();
      if (s) applyMainHistoryState(s);
    }
  };
  const handleRedo = () => {
    if (isScrapActive) {
      const s = scrapHistory.redo();
      if (s) applyScrapHistoryState(s);
    } else {
      const s = mainHistory.redo();
      if (s) applyMainHistoryState(s);
    }
  };

  undoBtn.addEventListener("click", handleUndo);
  redoBtn.addEventListener("click", handleRedo);
  scrapUndoBtn.addEventListener("click", handleUndo);
  scrapRedoBtn.addEventListener("click", handleRedo);

  // ── Canvas size steppers ──────────────────────────────────────────────────
  const clampW = (v: number) => Math.max(2, Math.min(128, v));
  const clampH = (v: number) => Math.max(2, Math.min(64, v));

  const makeStepper = (
    btnUp: HTMLButtonElement,
    btnDown: HTMLButtonElement,
    input: HTMLInputElement,
    valueLabel: HTMLInputElement,
    clamp: (v: number) => number
  ) => {
    const update = (delta: number) => {
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
      setScale(parseInt(tab.dataset.scale ?? "0"));
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

  // On-canvas move / rotate / flip buttons: only shown while something is selected.
  const selectionActions = document.getElementById("selectionActions") as HTMLElement | null;
  const selectionActionHandlers: Record<string, () => void> = {
    "shift-left": () => activeGrid().shiftDir(-1, 0),
    "shift-right": () => activeGrid().shiftDir(1, 0),
    "shift-up": () => activeGrid().shiftDir(0, -1),
    "shift-down": () => activeGrid().shiftDir(0, 1),
    "rotate-left": () => activeGrid().rotateDir("left"),
    "rotate-right": () => activeGrid().rotateDir("right"),
    "flip-h": () => activeGrid().flipDir("h"),
    "flip-v": () => activeGrid().flipDir("v"),
  };
  selectionActions?.addEventListener("click", (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>("button[data-sel]");
    if (btn) selectionActionHandlers[btn.dataset.sel ?? ""]?.();
  });
  // Keep clicks on the bar from starting a stroke / selection on the canvas below.
  selectionActions?.addEventListener("mousedown", (e) => e.stopPropagation());

  // Enable/disable transform buttons based on selection
  const updateTransformButtons = () => {
    const hasSel = activeGrid().hasSelection();
    [shiftUpBtn, shiftDownBtn, shiftLeftBtn, shiftRightBtn, rotateLeftBtn, rotateRightBtn, flipHBtn, flipVBtn, deselectBtn]
      .forEach((btn) => (btn.disabled = !hasSel));
    if (selectionActions) selectionActions.hidden = !hasSel;
  };
  // Poll selection state (simple approach — could be event-driven)
  setInterval(updateTransformButtons, 200);

  // ── Cut / Copy / Paste ─────────────────────────────────────────────────────
  let prePasteTool: import("./app/toolState.js").ToolKind | null = null;
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

      const onGridClick = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        if (!target.classList.contains("cell")) return;
        const x = parseInt(target.dataset.x ?? "0");
        const y = parseInt(target.dataset.y ?? "0");
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
  const switchExportImport = (mode: "export" | "import") => {
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
    previewPanel.classList.add("collapsed");
    document.querySelector(".editor-shell")?.classList.add("preview-collapsed");
    showPreviewBtn.hidden = false;
    document.getElementById("previewResizeHandle")!.hidden = true;
  };

  const expandPreview = () => {
    previewPanel.classList.remove("collapsed");
    document.querySelector(".editor-shell")?.classList.remove("preview-collapsed");
    showPreviewBtn.hidden = true;
    document.getElementById("previewResizeHandle")!.hidden = false;
  };

  hidePreviewBtn.addEventListener("click", collapsePreview);
  showPreviewBtn.addEventListener("click", expandPreview);
  showPreviewBtn.hidden = true;

  // Float / dock preview
  let floatingPtr: number | null = null;
  let fStartX = 0, fStartY = 0, fLeft = 0, fTop = 0;

  const floatingResizeBtn = document.getElementById("floatingResizeBtn") as HTMLButtonElement;

  // Persisted floating preview state
  const FLOAT_STATE_KEY = "floating-preview-state";
  type FloatState = { left: number; top: number; width: number; height: number } | null;
  let savedFloatState: FloatState = null;

  const loadFloatState = (): FloatState => {
    try {
      const raw = localStorage.getItem(FLOAT_STATE_KEY);
      if (raw) return JSON.parse(raw) as FloatState;
    } catch { /* ignore */ }
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

  const applyFloatState = (state: FloatState) => {
    if (!state) return;
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

  const clampPosition = (left: number, top: number, width: number, height: number) => {
    const maxL = window.innerWidth - width - 8;
    const maxT = window.innerHeight - height - 8;
    return {
      left: Math.max(8, Math.min(maxL, left)),
      top: Math.max(8, Math.min(maxT, top)),
    };
  };

  floatPreviewBtn.addEventListener("click", () => {
    collapsePreview();
    previewPanel.classList.add("floating");
    document.querySelector(".editor-shell")?.classList.add("preview-floating");
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
    } else {
      // Default: bottom-right anchored with min width and min height
      previewPanel.style.left = "";
      previewPanel.style.top = "";
      previewPanel.style.width = `${MIN_WIDTH}px`;
      previewPanel.style.height = `${MIN_HEIGHT}px`;
    }
  });
  
  let rPtr: number | null = null;
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
    if (rPtr !== ev.pointerId) return;
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
  
  ["pointerup", "pointercancel"].forEach(evt =>
    floatingResizeBtn.addEventListener(evt, (ev) => {
      if (rPtr !== (ev as PointerEvent).pointerId) return;
      rPtr = null;
      floatingResizeBtn.releasePointerCapture((ev as PointerEvent).pointerId);
      saveFloatState();
    })
  );

  dockPreviewBtn.addEventListener("click", () => {
    expandPreview();
    previewPanel.classList.remove("floating");
    document.querySelector(".editor-shell")?.classList.remove("preview-floating");
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
    if (!previewPanel.classList.contains("floating")) return;
    // Use composedPath to check if the click originated from a button (including shadow DOM)
    const path = e.composedPath();
    if (path.some((el) => el instanceof HTMLButtonElement)) return;
    e.preventDefault();
    floatingPtr = e.pointerId;
    const rect = previewPanel.getBoundingClientRect();
    fStartX = e.clientX; fStartY = e.clientY;
    fLeft = rect.left; fTop = rect.top;
    previewHeader.setPointerCapture(e.pointerId);
  });
  previewHeader.addEventListener("pointermove", (e) => {
    if (floatingPtr !== e.pointerId) return;
    const newLeft = fLeft + e.clientX - fStartX;
    const newTop = fTop + e.clientY - fStartY;
    const clamped = clampPosition(newLeft, newTop, previewPanel.offsetWidth, previewPanel.offsetHeight);
    previewPanel.style.left = `${clamped.left}px`;
    previewPanel.style.top = `${clamped.top}px`;
    // Ensure we're using explicit positioning
    previewPanel.style.bottom = "";
    previewPanel.style.right = "";
  });
  

  ["pointerup", "pointercancel"].forEach(ev =>
    previewHeader.addEventListener(ev, (e) => {
      if (floatingPtr !== (e as PointerEvent).pointerId) return;
      floatingPtr = null;
      previewHeader.releasePointerCapture((e as PointerEvent).pointerId);
      saveFloatState();
    })
  );

  // ── Workspace (zoom/pan) controls ─────────────────────────────────────────
  // Each canvas keeps its own zoom/pan state and is controlled independently.
  workspaceRefresh = initWorkspaceControls({
    workspace: document.getElementById("canvasWorkspace") as HTMLElement,
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
    workspaceSplit: document.querySelector(".workspace-split") as HTMLElement,
    previewHandle: document.getElementById("previewResizeHandle")!,
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
  const normalizeHex = (v: string | null) => {
    if (!v) return null;
    const c = v.trim().replace(/^#/, "");
    if (!/^[0-9a-fA-F]{6}$/.test(c)) return null;
    return `#${c.toLowerCase()}`;
  };

  const hashValue = window.location.hash.startsWith("#")
    ? window.location.hash.slice(1)
    : "";

  let initialColors: { primary: string; secondary: string } | null = null;
  if (hashValue) {
    const [patternPart, queryPart] = hashValue.split("?");
    if (patternPart) {
      base64Input.value = patternPart;
      setTimeout(loadFromBase64, 0);
    }
    if (queryPart) {
      const params = new URLSearchParams(queryPart);
      const primary = normalizeHex(params.get("primary")) ?? normalizeHex(params.get("p"));
      const secondary = normalizeHex(params.get("secondary")) ?? normalizeHex(params.get("s"));
      if (primary || secondary) {
        initialColors = {
          primary: primary ?? previewPrimaryColor.value,
          secondary: secondary ?? previewSecondaryColor.value,
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
