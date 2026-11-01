import test from "node:test";
import assert from "node:assert/strict";
import { lineCells, brushExtent } from "../docs/app/lineGeometry.js";
import { rotateSelection } from "../docs/app/patternTransforms.js";

const key = (x, y) => `${x},${y}`;
const blank = (w = 20, h = 20) => Array.from({ length: h }, () => Array(w).fill(0));
const rect = (x0, y0, w, h) => {
  const s = new Set();
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) s.add(key(x, y));
  return s;
};

test("lineCells includes both endpoints and has no gaps", () => {
  for (const [x0, y0, x1, y1] of [[0, 0, 10, 0], [0, 0, 0, 7], [3, 3, 12, 9], [12, 9, 3, 3], [5, 5, 5, 5], [0, 10, 10, 0]]) {
    const c = lineCells(x0, y0, x1, y1);
    assert.deepEqual(c[0], [x0, y0]);
    assert.deepEqual(c[c.length - 1], [x1, y1]);
    for (let i = 1; i < c.length; i++) {
      assert.ok(Math.abs(c[i][0] - c[i - 1][0]) <= 1 && Math.abs(c[i][1] - c[i - 1][1]) <= 1, "consecutive cells must touch");
    }
    assert.equal(c.length, Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) + 1);
  }
});

test("a fast horizontal drag fills every cell in between", () => {
  assert.deepEqual(lineCells(50, 20, 60, 20).map((p) => p[0]), [50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60]);
});

test("brushExtent covers exactly size x size cells for every size", () => {
  for (let size = 1; size <= 10; size++) {
    const { before, after } = brushExtent(size);
    assert.equal(before + after + 1, size);
    assert.ok(before >= 0 && after >= before);
  }
  assert.deepEqual(brushExtent(1), { before: 0, after: 0 });
  assert.deepEqual(brushExtent(2), { before: 0, after: 1 });
  assert.deepEqual(brushExtent(3), { before: 1, after: 1 });
});

test("rotating right then left restores the pattern, for many selection sizes", () => {
  for (let w = 1; w <= 9; w++) for (let h = 1; h <= 9; h++) {
    const p = blank();
    const sel = rect(6, 6, w, h);
    for (const k of sel) { const [x, y] = k.split(",").map(Number); p[y][x] = (x * 3 + y * 5) % 2; }
    const r = rotateSelection(p, sel, "right");
    const back = rotateSelection(r.pattern, r.rotatedSelection, "left");
    assert.deepEqual(back.pattern, p, `${w}x${h}`);
    assert.deepEqual([...back.rotatedSelection].sort(), [...sel].sort(), `${w}x${h} selection`);
  }
});

test("four rotations in one direction restore the pattern (no drift)", () => {
  for (const dir of ["right", "left"]) for (let w = 1; w <= 9; w++) for (let h = 1; h <= 9; h++) {
    const p = blank();
    const sel = rect(6, 6, w, h);
    for (const k of sel) { const [x, y] = k.split(",").map(Number); p[y][x] = (x + 2 * y) % 3 === 0 ? 1 : 0; }
    let cur = p, cs = sel;
    for (let i = 0; i < 4; i++) { const r = rotateSelection(cur, cs, dir); cur = r.pattern; cs = r.rotatedSelection; }
    assert.deepEqual(cur, p, `${dir} ${w}x${h}`);
    assert.deepEqual([...cs].sort(), [...sel].sort());
  }
});

test("rotation keeps every set pixel (when it stays on the canvas)", () => {
  const p = blank();
  const sel = rect(5, 5, 5, 3);
  for (const k of sel) { const [x, y] = k.split(",").map(Number); p[y][x] = 1; }
  const count = (m) => m.flat().reduce((a, b) => a + b, 0);
  assert.equal(count(rotateSelection(p, sel, "right").pattern), 15);
  assert.equal(count(rotateSelection(p, sel, "left").pattern), 15);
});

test("rotating right is clockwise", () => {
  // ###      ##
  // #..  ->  .#
  //          .#
  const p = blank();
  [[5, 5], [6, 5], [7, 5], [5, 6]].forEach(([x, y]) => (p[y][x] = 1));
  const r = rotateSelection(p, rect(5, 5, 3, 2), "right");
  const on = [];
  r.pattern.forEach((row, y) => row.forEach((v, x) => v && on.push(key(x, y))));
  assert.deepEqual(on.sort(), [key(5, 5), key(6, 5), key(6, 6), key(6, 7)].sort());
});

test("rotation of an empty selection is a no-op", () => {
  const p = blank();
  assert.equal(rotateSelection(p, new Set(), "right").pattern, p);
});
