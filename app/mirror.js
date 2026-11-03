/**
 * Mirror (symmetry) drawing. An axis is stored in "half-cell" units (axis2):
 * the mirror image of cell x is axis2 - x. An odd axis2 puts the axis between
 * two cells; an even one runs through the middle of a cell.
 */
export const createMirrorState = () => ({
    x: false,
    y: false,
    axisX2: null,
    axisY2: null,
});
export const centerAxis2 = (size) => size - 1;
export const clampAxis2 = (axis2, size) => Math.max(0, Math.min(2 * (size - 1), Math.round(axis2)));
export const resolveAxis2 = (axis2, size) => axis2 === null ? centerAxis2(size) : clampAxis2(axis2, size);
/** Axis position for a pointer at `px` pixels from the grid's left/top edge. */
export function axis2FromPosition(px, cellSize, size) {
    return clampAxis2(2 * (px / cellSize - 0.5), size);
}
/** Pixel offset of an axis from the grid's left/top edge. */
export const axisToPosition = (axis2, cellSize) => (axis2 / 2 + 0.5) * cellSize;
/**
 * The cell itself plus its mirror images, de-duplicated and kept on the grid.
 * Cells that sit exactly on an axis map onto themselves and appear once.
 */
export function mirroredPoints(x, y, state, width, height) {
    if (!state.x && !state.y)
        return [[x, y]];
    const ax = resolveAxis2(state.axisX2, width);
    const ay = resolveAxis2(state.axisY2, height);
    const xs = state.x ? [x, ax - x] : [x];
    const ys = state.y ? [y, ay - y] : [y];
    const seen = new Set();
    const out = [];
    for (const yy of ys) {
        for (const xx of xs) {
            if (xx < 0 || yy < 0 || xx >= width || yy >= height)
                continue;
            const k = `${xx},${yy}`;
            if (seen.has(k))
                continue;
            seen.add(k);
            out.push([xx, yy]);
        }
    }
    return out;
}
