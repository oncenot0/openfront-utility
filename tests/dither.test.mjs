import test from "node:test";
import assert from "node:assert/strict";
import {
  convertRasterToPattern,
  bayerMatrix,
  countActiveCells,
  DEFAULT_DITHER,
} from "../docs/app/imagePatternConversion.js";

const ALGORITHMS = ["floyd-steinberg", "atkinson", "bayer-4", "bayer-8"];

const settings = (dither = {}, extra = {}) => ({
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
  dither: { ...DEFAULT_DITHER, ...dither },
  ...extra,
});

const solid = (w, h, gray, alpha = 255) => {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) data.set([gray, gray, gray, alpha], i * 4);
  return { width: w, height: h, data };
};

// Horizontal gradient: black on the left -> white on the right.
const gradient = (w, h) => {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const g = Math.round((x / (w - 1)) * 255);
    data.set([g, g, g, 255], (y * w + x) * 4);
  }
  return { width: w, height: h, data };
};

const density = (pattern) => countActiveCells(pattern) / (pattern.length * pattern[0].length);
const columnDensity = (pattern, x0, x1) => {
  let on = 0, total = 0;
  for (const row of pattern) for (let x = x0; x < x1; x++) { on += row[x]; total++; }
  return on / total;
};

test("bayer matrices contain every threshold 0..n*n-1 exactly once", () => {
  for (const n of [2, 4, 8, 16]) {
    const flat = bayerMatrix(n).flat().sort((a, b) => a - b);
    assert.deepEqual(flat, Array.from({ length: n * n }, (_, i) => i));
  }
  assert.deepEqual(bayerMatrix(2), [[0, 2], [3, 1]]);
});

for (const algorithm of ALGORITHMS) {
  test(`${algorithm}: solid white -> all 1, solid black -> all 0 (light mode)`, () => {
    assert.equal(density(convertRasterToPattern(solid(32, 32, 255), settings({ algorithm }))), 1);
    assert.equal(density(convertRasterToPattern(solid(32, 32, 0), settings({ algorithm }))), 0);
  });

  test(`${algorithm}: dark mode inverts which areas become 1`, () => {
    assert.equal(density(convertRasterToPattern(solid(32, 32, 0), settings({ algorithm, polarity: "dark" }))), 1);
    assert.equal(density(convertRasterToPattern(solid(32, 32, 255), settings({ algorithm, polarity: "dark" }))), 0);
  });

  test(`${algorithm}: output is only 0/1 and has the requested size`, () => {
    const p = convertRasterToPattern(gradient(40, 24), settings({ algorithm }));
    assert.equal(p.length, 24);
    assert.ok(p.every((row) => row.length === 40 && row.every((v) => v === 0 || v === 1)));
  });

  test(`${algorithm}: deterministic`, () => {
    const a = convertRasterToPattern(gradient(40, 24), settings({ algorithm }));
    const b = convertRasterToPattern(gradient(40, 24), settings({ algorithm }));
    assert.deepEqual(a, b);
  });

  test(`${algorithm}: a gradient keeps its shading (darker side has fewer 1s)`, () => {
    const p = convertRasterToPattern(gradient(64, 32), settings({ algorithm }));
    const q1 = columnDensity(p, 0, 16);
    const q2 = columnDensity(p, 16, 32);
    const q3 = columnDensity(p, 32, 48);
    const q4 = columnDensity(p, 48, 64);
    assert.ok(q1 < q2 && q2 < q3 && q3 < q4, `densities ${[q1, q2, q3, q4].map((v) => v.toFixed(2))}`);
    assert.ok(q1 < 0.3 && q4 > 0.7);
    // ...which a plain threshold cannot do: it makes a hard edge, no mixed areas.
  });

  test(`${algorithm}: mid-grey gives roughly half 1s`, () => {
    const d = density(convertRasterToPattern(solid(64, 64, 128), settings({ algorithm })));
    assert.ok(d > 0.4 && d < 0.6, `density ${d}`);
  });

  test(`${algorithm}: density control adds or removes 1s`, () => {
    const mid = solid(64, 64, 128);
    const more = density(convertRasterToPattern(mid, settings({ algorithm, density: 200 })));
    const neutral = density(convertRasterToPattern(mid, settings({ algorithm, density: 128 })));
    const fewer = density(convertRasterToPattern(mid, settings({ algorithm, density: 56 })));
    assert.ok(more > neutral && neutral > fewer, `${fewer} < ${neutral} < ${more}`);
  });

  test(`${algorithm}: transparent pixels stay 0 and don't disturb their neighbours`, () => {
    const w = 32, h = 32;
    const img = solid(w, h, 255);
    for (let y = 0; y < h; y++) for (let x = 0; x < 8; x++) img.data[(y * w + x) * 4 + 3] = 0; // left strip transparent
    const p = convertRasterToPattern(img, settings({ algorithm }));
    for (let y = 0; y < h; y++) for (let x = 0; x < 8; x++) assert.equal(p[y][x], 0);
    for (let y = 0; y < h; y++) for (let x = 8; x < w; x++) assert.equal(p[y][x], 1);
  });
}

test("ordered 4x4 on mid-grey fills exactly half of every 4x4 block", () => {
  const p = convertRasterToPattern(solid(16, 16, 128), settings({ algorithm: "bayer-4" }));
  for (let by = 0; by < 16; by += 4) for (let bx = 0; bx < 16; bx += 4) {
    let on = 0;
    for (let y = by; y < by + 4; y++) for (let x = bx; x < bx + 4; x++) on += p[y][x];
    assert.equal(on, 8);
  }
});

test("existing modes are unchanged by the dither feature", () => {
  const img = gradient(32, 4);
  const p = convertRasterToPattern(img, settings({}, { mode: "brightness" }));
  // Hard edge: every row is 0...0 1...1, with no mixed region.
  for (const row of p) {
    const firstOne = row.indexOf(1);
    assert.ok(firstOne > 0);
    assert.ok(row.slice(0, firstOne).every((v) => v === 0) && row.slice(firstOne).every((v) => v === 1));
  }
});

test("dither falls back to defaults when no dither settings are given", () => {
  const s = settings();
  delete s.dither;
  assert.equal(density(convertRasterToPattern(solid(8, 8, 255), s)), 1);
});
