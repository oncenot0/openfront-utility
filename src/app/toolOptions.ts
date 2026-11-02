import type { ToolState } from "./toolState.js";
import type { DitherBrushMode, GradientStyle } from "./ditherTools.js";

export type GradientMode = "replace" | "add";

export type ToolOptions = {
  getDitherDensity: () => number;
  getDitherMode: () => DitherBrushMode;
  getGradientStyle: () => GradientStyle;
  getGradientReverse: () => boolean;
  getGradientMode: () => GradientMode;
};

const DITHER_MODE_HINTS: Record<DitherBrushMode, string> = {
  add: "Adds dots only. Pixels you already drew are never removed.",
  replace: "Overwrites the brush area with the dot pattern, so it also clears pixels between the dots.",
  erase: "Removes pixels where the pattern has dots, which fades an area out.",
};

const GRADIENT_MODE_HINTS: Record<GradientMode, string> = {
  replace: "Replaces everything in the area with the gradient.",
  add: "Keeps existing pixels and only adds the gradient's dots.",
};

/** Binds the options panel shown for the Dither Brush and Gradient tools. */
export function createToolOptions(toolState: ToolState): ToolOptions {
  const panel = document.getElementById("toolOptions") as HTMLElement;
  const ditherPanel = document.getElementById("ditherOptions") as HTMLElement;
  const gradientPanel = document.getElementById("gradientOptions") as HTMLElement;
  const densityInput = document.getElementById("ditherDensity") as HTMLInputElement;
  const densityValue = document.getElementById("ditherDensityValue") as HTMLElement;
  const ditherHint = document.getElementById("ditherModeHint") as HTMLElement;
  const gradientHint = document.getElementById("gradientModeHint") as HTMLElement;
  const styleSelect = document.getElementById("gradientStyle") as HTMLSelectElement;
  const reverseInput = document.getElementById("gradientReverse") as HTMLInputElement;

  let ditherMode: DitherBrushMode = "add";
  let gradientMode: GradientMode = "replace";

  const setSegmented = (group: HTMLElement, value: string) => {
    group.querySelectorAll<HTMLButtonElement>("button[data-value]").forEach((btn) => {
      const on = btn.dataset.value === value;
      btn.classList.toggle("selected", on);
      btn.setAttribute("aria-checked", String(on));
    });
  };

  const ditherModeGroup = document.getElementById("ditherMode") as HTMLElement;
  const gradientModeGroup = document.getElementById("gradientMode") as HTMLElement;

  const updateDensity = () => {
    densityValue.textContent = `${densityInput.value}%`;
    document.querySelectorAll<HTMLButtonElement>("#ditherPresets button").forEach((btn) => {
      btn.classList.toggle("selected", btn.dataset.density === densityInput.value);
    });
  };
  densityInput.addEventListener("input", updateDensity);
  document.querySelectorAll<HTMLButtonElement>("#ditherPresets button").forEach((btn) => {
    btn.addEventListener("click", () => {
      densityInput.value = btn.dataset.density ?? "50";
      updateDensity();
    });
  });

  ditherModeGroup.querySelectorAll<HTMLButtonElement>("button[data-value]").forEach((btn) => {
    btn.addEventListener("click", () => {
      ditherMode = btn.dataset.value as DitherBrushMode;
      setSegmented(ditherModeGroup, ditherMode);
      ditherHint.textContent = DITHER_MODE_HINTS[ditherMode];
    });
  });
  gradientModeGroup.querySelectorAll<HTMLButtonElement>("button[data-value]").forEach((btn) => {
    btn.addEventListener("click", () => {
      gradientMode = btn.dataset.value as GradientMode;
      setSegmented(gradientModeGroup, gradientMode);
      gradientHint.textContent = GRADIENT_MODE_HINTS[gradientMode];
    });
  });

  setSegmented(ditherModeGroup, ditherMode);
  setSegmented(gradientModeGroup, gradientMode);
  ditherHint.textContent = DITHER_MODE_HINTS[ditherMode];
  gradientHint.textContent = GRADIENT_MODE_HINTS[gradientMode];
  updateDensity();

  const syncVisibility = (tool: string) => {
    const dither = tool === "ditherBrush";
    const gradient = tool === "gradient";
    ditherPanel.hidden = !dither;
    gradientPanel.hidden = !gradient;
    panel.hidden = !(dither || gradient);
  };
  toolState.subscribeToToolChanges(syncVisibility);
  syncVisibility(toolState.getCurrentTool());

  return {
    getDitherDensity: () => Number.parseInt(densityInput.value, 10) || 50,
    getDitherMode: () => ditherMode,
    getGradientStyle: () => styleSelect.value as GradientStyle,
    getGradientReverse: () => reverseInput.checked,
    getGradientMode: () => gradientMode,
  };
}
