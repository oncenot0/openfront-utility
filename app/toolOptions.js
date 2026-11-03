const DITHER_MODE_HINTS = {
    add: "Adds dots only. Pixels you already drew are never removed.",
    replace: "Overwrites the brush area with the dot pattern, so it also clears pixels between the dots.",
    erase: "Removes pixels where the pattern has dots, which fades an area out.",
};
const GRADIENT_MODE_HINTS = {
    replace: "Replaces everything in the area with the gradient.",
    add: "Keeps existing pixels and only adds the gradient's dots.",
};
/** Binds the options panel shown for the Dither Brush and Gradient tools. */
export function createToolOptions(toolState) {
    const panel = document.getElementById("toolOptions");
    const ditherPanel = document.getElementById("ditherOptions");
    const gradientPanel = document.getElementById("gradientOptions");
    const densityInput = document.getElementById("ditherDensity");
    const densityValue = document.getElementById("ditherDensityValue");
    const ditherHint = document.getElementById("ditherModeHint");
    const gradientHint = document.getElementById("gradientModeHint");
    const styleSelect = document.getElementById("gradientStyle");
    const reverseInput = document.getElementById("gradientReverse");
    let ditherMode = "add";
    let gradientMode = "replace";
    const setSegmented = (group, value) => {
        group.querySelectorAll("button[data-value]").forEach((btn) => {
            const on = btn.dataset.value === value;
            btn.classList.toggle("selected", on);
            btn.setAttribute("aria-checked", String(on));
        });
    };
    const ditherModeGroup = document.getElementById("ditherMode");
    const gradientModeGroup = document.getElementById("gradientMode");
    const updateDensity = () => {
        densityValue.textContent = `${densityInput.value}%`;
        document.querySelectorAll("#ditherPresets button").forEach((btn) => {
            btn.classList.toggle("selected", btn.dataset.density === densityInput.value);
        });
    };
    densityInput.addEventListener("input", updateDensity);
    document.querySelectorAll("#ditherPresets button").forEach((btn) => {
        btn.addEventListener("click", () => {
            var _a;
            densityInput.value = (_a = btn.dataset.density) !== null && _a !== void 0 ? _a : "50";
            updateDensity();
        });
    });
    ditherModeGroup.querySelectorAll("button[data-value]").forEach((btn) => {
        btn.addEventListener("click", () => {
            ditherMode = btn.dataset.value;
            setSegmented(ditherModeGroup, ditherMode);
            ditherHint.textContent = DITHER_MODE_HINTS[ditherMode];
        });
    });
    gradientModeGroup.querySelectorAll("button[data-value]").forEach((btn) => {
        btn.addEventListener("click", () => {
            gradientMode = btn.dataset.value;
            setSegmented(gradientModeGroup, gradientMode);
            gradientHint.textContent = GRADIENT_MODE_HINTS[gradientMode];
        });
    });
    setSegmented(ditherModeGroup, ditherMode);
    setSegmented(gradientModeGroup, gradientMode);
    ditherHint.textContent = DITHER_MODE_HINTS[ditherMode];
    gradientHint.textContent = GRADIENT_MODE_HINTS[gradientMode];
    updateDensity();
    const syncVisibility = (tool) => {
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
        getGradientStyle: () => styleSelect.value,
        getGradientReverse: () => reverseInput.checked,
        getGradientMode: () => gradientMode,
    };
}
