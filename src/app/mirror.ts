/**
 * Mirror (symmetry) drawing. An axis is stored in "half-cell" units (axis2):
 * the mirror image of cell x is axis2 - x. An odd axis2 puts the axis between
 * two cells; an even one runs through the middle of a cell.
 */

export type MirrorState = {
  /** Mirror left <-> right (uses a vertical axis line). */
  x: boolean;
  /** Mirror top <-> bottom (uses a horizontal axis line). */
  y: boolean;
  /** null = centred. */
  axisX2: number | null;
  axisY2: number | null;
};

export const createMirrorState = (): MirrorState => ({
  x: false,
  y: false,
  axisX2: null,
  axisY2: null,
});

export const centerAxis2 = (size: number) => size - 1;

export const clampAxis2 = (axis2: number, size: number) =>
  Math.max(0, Math.min(2 * (size - 1), Math.round(axis2)));

export const resolveAxis2 = (axis2: number | null, size: number) =>
  axis2 === null ? centerAxis2(size) : clampAxis2(axis2, size);

/** Axis position for a pointer at `px` pixels from the grid's left/top edge. */
export function axis2FromPosition(px: number, cellSize: number, size: number) {
  return clampAxis2(2 * (px / cellSize - 0.5), size);
}

/** Pixel offset of an axis from the grid's left/top edge. */
export const axisToPosition = (axis2: number, cellSize: number) =>
  (axis2 / 2 + 0.5) * cellSize;

/**
 * The cell itself plus its mirror images, de-duplicated and kept on the grid.
 * Cells that sit exactly on an axis map onto themselves and appear once.
 */
export function mirroredPoints(
  x: number,
  y: number,
  state: MirrorState,
  width: number,
  height: number,
): Array<[number, number]> {
  if (!state.x && !state.y) return [[x, y]];
  const ax = resolveAxis2(state.axisX2, width);
  const ay = resolveAxis2(state.axisY2, height);
  const xs = state.x ? [x, ax - x] : [x];
  const ys = state.y ? [y, ay - y] : [y];
  const seen = new Set<string>();
  const out: Array<[number, number]> = [];
  for (const yy of ys) {
    for (const xx of xs) {
      if (xx < 0 || yy < 0 || xx >= width || yy >= height) continue;
      const k = `${xx},${yy}`;
      if (seen.has(k)) continue;
      seen.add(k);
      out.push([xx, yy]);
    }
  }
  return out;
}
