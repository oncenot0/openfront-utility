export function shiftPatternLeft(pattern: number[][]) {
  return pattern.map((row) => row.slice(1).concat(row[0] ?? 0));
}

export function shiftPatternRight(pattern: number[][]) {
  return pattern.map((row) => {
    const last = row[row.length - 1] ?? 0;
    return [last, ...row.slice(0, -1)];
  });
}

export function shiftPatternDown(pattern: number[][]) {
  const height = pattern.length;
  const width = pattern[0]?.length ?? 0;
  const next = Array.from({ length: height }, () => new Array<number>(width).fill(0));
  for (let x = 0; x < width; x++) {
    next[0][x] = pattern[height - 1]?.[x] ?? 0;
    for (let y = 1; y < height; y++) {
      next[y][x] = pattern[y - 1]?.[x] ?? 0;
    }
  }
  return next;
}

export function shiftPatternUp(pattern: number[][]) {
  const height = pattern.length;
  const width = pattern[0]?.length ?? 0;
  const next = Array.from({ length: height }, () => new Array<number>(width).fill(0));
  for (let x = 0; x < width; x++) {
    next[height - 1][x] = pattern[0]?.[x] ?? 0;
    for (let y = 0; y < height - 1; y++) {
      next[y][x] = pattern[y + 1]?.[x] ?? 0;
    }
  }
  return next;
}

export function invertPattern(pattern: number[][]) {
  return pattern.map((row) => row.map((c) => (c === 1 ? 0 : 1)));
}

/** Move selected pixels in direction (dx,dy). Pixels leaving the canvas are lost. */
export function shiftSelection(
  pattern: number[][],
  selection: Set<string>,
  dx: number,
  dy: number
): { pattern: number[][]; movedSelection: Set<string> } {
  const height = pattern.length;
  const width = pattern[0]?.length ?? 0;
  const next = pattern.map((row) => row.slice());
  const newSelection = new Set<string>();

  // Collect moving pixels
  const moving: Array<{ x: number; y: number }> = [];
  selection.forEach((key) => {
    const [x, y] = key.split(",").map(Number);
    if (pattern[y]?.[x] === 1) moving.push({ x, y });
  });

  // Clear source positions that are moving
  for (const { x, y } of moving) {
    next[y][x] = 0;
  }

  // Place at destination
  for (const { x, y } of moving) {
    const nx = x + dx;
    const ny = y + dy;
    if (nx >= 0 && ny >= 0 && nx < width && ny < height) {
      next[ny][nx] = 1;
      newSelection.add(`${nx},${ny}`);
    }
  }

  // Also move the empty selected cells (so selection tracks with the content)
  selection.forEach((key) => {
    const [x, y] = key.split(",").map(Number);
    const nx = x + dx;
    const ny = y + dy;
    if (nx >= 0 && ny >= 0 && nx < width && ny < height) {
      newSelection.add(`${nx},${ny}`);
    }
  });

  return { pattern: next, movedSelection: newSelection };
}

/** Rotate selected pixels around the centroid of the selection.
 *  direction: "left" = 90° CCW, "right" = 90° CW */
export function rotateSelection(
  pattern: number[][],
  selection: Set<string>,
  direction: "left" | "right"
): { pattern: number[][]; rotatedSelection: Set<string> } {
  if (selection.size === 0) return { pattern, rotatedSelection: selection };

  const height = pattern.length;
  const width = pattern[0]?.length ?? 0;

  const cells: Array<{ x: number; y: number }> = [];
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  selection.forEach((key) => {
    const [x, y] = key.split(",").map(Number);
    cells.push({ x, y });
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  });

  // Rotate inside the selection's bounding box using exact integer maths.
  // A w x h box becomes h x w. Its top-left moves by trunc((w-h)/2) so the box
  // stays centred as closely as whole cells allow; the shift for the following
  // rotation is the exact opposite, so rotating right then left (or four times
  // in one direction) always returns to the original, with no drift.
  const w = maxX - minX + 1;
  const h = maxY - minY + 1;
  const shiftX = Math.trunc((w - h) / 2);
  const shiftY = Math.trunc((h - w) / 2);

  const next = pattern.map((row) => row.slice());
  const newSel = new Set<string>();

  // Clear selection area in result
  cells.forEach(({ x, y }) => {
    next[y][x] = 0;
  });

  // Rotate each pixel
  cells.forEach(({ x, y }) => {
    const rx = x - minX;
    const ry = y - minY;
    // right = clockwise: (rx, ry) -> (h-1-ry, rx); left = counter-clockwise: (ry, w-1-rx)
    const nrx = direction === "right" ? h - 1 - ry : ry;
    const nry = direction === "right" ? rx : w - 1 - rx;
    const nx = minX + shiftX + nrx;
    const ny = minY + shiftY + nry;
    if (nx >= 0 && ny >= 0 && nx < width && ny < height) {
      // Only copy active pixels
      if (pattern[y]?.[x] === 1) {
        next[ny][nx] = 1;
      }
      newSel.add(`${nx},${ny}`);
    }
  });

  return { pattern: next, rotatedSelection: newSel };
}

function flipSelectionOnAxis(
  pattern: number[][],
  selection: Set<string>,
  axis: "h" | "v"
): { pattern: number[][]; flippedSelection: Set<string> } {
  if (selection.size === 0) return { pattern, flippedSelection: selection };

  const height = pattern.length;
  const width = pattern[0]?.length ?? 0;

  // Compute bounding box
  let minH = Infinity, maxH = -Infinity;
  let minV = Infinity, maxV = -Infinity;
  const cells: Array<{ x: number; y: number }> = [];
  selection.forEach((key) => {
    const [x, y] = key.split(",").map(Number);
    cells.push({ x, y });
    if (x < minH) minH = x;
    if (x > maxH) maxH = x;
    if (y < minV) minV = y;
    if (y > maxV) maxV = y;
  });

  const next = pattern.map((row) => row.slice());
  const newSel = new Set<string>();

  // Clear source positions
  cells.forEach(({ x, y }) => { next[y][x] = 0; });

  // Place at mirrored positions
  cells.forEach(({ x, y }) => {
    let nx = x, ny = y;
    if (axis === "h") {
      nx = minH + (maxH - x);
    } else {
      ny = minV + (maxV - y);
    }
    if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
      if (pattern[y]?.[x] === 1) next[ny][nx] = 1;
      newSel.add(`${nx},${ny}`);
    }
  });

  return { pattern: next, flippedSelection: newSel };
}

/** Flip selected pixels horizontally (mirror left/right within bounding box). */
export function flipSelectionH(
  pattern: number[][],
  selection: Set<string>
): { pattern: number[][]; flippedSelection: Set<string> } {
  return flipSelectionOnAxis(pattern, selection, "h");
}

/** Flip selected pixels vertically (mirror top/bottom within bounding box). */
export function flipSelectionV(
  pattern: number[][],
  selection: Set<string>
): { pattern: number[][]; flippedSelection: Set<string> } {
  return flipSelectionOnAxis(pattern, selection, "v");
}
