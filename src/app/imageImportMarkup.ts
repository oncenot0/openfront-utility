export type ImageImportElements = {
  openButton: HTMLButtonElement;
  overlay: HTMLDivElement;
  closeButton: HTMLButtonElement;
  cancelButton: HTMLButtonElement;
  applyButton: HTMLButtonElement;
  useGridButton: HTMLButtonElement;
  useImageButton: HTMLButtonElement;
  fileInput: HTMLInputElement;
  metaText: HTMLParagraphElement;
  coverageText: HTMLParagraphElement;
  modeSelect: HTMLSelectElement;
  brightnessPanel: HTMLDivElement;
  targetPanel: HTMLDivElement;
  rgbPanel: HTMLDivElement;
  ditherPanel: HTMLDivElement;
  ditherAlgorithm: HTMLSelectElement;
  ditherPolarity: HTMLSelectElement;
  ditherDensity: HTMLInputElement;
  ditherValue: HTMLSpanElement;
  widthInput: HTMLInputElement;
  heightInput: HTMLInputElement;
  sourceCanvas: HTMLCanvasElement;
  patternCanvas: HTMLCanvasElement;
  brightnessComparator: HTMLSelectElement;
  brightnessThreshold: HTMLInputElement;
  brightnessValue: HTMLSpanElement;
  targetColorInput: HTMLInputElement;
  targetTolerance: HTMLInputElement;
  targetToleranceValue: HTMLSpanElement;
  targetMatch: HTMLSelectElement;
  alphaThreshold: HTMLInputElement;
  alphaValue: HTMLSpanElement;
  rgbCombine: HTMLSelectElement;
  redComparator: HTMLSelectElement;
  redThreshold: HTMLInputElement;
  redValue: HTMLSpanElement;
  greenComparator: HTMLSelectElement;
  greenThreshold: HTMLInputElement;
  greenValue: HTMLSpanElement;
  blueComparator: HTMLSelectElement;
  blueThreshold: HTMLInputElement;
  blueValue: HTMLSpanElement;
};

