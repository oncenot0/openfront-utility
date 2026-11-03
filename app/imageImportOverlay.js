var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { MAX_COLOR_DISTANCE, convertRasterToPattern, countActiveCells, } from "./imagePatternConversion.js";
import { drawPatternPreview, drawPlaceholder, drawSourcePreview, loadImage, rasterizeImage, } from "./imageImportCanvas.js";
import { ensureImageImportMarkup } from "./imageImportMarkup.js";
function mustInput(id) {
    const element = document.getElementById(id);
    if (!(element instanceof HTMLInputElement)) {
        throw new Error(`Missing input: ${id}`);
    }
    return element;
}
function clampToInputBounds(input, value) {
    const min = Number.parseInt(input.min || "1", 10);
    const max = Number.parseInt(input.max || `${value}`, 10);
    return Math.max(min, Math.min(max, Math.round(value)));
}
function readClampedNumber(input, fallback, commitValue = false) {
    const safe = clampToInputBounds(input, Number.isFinite(Number.parseInt(input.value, 10))
        ? Number.parseInt(input.value, 10)
        : fallback);
    if (commitValue) {
        input.value = safe.toString();
    }
    return safe;
}
export function initImageImportOverlay(options) {
    const elements = ensureImageImportMarkup();
    const tileWidthInput = mustInput("tileWidth");
    const tileHeightInput = mustInput("tileHeight");
    const sourceContext = elements.sourceCanvas.getContext("2d");
    const patternContext = elements.patternCanvas.getContext("2d");
    if (!sourceContext || !patternContext) {
        throw new Error("2D context not supported");
    }
    let loadedImage = null;
    const setModePanels = (mode) => {
        elements.brightnessPanel.hidden = mode !== "brightness";
        elements.targetPanel.hidden = mode !== "target-color";
        elements.rgbPanel.hidden = mode !== "rgb-rules";
        elements.ditherPanel.hidden = mode !== "dither";
    };
    const updateNumericLabels = () => {
        elements.brightnessValue.textContent = elements.brightnessThreshold.value;
        elements.targetToleranceValue.textContent = elements.targetTolerance.value;
        elements.alphaValue.textContent = elements.alphaThreshold.value;
        elements.ditherValue.textContent = elements.ditherDensity.value;
        elements.redValue.textContent = elements.redThreshold.value;
        elements.greenValue.textContent = elements.greenThreshold.value;
        elements.blueValue.textContent = elements.blueThreshold.value;
    };
    const syncSizeFromGrid = () => {
        elements.widthInput.value = tileWidthInput.value;
        elements.heightInput.value = tileHeightInput.value;
    };
    const syncSizeFromImage = () => {
        if (!loadedImage)
            return;
        elements.widthInput.value = clampToInputBounds(elements.widthInput, loadedImage.element.naturalWidth).toString();
        elements.heightInput.value = clampToInputBounds(elements.heightInput, loadedImage.element.naturalHeight).toString();
    };
    const buildSettings = () => ({
        alphaThreshold: Number.parseInt(elements.alphaThreshold.value, 10),
        mode: elements.modeSelect.value,
        dither: {
            algorithm: elements.ditherAlgorithm.value,
            polarity: elements.ditherPolarity.value,
            density: Number.parseInt(elements.ditherDensity.value, 10),
        },
        brightness: {
            comparator: elements.brightnessComparator.value,
            threshold: Number.parseInt(elements.brightnessThreshold.value, 10),
        },
        targetColor: {
            hex: elements.targetColorInput.value,
            tolerance: Number.parseInt(elements.targetTolerance.value, 10),
            matchMode: elements.targetMatch.value,
        },
        rgbRules: {
            combineMode: elements.rgbCombine.value,
            red: {
                comparator: elements.redComparator.value,
                threshold: Number.parseInt(elements.redThreshold.value, 10),
            },
            green: {
                comparator: elements.greenComparator.value,
                threshold: Number.parseInt(elements.greenThreshold.value, 10),
            },
            blue: {
                comparator: elements.blueComparator.value,
                threshold: Number.parseInt(elements.blueThreshold.value, 10),
            },
        },
    });
    const buildConvertedPattern = (commitDimensions = false) => {
        if (!loadedImage) {
            return null;
        }
        const width = readClampedNumber(elements.widthInput, Number.parseInt(tileWidthInput.value, 10), commitDimensions);
        const height = readClampedNumber(elements.heightInput, Number.parseInt(tileHeightInput.value, 10), commitDimensions);
        const raster = rasterizeImage(loadedImage.element, width, height);
        const pattern = convertRasterToPattern({ width, height, data: raster.data }, buildSettings());
        return { pattern, width, height };
    };
    const refreshPreview = () => {
        setModePanels(elements.modeSelect.value);
        updateNumericLabels();
        elements.useImageButton.disabled = loadedImage === null;
        elements.applyButton.disabled = loadedImage === null;
        if (!loadedImage) {
            drawPlaceholder(sourceContext, "Upload an image");
            drawPlaceholder(patternContext, "Preview waits here");
            elements.metaText.textContent = "No image loaded yet.";
            elements.coverageText.textContent =
                "Converted 1 / 0 pixels will preview here before applying.";
            return;
        }
        drawSourcePreview(sourceContext, loadedImage.element);
        const converted = buildConvertedPattern(false);
        if (!converted) {
            elements.applyButton.disabled = true;
            return;
        }
        drawPatternPreview(patternContext, converted.pattern);
        const activeCells = countActiveCells(converted.pattern);
        const totalCells = converted.width * converted.height;
        const coverage = totalCells === 0 ? 0 : Math.round((activeCells / totalCells) * 100);
        elements.metaText.textContent = `${loadedImage.fileName} · ${loadedImage.element.naturalWidth} x ${loadedImage.element.naturalHeight}px`;
        elements.coverageText.textContent = `${activeCells} / ${totalCells} cells set to 1 (${coverage}%)`;
    };
    const setOverlayOpen = (isOpen) => {
        elements.overlay.hidden = !isOpen;
        document.body.classList.toggle("image-import-open", isOpen);
    };
    elements.openButton.addEventListener("click", () => {
        syncSizeFromGrid();
        setOverlayOpen(true);
        refreshPreview();
    });
    elements.closeButton.addEventListener("click", () => setOverlayOpen(false));
    elements.cancelButton.addEventListener("click", () => setOverlayOpen(false));
    elements.useGridButton.addEventListener("click", () => {
        syncSizeFromGrid();
        refreshPreview();
    });
    elements.useImageButton.addEventListener("click", () => {
        syncSizeFromImage();
        refreshPreview();
    });
    elements.applyButton.addEventListener("click", () => {
        const converted = buildConvertedPattern(true);
        if (!converted)
            return;
        options.onApply(converted.pattern, {
            width: converted.width,
            height: converted.height,
        });
        setOverlayOpen(false);
    });
    elements.overlay.addEventListener("click", (event) => {
        if (event.target === elements.overlay) {
            setOverlayOpen(false);
        }
    });
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && !elements.overlay.hidden) {
            setOverlayOpen(false);
        }
    });
    elements.fileInput.addEventListener("change", () => __awaiter(this, void 0, void 0, function* () {
        var _a;
        const file = (_a = elements.fileInput.files) === null || _a === void 0 ? void 0 : _a[0];
        if (!file)
            return;
        try {
            const nextImage = yield loadImage(file);
            if (loadedImage) {
                URL.revokeObjectURL(loadedImage.objectUrl);
            }
            loadedImage = nextImage;
            elements.fileInput.value = "";
            syncSizeFromImage();
            refreshPreview();
        }
        catch (error) {
            console.warn("Image import failed", error);
            elements.metaText.textContent = "Failed to read that image.";
            elements.applyButton.disabled = true;
        }
    }));
    [
        elements.modeSelect,
        elements.brightnessComparator,
        elements.brightnessThreshold,
        elements.targetColorInput,
        elements.targetTolerance,
        elements.targetMatch,
        elements.alphaThreshold,
        elements.rgbCombine,
        elements.redComparator,
        elements.redThreshold,
        elements.greenComparator,
        elements.greenThreshold,
        elements.blueComparator,
        elements.blueThreshold,
        elements.ditherAlgorithm,
        elements.ditherPolarity,
        elements.ditherDensity,
        elements.widthInput,
        elements.heightInput,
    ].forEach((control) => {
        control.addEventListener("input", refreshPreview);
        control.addEventListener("change", refreshPreview);
    });
    elements.targetTolerance.max = MAX_COLOR_DISTANCE.toString();
    elements.widthInput.min = tileWidthInput.min;
    elements.widthInput.max = tileWidthInput.max;
    elements.heightInput.min = tileHeightInput.min;
    elements.heightInput.max = tileHeightInput.max;
    refreshPreview();
}
