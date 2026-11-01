import test from "node:test";
import assert from "node:assert/strict";
import { lineCells } from "../docs/app/lineGeometry.js";

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
