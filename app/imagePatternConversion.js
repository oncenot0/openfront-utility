export const DEFAULT_DITHER = {
    algorithm: "floyd-steinberg",
    polarity: "light",
    density: 128,
};
export const MAX_COLOR_DISTANCE = Math.round(Math.sqrt(255 * 255 * 3));
const clampByte = (value) => Math.max(0, Math.min(255, Math.round(value)));
const isDefined = (value) => value !== null;
function hexToRgb(hex) {
    const cleaned = hex.trim().replace(/^#/, "");
    if (!/^[0-9a-fA-F]{6}$/.test(cleaned)) {
        return { r: 0, g: 0, b: 0 };
    }
    return {
        r: Number.parseInt(cleaned.slice(0, 2), 16),
        g: Number.parseInt(cleaned.slice(2, 4), 16),
        b: Number.parseInt(cleaned.slice(4, 6), 16),
    };
}
function evaluateChannelRule(value, rule) {
    if (rule.comparator === "ignore") {
        return null;
    }
    const threshold = clampByte(rule.threshold);
    return rule.comparator === "gte" ? value >= threshold : value <= threshold;
}
function shouldActivatePixel(r, g, b, a, settings) {
    if (a < clampByte(settings.alphaThreshold)) {
        return false;
    }
    if (settings.mode === "brightness") {
        const luminance = Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b);
        const threshold = clampByte(settings.brightness.threshold);
        return settings.brightness.comparator === "gte"
            ? luminance >= threshold
            : luminance <= threshold;
    }
    if (settings.mode === "target-color") {
        const target = hexToRgb(settings.targetColor.hex);
        const distance = Math.sqrt(Math.pow((r - target.r), 2) + Math.pow((g - target.g), 2) + Math.pow((b - target.b), 2));
        const matches = distance <= Math.max(0, settings.targetColor.tolerance);
        return settings.targetColor.matchMode === "match" ? matches : !matches;
    }
    const results = [
        evaluateChannelRule(r, settings.rgbRules.red),
        evaluateChannelRule(g, settings.rgbRules.green),
        evaluateChannelRule(b, settings.rgbRules.blue),
    ].filter(isDefined);
    if (results.length === 0) {
        return false;
    }
    return settings.rgbRules.combineMode === "all"
        ? results.every(Boolean)
        : results.some(Boolean);
}
/** Bayer threshold matrix of size n x n (n a power of two), values 0..n*n-1. */
export function bayerMatrix(n) {
    if (n <= 1)
        return [[0]];
    const half = n / 2;
    const base = bayerMatrix(half);
    const quadrant = [
        [0, 2],
        [3, 1],
    ];
    const out = Array.from({ length: n }, () => new Array(n).fill(0));
    for (let y = 0; y < n; y++) {
        for (let x = 0; x < n; x++) {
            out[y][x] =
                4 * base[y % half][x % half] +
                    quadrant[Math.floor(y / half)][Math.floor(x / half)];
        }
    }
    return out;
}
const BAYER_4 = bayerMatrix(4);
const BAYER_8 = bayerMatrix(8);
// Error-diffusion kernels: [dx, dy, weight]. Atkinson only passes on 6/8 of the
// error, which gives the crisper, higher-contrast look it is known for.
const FLOYD_STEINBERG = [
    [1, 0, 7 / 16],
    [-1, 1, 3 / 16],
    [0, 1, 5 / 16],
    [1, 1, 1 / 16],
];
const ATKINSON = [
    [1, 0, 1 / 8],
    [2, 0, 1 / 8],
    [-1, 1, 1 / 8],
    [0, 1, 1 / 8],
    [1, 1, 1 / 8],
    [0, 2, 1 / 8],
];
function ditherRasterToPattern(raster, settings) {
    var _a, _b, _c, _d, _e;
    const { width, height, data } = raster;
    const dither = Object.assign(Object.assign({}, DEFAULT_DITHER), ((_a = settings.dither) !== null && _a !== void 0 ? _a : {}));
    const alphaCutoff = clampByte(settings.alphaThreshold);
    const bias = clampByte(dither.density) - 128;
    const pattern = Array.from({ length: height }, () => new Array(width).fill(0));
    const opaque = new Uint8Array(width * height);
    const value = new Float32Array(width * height);
    for (let i = 0; i < width * height; i++) {
        const r = (_b = data[i * 4]) !== null && _b !== void 0 ? _b : 0;
        const g = (_c = data[i * 4 + 1]) !== null && _c !== void 0 ? _c : 0;
        const b = (_d = data[i * 4 + 2]) !== null && _d !== void 0 ? _d : 0;
        const a = (_e = data[i * 4 + 3]) !== null && _e !== void 0 ? _e : 0;
        if (a < alphaCutoff)
            continue; // transparent: stays 0 and takes no error
        opaque[i] = 1;
        const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        const target = dither.polarity === "light" ? luminance : 255 - luminance;
        value[i] = Math.max(0, Math.min(255, target + bias));
    }
    if (dither.algorithm === "bayer-4" || dither.algorithm === "bayer-8") {
        const matrix = dither.algorithm === "bayer-4" ? BAYER_4 : BAYER_8;
        const n = matrix.length;
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const i = y * width + x;
                if (!opaque[i])
                    continue;
                const cutoff = ((matrix[y % n][x % n] + 0.5) / (n * n)) * 255;
                pattern[y][x] = value[i] > cutoff ? 1 : 0;
            }
        }
        return pattern;
    }
    const kernel = dither.algorithm === "atkinson" ? ATKINSON : FLOYD_STEINBERG;
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const i = y * width + x;
            if (!opaque[i])
                continue;
            const old = value[i];
            const on = old >= 128;
            pattern[y][x] = on ? 1 : 0;
            const error = old - (on ? 255 : 0);
            for (const [dx, dy, weight] of kernel) {
                const nx = x + dx;
                const ny = y + dy;
                if (nx < 0 || nx >= width || ny >= height)
                    continue;
                const j = ny * width + nx;
                if (opaque[j])
                    value[j] += error * weight;
            }
        }
    }
    return pattern;
}
export function convertRasterToPattern(raster, settings) {
    var _a, _b, _c, _d;
    if (settings.mode === "dither") {
        return ditherRasterToPattern(raster, settings);
    }
    const pattern = Array.from({ length: raster.height }, () => new Array(raster.width).fill(0));
    for (let y = 0; y < raster.height; y++) {
        for (let x = 0; x < raster.width; x++) {
            const index = (y * raster.width + x) * 4;
            const active = shouldActivatePixel((_a = raster.data[index]) !== null && _a !== void 0 ? _a : 0, (_b = raster.data[index + 1]) !== null && _b !== void 0 ? _b : 0, (_c = raster.data[index + 2]) !== null && _c !== void 0 ? _c : 0, (_d = raster.data[index + 3]) !== null && _d !== void 0 ? _d : 0, settings);
            pattern[y][x] = active ? 1 : 0;
        }
    }
    return pattern;
}
export function countActiveCells(pattern) {
    return pattern.reduce((total, row) => total + row.reduce((sum, cell) => sum + (cell === 1 ? 1 : 0), 0), 0);
}
