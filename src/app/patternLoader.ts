import { decodePatternBase64, normalizePatternInput } from "./patternEncoding.js";

type PatternLoaderOptions = {
  base64Input: HTMLInputElement;
  tileWidthInput: HTMLInputElement;
  tileHeightInput: HTMLInputElement;
  tileWidthValue: HTMLInputElement;
  tileHeightValue: HTMLInputElement;
  onPatternLoaded: (pattern: number[][], scale: number) => void;
};

export function createPatternLoader(options: PatternLoaderOptions) {
  const {
    base64Input,
    tileWidthInput,
    tileHeightInput,
    tileWidthValue,
    tileHeightValue,
    onPatternLoaded,
  } = options;

  return function loadFromBase64() {
    const base64 = normalizePatternInput(base64Input.value);
    if (!base64) return;
    let decoded;
    try {
      decoded = decodePatternBase64(base64);
    } catch (e) {
      alert((e as Error).message);
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
