import test from "node:test";
import assert from "node:assert/strict";
import { createMirrorState, mirroredPoints, centerAxis2, clampAxis2, axis2FromPosition, axisToPosition, resolveAxis2 } from "../docs/app/mirror.js";

const sorted = (pts) => pts.map((p) => p.join(",")).sort();

test("mirror off: only the cell itself", () => {
  assert.deepEqual(mirroredPoints(3, 4, createMirrorState(), 16, 16), [[3, 4]]);
});

test("left/right mirror on an even-width grid reflects across the middle", () => {
  const s = { ...createMirrorState(), x: true };
  assert.deepEqual(sorted(mirroredPoints(2, 5, s, 16, 16)), ["13,5", "2,5"]);
  assert.deepEqual(sorted(mirroredPoints(7, 5, s, 16, 16)), ["7,5", "8,5"]);
});

test("odd-width grid: the middle column maps onto itself and appears once", () => {
  const s = { ...createMirrorState(), x: true };
  assert.deepEqual(mirroredPoints(8, 3, s, 17, 17), [[8, 3]]);
  assert.deepEqual(sorted(mirroredPoints(2, 3, s, 17, 17)), ["14,3", "2,3"]);
});

test("both mirrors give four symmetric points", () => {
  const s = { ...createMirrorState(), x: true, y: true };
  assert.deepEqual(sorted(mirroredPoints(1, 2, s, 16, 16)), ["1,13", "1,2", "14,13", "14,2"]);
});

test("a moved axis changes where the reflection lands", () => {
  const s = { ...createMirrorState(), x: true, axisX2: 10 }; // axis through column 5
  assert.deepEqual(sorted(mirroredPoints(3, 0, s, 16, 16)), ["3,0", "7,0"]);
  assert.deepEqual(mirroredPoints(5, 0, s, 16, 16), [[5, 0]]); // on the axis
});

test("an axis between two cells (odd axis2) reflects neighbours onto each other", () => {
  const s = { ...createMirrorState(), x: true, axisX2: 5 }; // between columns 2 and 3
  assert.deepEqual(sorted(mirroredPoints(2, 0, s, 16, 16)), ["2,0", "3,0"]);
});

test("reflections that fall off the grid are dropped, not wrapped", () => {
  const s = { ...createMirrorState(), x: true, axisX2: 2 }; // axis through column 1
  assert.deepEqual(mirroredPoints(5, 0, s, 16, 16), [[5, 0]]); // mirror would be x=-3
});

test("mirroring twice returns to the original cell", () => {
  for (const a2 of [0, 3, 7, 15, 30]) {
    const s = { ...createMirrorState(), x: true, axisX2: a2 };
    for (let x = 0; x < 16; x++) {
      for (const [mx] of mirroredPoints(x, 0, s, 16, 16)) {
        assert.ok(mirroredPoints(mx, 0, s, 16, 16).some(([bx]) => bx === x));
      }
    }
  }
});

test("axis helpers: centre, clamping and pixel conversion", () => {
  assert.equal(centerAxis2(16), 15);
  assert.equal(centerAxis2(17), 16);
  assert.equal(clampAxis2(-5, 16), 0);
  assert.equal(clampAxis2(999, 16), 30);
  assert.equal(resolveAxis2(null, 16), 15);
  assert.equal(resolveAxis2(99, 16), 30);
  // 20px cells: the line between columns 7 and 8 is at 8 * 20 = 160px
  assert.equal(axisToPosition(15, 20), 160);
  assert.equal(axis2FromPosition(160, 20, 16), 15);
  assert.equal(axis2FromPosition(170, 20, 16), 16); // snaps to half-cells
  assert.equal(axis2FromPosition(-50, 20, 16), 0);
});
