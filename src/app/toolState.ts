import { create as createNoUiSlider, PipsMode } from "nouislider";

export type ToolKind =
  | "pencil"
  | "ditherBrush"
  | "gradient"
  | "circle"
  | "shape"
  | "line"
  | "fill"
  | "shade"
  | "selectArea"
  | "paste";

/** Maps each tool to its slider config, or null if the tool has no size slider */
export type ToolSizeConfig = {
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  label: string;
};

const TOOL_SIZE_CONFIGS: Partial<Record<ToolKind, ToolSizeConfig>> = {
  pencil: { min: 1, max: 64, step: 1, defaultValue: 1, label: "Size" },
  ditherBrush: { min: 1, max: 12, step: 1, defaultValue: 4, label: "Size" },
  // Circle size is its diameter in cells; the biggest canvas is 128 wide.
  circle: { min: 1, max: 128, step: 1, defaultValue: 7, label: "Size" },
  shape: { min: 1, max: 30, step: 1, defaultValue: 5, label: "Size" },
  // Line size is its thickness in cells.
  line: { min: 1, max: 32, step: 1, defaultValue: 1, label: "Size" },
};

/**
 * Which values get a numbered tick on the slider. A tick per value is fine up
 * to ~12 values but turns into an unreadable smear on bigger ranges, so wide
 * ranges only label round numbers (plus the ends).
 */
export function sliderPipValues(min: number, max: number, step: number): number[] {
  const count = Math.floor((max - min) / step) + 1;
  const all: number[] = [];
  for (let v = min; v <= max; v += step) all.push(v);
  if (count <= 12) return all;
  const nice = [2, 5, 10, 20, 25, 50];
  const every = nice.find((n) => count / n <= 10) ?? 50;
  const out = new Set<number>([min, max]);
  for (const v of all) if (v % every === 0) out.add(v);
  // Drop a round number that would sit right on top of an end label.
  const gap = every / 2;
  return [...out].filter((v) => v === min || v === max || (v - min >= gap && max - v >= gap)).sort((a, b) => a - b);
}

type ToolStateOptions = {
  toolButtons: NodeListOf<HTMLButtonElement>;
  sizeSlider: HTMLElement; // noUiSlider container div
  sizeOutput: HTMLInputElement;
  sizeGroup: HTMLElement;
};

export type ToolState = {
  getCurrentTool: () => ToolKind;
  selectTool: (tool: ToolKind) => void;
  getPencilSize: () => number;
  getDitherSize: () => number;
  /** Make the current tool's brush bigger/smaller (no-op for tools without a size). */
  adjustSize: (delta: number) => void;
  getShapeRadius: () => number;
  getShapeType: () => string;
  /** Circle diameter in cells (the slider value). */
  getCircleDiameter: () => number;
  /** Line thickness in cells. */
  getLineThickness: () => number;
  subscribeToToolChanges: (listener: (tool: ToolKind) => void) => () => void;
  /** Returns the current slider value for any sized tool */
  getCurrentSize: () => number;
  getPreviousTool: () => ToolKind;
  restoreTool: () => void;
};

