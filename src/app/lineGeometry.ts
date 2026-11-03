/**
 * Integer cells on the straight line from (x0, y0) to (x1, y1), both ends
 * included (Bresenham). The result is the same whichever end you start from
 * for horizontal, vertical and 45° lines, and always connects the two points
 * without gaps. Used to join successive pointer positions while drawing so a
 * fast drag doesn't skip cells.
 */
export function lineCells(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): Array<[number, number]> {
  x0 = Math.round(x0); y0 = Math.round(y0);
  x1 = Math.round(x1); y1 = Math.round(y1);
  const cells: Array<[number, number]> = [];
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  let x = x0;
  let y = y0;
  for (;;) {
    cells.push([x, y]);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; x += sx; }
    if (e2 < dx) { err += dx; y += sy; }
  }
  return cells;
}

/**
 * How far a square brush of `size` cells extends before/after the cell under
 * the cursor, so the footprint is exactly size x size. Even sizes can't be
 * centred on one cell, so they extend one extra cell to the right/bottom.
 */
export function brushExtent(size: number): { before: number; after: number } {
  const n = Math.max(1, Math.floor(size));
  return { before: Math.floor((n - 1) / 2), after: Math.floor(n / 2) };
}

/**
 * Cells covered by a line of the given thickness: the 1-cell Bresenham line
 * with a `thickness` x `thickness` square brush stamped on every cell (the same
 * footprint rule as the pencil, see brushExtent). De-duplicated, in no
 * particular order. Thickness 1 is exactly `lineCells`.
 */
export function thickLineCells(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  thickness: number,
): Array<[number, number]> {
  const base = lineCells(x0, y0, x1, y1);
  const n = Math.max(1, Math.floor(thickness));
  if (n === 1) return base;
  const { before, after } = brushExtent(n);
  const seen = new Set<number>();
  const out: Array<[number, number]> = [];
  // Numeric key (offset keeps negatives unique) is much cheaper than strings
  // for big brushes on long lines.
  const K = 1 << 15;
  for (const [cx, cy] of base) {
    for (let y = cy - before; y <= cy + after; y++) {
      for (let x = cx - before; x <= cx + after; x++) {
        const k = (y + K) * (K * 2) + (x + K);
        if (seen.has(k)) continue;
        seen.add(k);
        out.push([x, y]);
      }
    }
  }
  return out;
}
