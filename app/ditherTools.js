import { bayerMatrix, convertRasterToPattern, DEFAULT_DITHER, } from "./imagePatternConversion.js";
const BAYER_8 = bayerMatrix(8);
/**
 * Whether the dither pattern is "on" at grid cell (x, y). The pattern is
 * anchored to the grid (not to where a stroke began), so overlapping strokes
 * agree with each other and neighbouring strokes of equal density merge
 * seamlessly. 64 density steps (ordered 8x8 Bayer).
 */
export function ditherPatternOn(x, y, densityPercent) {
    const percent = Math.max(0, Math.min(100, densityPercent));
    const onCount = Math.round((percent * 64) / 100);
    const bx = ((x % 8) + 8) % 8;
    const by = ((y % 8) + 8) % 8;
    return BAYER_8[by][bx] < onCount;
}
/**
 * What the brush does to a cell: true = turn on, false = turn off,
 * null = leave the cell exactly as it is.
 */
export function ditherBrushAction(patternOn, mode) {
    switch (mode) {
        case "add":
            return patternOn ? true : null;
        case "replace":
            return patternOn;
        case "erase":
            return patternOn ? false : null;
    }
}
/** 0 at `from` .. 1 at `to`, by projecting the cell onto the from->to line. */
export function gradientProgress(x, y, from, to) {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const len2 = dx * dx + dy * dy;
    if (len2 === 0)
        return 0;
    const t = ((x - from.x) * dx + (y - from.y) * dy) / len2;
    return Math.max(0, Math.min(1, t));
}
/**
 * A dithered gradient over the grid: a 0/1 pattern the size of the grid, where
 * cells outside the region are 0 (and take no part in the dithering).
 */
export function computeGradientPattern(options) {
    const { width, height, from, to, region, style, reverse } = options;
    const data = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const i = (y * width + x) * 4;
            const inside = region === null || region.has(`${x},${y}`);
            const t = gradientProgress(x, y, from, to);
            const value = reverse ? t : 1 - t;
            const gray = Math.round(value * 255);
            data[i] = data[i + 1] = data[i + 2] = gray;
            data[i + 3] = inside ? 255 : 0;
        }
    }
    const settings = {
        alphaThreshold: 8,
        mode: "dither",
        brightness: { comparator: "gte", threshold: 128 },
        targetColor: { hex: "#000000", tolerance: 0, matchMode: "match" },
        rgbRules: {
            combineMode: "all",
            red: { comparator: "ignore", threshold: 0 },
            green: { comparator: "ignore", threshold: 0 },
            blue: { comparator: "ignore", threshold: 0 },
        },
        dither: Object.assign(Object.assign({}, DEFAULT_DITHER), { algorithm: style }),
    };
    return convertRasterToPattern({ width, height, data }, settings);
}
/** Bounding box of a region (or the whole grid) as inclusive cell coordinates. */
export function regionBounds(region, width, height) {
    if (!region || region.size === 0) {
        return { minX: 0, minY: 0, maxX: width - 1, maxY: height - 1 };
    }
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    region.forEach((key) => {
        const [x, y] = key.split(",").map(Number);
        if (x < minX)
            minX = x;
        if (x > maxX)
            maxX = x;
        if (y < minY)
            minY = y;
        if (y > maxY)
            maxY = y;
    });
    return { minX, minY, maxX, maxY };
}
