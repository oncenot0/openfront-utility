import test from "node:test";
import assert from "node:assert/strict";
import { ditherPatternOn, ditherBrushAction, computeGradientPattern, gradientProgress, regionBounds } from "../docs/app/ditherTools.js";

const density = (pct, n = 64) => {
  let on = 0;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (ditherPatternOn(x, y, pct)) on++;
  return on / (n * n);
};

test("dither pattern density matches the requested percentage", () => {
  assert.equal(density(0), 0);
  assert.equal(density(100), 1);
  assert.equal(density(50), 0.5);
  for (const pct of [12, 25, 75, 88]) assert.ok(Math.abs(density(pct) - pct / 100) < 0.02, `${pct}`);
});

test("50% is a perfect checkerboard", () => {
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    assert.equal(ditherPatternOn(x, y, 50), ditherPatternOn(0, 0, 50) === ((x + y) % 2 === 0));
  }
});

test("more density never removes a dot (patterns nest)", () => {
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
    let prev = false;
    for (let pct = 0; pct <= 100; pct += 5) {
      const on = ditherPatternOn(x, y, pct);
      assert.ok(!(prev && !on), `cell ${x},${y} dropped at ${pct}%`);
      prev = on;
    }
  }
});

test("the pattern is anchored to the grid and repeats every 8 cells", () => {
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
    assert.equal(ditherPatternOn(x, y, 37), ditherPatternOn(x + 8, y + 16, 37));
    assert.equal(ditherPatternOn(x, y, 37), ditherPatternOn(x - 8, y, 37));
  }
});

test("ADD mode never removes existing pixels", () => {
  // The question: will the brush disturb pixels that are already there?
  for (const on of [true, false]) assert.notEqual(ditherBrushAction(on, "add"), false);
  assert.equal(ditherBrushAction(true, "add"), true);
  assert.equal(ditherBrushAction(false, "add"), null); // leave the cell alone
});

test("REPLACE overwrites the area with the pattern; ERASE only clears dots", () => {
  assert.equal(ditherBrushAction(true, "replace"), true);
  assert.equal(ditherBrushAction(false, "replace"), false);
  assert.equal(ditherBrushAction(true, "erase"), false);
  assert.equal(ditherBrushAction(false, "erase"), null);
});

const region = (x0, y0, w, h) => {
  const s = new Set();
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) s.add(`${x},${y}`);
  return s;
};
const base = { width: 32, height: 32, from: { x: 0, y: 0 }, to: { x: 0, y: 31 }, region: null, style: "bayer-8", reverse: false };
const rowDensity = (p, y) => p[y].reduce((a, b) => a + b, 0) / p[y].length;

for (const style of ["bayer-4", "bayer-8", "floyd-steinberg", "atkinson"]) {
  test(`gradient (${style}) fades from dense to empty along the drag`, () => {
    const p = computeGradientPattern({ ...base, style });
    assert.ok(rowDensity(p, 0) > 0.95, `top ${rowDensity(p, 0)}`);
    assert.ok(rowDensity(p, 31) < 0.05, `bottom ${rowDensity(p, 31)}`);
    const bands = [0, 8, 16, 24].map((y0) => { let s = 0; for (let y = y0; y < y0 + 8; y++) s += rowDensity(p, y); return s / 8; });
    assert.ok(bands[0] > bands[1] && bands[1] > bands[2] && bands[2] > bands[3], bands.join(" > "));
  });
}

test("reverse swaps which end is dense", () => {
  const p = computeGradientPattern({ ...base, reverse: true });
  assert.ok(rowDensity(p, 0) < 0.05);
  assert.ok(rowDensity(p, 31) > 0.95);
});

test("a gradient only touches the selected region", () => {
  const sel = region(8, 8, 16, 16);
  const p = computeGradientPattern({ ...base, region: sel, to: { x: 0, y: 24 }, from: { x: 0, y: 8 } });
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    if (!sel.has(`${x},${y}`)) assert.equal(p[y][x], 0);
  }
  assert.ok(p[8].slice(8, 24).some((v) => v === 1));
});

test("gradient direction follows the drag (left to right)", () => {
  const p = computeGradientPattern({ ...base, from: { x: 0, y: 0 }, to: { x: 31, y: 0 } });
  const col = (x) => p.reduce((a, row) => a + row[x], 0) / 32;
  assert.ok(col(0) > 0.95 && col(31) < 0.05 && col(8) > col(24));
});

test("gradient is deterministic", () => {
  assert.deepEqual(computeGradientPattern(base), computeGradientPattern(base));
});

test("gradientProgress clamps beyond the ends and handles a zero-length drag", () => {
  const a = { x: 0, y: 0 }, b = { x: 10, y: 0 };
  assert.equal(gradientProgress(-5, 0, a, b), 0);
  assert.equal(gradientProgress(50, 0, a, b), 1);
  assert.equal(gradientProgress(5, 3, a, b), 0.5);
  assert.equal(gradientProgress(4, 4, a, a), 0);
});

test("regionBounds", () => {
  assert.deepEqual(regionBounds(null, 10, 6), { minX: 0, minY: 0, maxX: 9, maxY: 5 });
  assert.deepEqual(regionBounds(region(2, 3, 4, 2), 10, 10), { minX: 2, minY: 3, maxX: 5, maxY: 4 });
});