function mustElement<T extends HTMLElement>(id: string) {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Missing required element: ${id}`);
  }
  return element as T;
}

const triggerMarkup = `
  <div class="layout-group layout-group-end">
    <button id="openImageImportBtn" class="btn-primary">Image Convert</button>
  </div>
`;

const overlayMarkup = `
  <div id="imageImportOverlay" class="image-import-overlay" hidden>
    <section
      class="image-import-panel"
      role="dialog"
      aria-modal="true"
      aria-labelledby="imageImportTitle"
    >
      <div class="image-import-header">
        <div>
          <p class="eyebrow image-import-eyebrow">Image Convert</p>
          <h2 id="imageImportTitle" class="image-import-title">
            Image to Pattern
          </h2>
          <p class="image-import-copy">
            Choose what counts as 1, then apply it to the grid.
          </p>
        </div>
        <button id="closeImageImportBtn">Close</button>
      </div>

      <div class="image-import-body">
        <div class="image-import-column">
          <div class="image-import-card">
            <label class="panel-title" for="imageImportFile">Image</label>
            <input type="file" id="imageImportFile" accept="image/*" />
            <p id="imageImportMeta" class="image-import-meta">
              No image loaded yet.
            </p>
          </div>

          <div class="image-preview-grid">
            <div class="image-import-card">
              <div class="panel-title">Source</div>
              <canvas id="imageImportSourcePreview" width="320" height="220"></canvas>
            </div>
            <div class="image-import-card">
              <div class="panel-title">1 / 0 Preview</div>
              <canvas id="imageImportPatternPreview" width="320" height="220"></canvas>
              <p id="imageImportCoverage" class="image-import-meta">
                Converted 1 / 0 pixels will preview here before applying.
              </p>
            </div>
          </div>
        </div>

        <div class="image-import-column">
          <div class="image-import-card">
            <div class="panel-title">Target Grid</div>
            <div class="image-import-size-grid">
              <label for="imageImportWidth">
                Width
                <input type="number" id="imageImportWidth" value="66" />
              </label>
              <label for="imageImportHeight">
                Height
                <input type="number" id="imageImportHeight" value="10" />
              </label>
            </div>
            <div class="row">
              <button id="imageImportUseGridBtn">Use current grid</button>
              <button id="imageImportUseImageBtn">Use image size</button>
            </div>
            <p class="image-import-meta">
              Output size stays within the editor's current grid limits.
            </p>
          </div>

          <div class="image-import-card">
            <label class="panel-title" for="imageImportMode">
              1-pixel rule
            </label>
            <select id="imageImportMode" class="select-input">
              <option value="brightness">Brightness threshold</option>
              <option value="target-color">Target colour family</option>
              <option value="rgb-rules">RGB channel rules</option>
              <option value="dither">Dither (keeps shading)</option>
            </select>

            <div id="imageImportBrightnessPanel" class="image-mode-panel">
              <label class="image-setting-label" for="imageImportBrightnessComparator">
                Comparator
                <select id="imageImportBrightnessComparator">
                  <option value="gte">Luminance &gt;= threshold</option>
                  <option value="lte">Luminance &lt;= threshold</option>
                </select>
              </label>
              <div class="image-channel-row">
                <span class="image-channel-name">Level</span>
                <span class="image-import-meta">Brightness cutoff</span>
                <input
                  type="range"
                  id="imageImportBrightnessThreshold"
                  min="0"
                  max="255"
                  value="128"
                  class="range-input"
                />
                <span id="imageImportBrightnessValue" class="image-threshold-value">128</span>
              </div>
            </div>

            <div id="imageImportTargetPanel" class="image-mode-panel" hidden>
              <div class="row">
                <label for="imageImportTargetColor">Target</label>
                <input type="color" id="imageImportTargetColor" value="#24313a" />
              </div>
              <label class="image-setting-label" for="imageImportTargetMatch">
                Match rule
                <select id="imageImportTargetMatch">
                  <option value="match">Matching colours become 1</option>
                  <option value="exclude">Everything else becomes 1</option>
                </select>
              </label>
              <div class="image-channel-row">
                <span class="image-channel-name">Range</span>
                <span class="image-import-meta">Colour distance</span>
                <input
                  type="range"
                  id="imageImportTargetTolerance"
                  min="0"
                  max="441"
                  value="90"
                  class="range-input"
                />
                <span id="imageImportTargetToleranceValue" class="image-threshold-value">90</span>
              </div>
            </div>

            <div id="imageImportDitherPanel" class="image-mode-panel" hidden>
              <p class="image-import-meta">
                Turns shades into patterns of 1s and 0s, so photos and gradients
                keep their shading instead of becoming solid blobs.
              </p>
              <label class="image-setting-label" for="imageImportDitherAlgorithm">
                Style
                <select id="imageImportDitherAlgorithm">
                  <option value="floyd-steinberg">Floyd-Steinberg (smooth, organic)</option>
                  <option value="atkinson">Atkinson (crisp, higher contrast)</option>
                  <option value="bayer-4">Ordered 4x4 (regular dot grid)</option>
                  <option value="bayer-8">Ordered 8x8 (finer gradients)</option>
                </select>
              </label>
              <label class="image-setting-label" for="imageImportDitherPolarity">
                Which areas become 1
                <select id="imageImportDitherPolarity">
                  <option value="light">Light areas</option>
                  <option value="dark">Dark areas</option>
                </select>
              </label>
              <div class="image-channel-row">
                <span class="image-channel-name">Density</span>
                <span class="image-import-meta">Fewer 1s / more 1s</span>
                <input
                  type="range"
                  id="imageImportDitherDensity"
                  min="0"
                  max="255"
                  value="128"
                  class="range-input"
                />
                <span id="imageImportDitherValue" class="image-threshold-value">128</span>
              </div>
            </div>

            <div id="imageImportRgbPanel" class="image-mode-panel" hidden>
              <label class="image-setting-label" for="imageImportRgbCombine">
                Combine channels
                <select id="imageImportRgbCombine">
                  <option value="all">All enabled channels must match</option>
                  <option value="any">Any enabled channel can match</option>
                </select>
              </label>
              <div class="image-channel-list">
                <div class="image-channel-row">
                  <span class="image-channel-name">Red</span>
                  <select id="imageImportRedComparator">
                    <option value="gte">&gt;= threshold</option>
                    <option value="lte">&lt;= threshold</option>
                    <option value="ignore">Ignore</option>
                  </select>
                  <input
                    type="range"
                    id="imageImportRedThreshold"
                    min="0"
                    max="255"
                    value="160"
                    class="range-input"
                  />
                  <span id="imageImportRedValue" class="image-threshold-value">160</span>
                </div>
                <div class="image-channel-row">
                  <span class="image-channel-name">Green</span>
                  <select id="imageImportGreenComparator">
                    <option value="gte">&gt;= threshold</option>
                    <option value="lte">&lt;= threshold</option>
                    <option value="ignore">Ignore</option>
                  </select>
                  <input
                    type="range"
                    id="imageImportGreenThreshold"
                    min="0"
                    max="255"
                    value="160"
                    class="range-input"
                  />
                  <span id="imageImportGreenValue" class="image-threshold-value">160</span>
                </div>
                <div class="image-channel-row">
                  <span class="image-channel-name">Blue</span>
                  <select id="imageImportBlueComparator">
                    <option value="gte">&gt;= threshold</option>
                    <option value="lte">&lt;= threshold</option>
                    <option value="ignore">Ignore</option>
                  </select>
                  <input
                    type="range"
                    id="imageImportBlueThreshold"
                    min="0"
                    max="255"
                    value="160"
                    class="range-input"
                  />
                  <span id="imageImportBlueValue" class="image-threshold-value">160</span>
                </div>
              </div>
            </div>
          </div>

          <div class="image-import-card">
            <div class="panel-title">Common Filter</div>
            <div class="image-channel-row">
              <span class="image-channel-name">Alpha</span>
              <span class="image-import-meta">Pixels below this alpha stay 0</span>
              <input
                type="range"
                id="imageImportAlphaThreshold"
                min="0"
                max="255"
                value="8"
                class="range-input"
              />
              <span id="imageImportAlphaValue" class="image-threshold-value">8</span>
            </div>
          </div>
        </div>
      </div>

      <div class="image-import-footer">
        <button id="cancelImageImportBtn">Keep Editing</button>
        <button id="applyImageImportBtn" class="btn-primary" disabled>
          Apply to Grid
        </button>
      </div>
    </section>
  </div>
`;

export function ensureImageImportMarkup(): ImageImportElements {
  const layoutToolbar = document.querySelector(".layout-toolbar");
  const layoutShell = document.querySelector(".editor-shell, .layout-shell");
  const imageImportEntry = document.getElementById("imageImportEntry");

  if ((!layoutToolbar && !imageImportEntry) || !layoutShell) {
    throw new Error("Missing layout shell for image import overlay");
  }

  if (!document.getElementById("openImageImportBtn")) {
    (imageImportEntry ?? layoutToolbar)?.insertAdjacentHTML("beforeend", triggerMarkup);
  }

  if (!document.getElementById("imageImportOverlay")) {
    layoutShell.insertAdjacentHTML("beforeend", overlayMarkup);
  }

  return {
    openButton: mustElement<HTMLButtonElement>("openImageImportBtn"),
    overlay: mustElement<HTMLDivElement>("imageImportOverlay"),
    closeButton: mustElement<HTMLButtonElement>("closeImageImportBtn"),
    cancelButton: mustElement<HTMLButtonElement>("cancelImageImportBtn"),
    applyButton: mustElement<HTMLButtonElement>("applyImageImportBtn"),
    useGridButton: mustElement<HTMLButtonElement>("imageImportUseGridBtn"),
    useImageButton: mustElement<HTMLButtonElement>("imageImportUseImageBtn"),
    fileInput: mustElement<HTMLInputElement>("imageImportFile"),
    metaText: mustElement<HTMLParagraphElement>("imageImportMeta"),
    coverageText: mustElement<HTMLParagraphElement>("imageImportCoverage"),
    modeSelect: mustElement<HTMLSelectElement>("imageImportMode"),
    brightnessPanel: mustElement<HTMLDivElement>("imageImportBrightnessPanel"),
    targetPanel: mustElement<HTMLDivElement>("imageImportTargetPanel"),
    rgbPanel: mustElement<HTMLDivElement>("imageImportRgbPanel"),
    ditherPanel: mustElement<HTMLDivElement>("imageImportDitherPanel"),
    ditherAlgorithm: mustElement<HTMLSelectElement>("imageImportDitherAlgorithm"),
    ditherPolarity: mustElement<HTMLSelectElement>("imageImportDitherPolarity"),
    ditherDensity: mustElement<HTMLInputElement>("imageImportDitherDensity"),
    ditherValue: mustElement<HTMLSpanElement>("imageImportDitherValue"),
    widthInput: mustElement<HTMLInputElement>("imageImportWidth"),
    heightInput: mustElement<HTMLInputElement>("imageImportHeight"),
    sourceCanvas: mustElement<HTMLCanvasElement>("imageImportSourcePreview"),
    patternCanvas: mustElement<HTMLCanvasElement>("imageImportPatternPreview"),
    brightnessComparator: mustElement<HTMLSelectElement>(
      "imageImportBrightnessComparator"
    ),
    brightnessThreshold: mustElement<HTMLInputElement>(
      "imageImportBrightnessThreshold"
    ),
    brightnessValue: mustElement<HTMLSpanElement>("imageImportBrightnessValue"),
    targetColorInput: mustElement<HTMLInputElement>("imageImportTargetColor"),
    targetTolerance: mustElement<HTMLInputElement>("imageImportTargetTolerance"),
    targetToleranceValue: mustElement<HTMLSpanElement>(
      "imageImportTargetToleranceValue"
    ),
    targetMatch: mustElement<HTMLSelectElement>("imageImportTargetMatch"),
    alphaThreshold: mustElement<HTMLInputElement>("imageImportAlphaThreshold"),
    alphaValue: mustElement<HTMLSpanElement>("imageImportAlphaValue"),
    rgbCombine: mustElement<HTMLSelectElement>("imageImportRgbCombine"),
    redComparator: mustElement<HTMLSelectElement>("imageImportRedComparator"),
    redThreshold: mustElement<HTMLInputElement>("imageImportRedThreshold"),
    redValue: mustElement<HTMLSpanElement>("imageImportRedValue"),
    greenComparator: mustElement<HTMLSelectElement>("imageImportGreenComparator"),
    greenThreshold: mustElement<HTMLInputElement>("imageImportGreenThreshold"),
    greenValue: mustElement<HTMLSpanElement>("imageImportGreenValue"),
    blueComparator: mustElement<HTMLSelectElement>("imageImportBlueComparator"),
    blueThreshold: mustElement<HTMLInputElement>("imageImportBlueThreshold"),
    blueValue: mustElement<HTMLSpanElement>("imageImportBlueValue"),
  };
}
