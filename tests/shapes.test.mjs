import test from "node:test";
import assert from "node:assert/strict";
import { thickLineCells, lineCells } from "../docs/app/lineGeometry.js";
import { getCircleCellsByDiameter } from "../docs/app/circleGeometry.js";
import { sliderPipValues } from "../docs/app/toolState.js";

const keys = (cells) => new Set(cells.map((c) => (Array.isArray(c) ? `${c[0]},${c[1]}` : `${c.x},${c.y}`)));
const bounds = (cells) => {
  const xs = cells.map((c) => c.x), ys = cells.map((c) => c.y);
  return { w: Math.max(...xs) - Math.min(...xs) + 1, h: Math.max(...ys) - Math.min(...ys) + 1 };
};

test("thickLineCells with thickness 1 is the plain line", () => {
  assert.deepEqual(thickLineCells(2, 3, 12, 8, 1), lineCells(2, 3, 12, 8));
});

test("a thick horizontal line is exactly `thickness` cells tall and has no duplicates", () => {
  for (const t of [2, 3, 4, 5, 9]) {
    const cells = thickLineCells(10, 20, 30, 20, t);
    assert.equal(keys(cells).size, cells.length, "no duplicate cells");
    assert.equal(cells.length, (30 - 10 + t) * t, `t=${t}`);
    const ys = cells.map((c) => c[1]);
    assert.equal(Math.max(...ys) - Math.min(...ys) + 1, t);
  }
});

test("a thick line still contains every cell of the thin line", () => {
  const thin = keys(lineCells(1, 1, 15, 9));
  const thick = keys(thickLineCells(1, 1, 15, 9, 4));
  for (const k of thin) assert.ok(thick.has(k));
});

test("circle by diameter spans exactly the diameter, odd and even", () => {
  for (let d = 1; d <= 128; d++) {
    for (const fill of [false, true]) {
      const cells = getCircleCellsByDiameter({ x: 64, y: 64 }, d, fill, 256, 256);
      const b = bounds(cells);
      assert.equal(b.w, d, `width for d=${d} fill=${fill}`);
      assert.equal(b.h, d, `height for d=${d} fill=${fill}`);
    }
  }
});

test("circle outline is symmetric left/right and top/bottom", () => {
  for (const d of [3, 4, 7, 10, 25, 64, 101]) {
    const cells = getCircleCellsByDiameter({ x: 100, y: 100 }, d, false, 300, 300);
    const set = keys(cells);
    const minX = Math.min(...cells.map((c) => c.x)), maxX = Math.max(...cells.map((c) => c.x));
    const minY = Math.min(...cells.map((c) => c.y)), maxY = Math.max(...cells.map((c) => c.y));
    for (const c of cells) {
      assert.ok(set.has(`${minX + maxX - c.x},${c.y}`), `d=${d} mirror x`);
      assert.ok(set.has(`${c.x},${minY + maxY - c.y}`), `d=${d} mirror y`);
    }
  }
});

test("circle sizes that used to collapse together are now different", () => {
  const a = keys(getCircleCellsByDiameter({ x: 20, y: 20 }, 6, false, 64, 64));
  const b = keys(getCircleCellsByDiameter({ x: 20, y: 20 }, 7, false, 64, 64));
  assert.notDeepEqual([...a].sort(), [...b].sort());
});

test("circle outline is hollow and the filled disc is not", () => {
  const ring = getCircleCellsByDiameter({ x: 30, y: 30 }, 20, false, 64, 64);
  const disc = getCircleCellsByDiameter({ x: 30, y: 30 }, 20, true, 64, 64);
  assert.ok(ring.length < disc.length);
  assert.ok(!keys(ring).has("30,30"), "centre of a big ring is empty");
  assert.ok(keys(disc).has("30,30"));
});

test("circle is clipped to the canvas", () => {
  const cells = getCircleCellsByDiameter({ x: 0, y: 0 }, 30, false, 16, 16);
  assert.ok(cells.length > 0);
  assert.ok(cells.every((c) => c.x >= 0 && c.y >= 0 && c.x < 16 && c.y < 16));
});

test("slider labels stay readable on wide ranges", () => {
  assert.deepEqual(sliderPipValues(1, 9, 1), [1, 2, 3, 4, 5, 6, 7, 8, 9]);
  for (const [min, max] of [[1, 32], [1, 64], [1, 128]]) {
    const pips = sliderPipValues(min, max, 1);
    assert.ok(pips.length <= 12, `${max}: ${pips.length} labels`);
    assert.equal(pips[0], min);
    assert.equal(pips[pips.length - 1], max);
  }
});