export function createToolState(options: ToolStateOptions): ToolState {
  const { toolButtons, sizeSlider, sizeOutput, sizeGroup } = options;
  const shapeTypeSelect = document.getElementById("shapeType") as HTMLSelectElement;

  let currentTool: ToolKind = "pencil";
  let previousTool: ToolKind = "pencil";
  let lastNonSelectTool: ToolKind = "pencil";
  // Per-tool remembered sizes
  const rememberedSizes: Partial<Record<ToolKind, number>> = {};
  const listeners = new Set<(tool: ToolKind) => void>();

  // Initialize noUiSlider
  const slider = createNoUiSlider(sizeSlider, {
    start: [1],
    connect: false, // No colored progress track - just the track and thumb
    direction: "rtl", // Right-to-left so 0% is at top (max value)
    orientation: "vertical",
    range: {
      min: 1,
      max: 10,
    },
    step: 1,
    pips: {
      mode: PipsMode.Values,
      values: [1], // Will be updated per tool
      density: 100,
      format: {
        to: (value: number) => String(value),
        from: (value: string) => Number(value),
      },
    },
    tooltips: false,
  });

  const updateSizeSlider = (tool: ToolKind) => {
    const config = TOOL_SIZE_CONFIGS[tool];
    if (!config) {
      if (sizeGroup) sizeGroup.hidden = true;
      return;
    }
    if (sizeGroup) sizeGroup.hidden = false;
    
    const pipValues = sliderPipValues(config.min, config.max, config.step);
    
    // Update noUiSlider range, step, and pips
    slider.updateOptions({
      range: {
        min: config.min,
        max: config.max,
      },
      step: config.step,
      pips: {
        mode: PipsMode.Values,
        values: pipValues,
        density: 100,
        format: {
          to: (value: number) => String(value),
          from: (value: string) => Number(value),
        },
      },
    }, false);
    
    // Restore remembered size or use default
    const value = rememberedSizes[tool] ?? config.defaultValue;
    slider.set(value);
    
    if (sizeOutput) {
      sizeOutput.min = String(config.min);
      sizeOutput.max = String(config.max);
      sizeOutput.value = String(value);
    }
  };

  function selectTool(tool: ToolKind) {
    // Save current size before switching
    if (TOOL_SIZE_CONFIGS[currentTool]) {
      const currentValue = slider.get();
      rememberedSizes[currentTool] = Array.isArray(currentValue) ? parseInt(currentValue[0] as string) : parseInt(currentValue as string);
    }
    
    previousTool = currentTool;
    currentTool = tool;
    
    if (tool !== "selectArea") {
      lastNonSelectTool = tool;
    }

    toolButtons.forEach((btn) => {
      btn.classList.toggle("selected", btn.dataset.tool === tool);
    });
    updateSizeSlider(tool);
    listeners.forEach((l) => l(tool));
  }

  // Wire up tool buttons
  toolButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const tool = btn.dataset.tool as ToolKind | undefined;
      if (tool) selectTool(tool);
    });
  });

  // Wire up noUiSlider events
  // Only update the numeric input display; do NOT save to rememberedSizes here
  // because that would overwrite during tool switching (updateOptions triggers update events)
  // Saving is handled explicitly in selectTool (before switch) and sizeOutput change handler
  slider.on("update", (values: (string | number)[]) => {
    const value = parseInt(values[0] as string);
    if (sizeOutput) sizeOutput.value = String(value);
  });

  // Wire up size numeric input
  if (sizeOutput) {
    sizeOutput.addEventListener("change", () => {
      let val = parseInt(sizeOutput.value);
      if (isNaN(val)) val = 1;
      const config = TOOL_SIZE_CONFIGS[currentTool];
      if (config) {
        val = Math.max(config.min, Math.min(config.max, val));
        sizeOutput.value = String(val);
        slider.set(val);
        rememberedSizes[currentTool] = val;
      }
    });
  }

  // Initialize
  selectTool("pencil");

  // Helper to get slider value as number
  const getSliderValue = () => {
    const val = slider.get();
    return Array.isArray(val) ? parseInt(val[0] as string) : parseInt(val as string);
  };

  return {
    getCurrentTool: () => currentTool,
    getPreviousTool: () => previousTool,
    selectTool,
    restoreTool: () => selectTool(lastNonSelectTool),
    getPencilSize: () => {
      if (currentTool === "pencil") return getSliderValue();
      return rememberedSizes["pencil"] ?? 1;
    },
    getDitherSize: () => {
      if (currentTool === "ditherBrush") return getSliderValue();
      return rememberedSizes["ditherBrush"] ?? 4;
    },
    adjustSize: (delta: number) => {
      const config = TOOL_SIZE_CONFIGS[currentTool];
      if (!config) return;
      const next = Math.max(config.min, Math.min(config.max, getSliderValue() + delta));
      slider.set(next);
      rememberedSizes[currentTool] = next;
      if (sizeOutput) sizeOutput.value = String(next);
    },
    getShapeRadius: () => {
      const size = currentTool === "shape"
        ? getSliderValue()
        : (rememberedSizes["shape"] ?? 5);
      return size;
    },
    getShapeType: () => shapeTypeSelect ? shapeTypeSelect.value : "star",
    getCircleDiameter: () => {
      const size = currentTool === "circle"
        ? getSliderValue()
        : (rememberedSizes["circle"] ?? 7);
      return Math.max(1, size);
    },
    getLineThickness: () => {
      const size = currentTool === "line"
        ? getSliderValue()
        : (rememberedSizes["line"] ?? 1);
      return Math.max(1, size);
    },
    subscribeToToolChanges: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getCurrentSize: () => getSliderValue(),
  };
}
