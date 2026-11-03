import { decodePatternBase64, normalizePatternInput } from "./patternEncoding.js";
export function createPatternLoader(options) {
    const { base64Input, tileWidthInput, tileHeightInput, tileWidthValue, tileHeightValue, onPatternLoaded, } = options;
    return function loadFromBase64() {
        const base64 = normalizePatternInput(base64Input.value);
        if (!base64)
            return;
        let decoded;
        try {
            decoded = decodePatternBase64(base64);
        }
        catch (e) {
            alert(e.message);
            return;
        }
        const { pattern, tileWidth, tileHeight, scale } = decoded;
        tileWidthInput.value = tileWidth.toString();
        tileHeightInput.value = tileHeight.toString();
        tileWidthValue.value = tileWidthInput.value;
        tileHeightValue.value = tileHeightInput.value;
        onPatternLoaded(pattern, scale);
    };
}
