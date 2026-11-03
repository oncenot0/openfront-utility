export type GridPoint = {
  x: number;
  y: number;
};

function addPoint(
  points: GridPoint[],
  seen: Set<string>,
  width: number,
  height: number,
  x: number,
  y: number
) {
  if (x < 0 || x >= width || y < 0 || y >= height) {
    return;
  }
  const key = `${x},${y}`;
  if (seen.has(key)) {
    return;
  }
  seen.add(key);
  points.push({ x, y });
}

function addOutlinePoints(
  points: GridPoint[],
  seen: Set<string>,
  cx: number,
  cy: number,
  x: number,
  y: number,
  width: number,
  height: number
) {
  addPoint(points, seen, width, height, cx + x, cy + y);
  addPoint(points, seen, width, height, cx + y, cy + x);
  addPoint(points, seen, width, height, cx - y, cy + x);
  addPoint(points, seen, width, height, cx - x, cy + y);
  addPoint(points, seen, width, height, cx - x, cy - y);
  addPoint(points, seen, width, height, cx - y, cy - x);
  addPoint(points, seen, width, height, cx + y, cy - x);
  addPoint(points, seen, width, height, cx + x, cy - y);
}

export function getCircleCells(
  center: GridPoint,
  radius: number,
  fill: boolean,
  width: number,
  height: number
) {
  const points: GridPoint[] = [];
  const seen = new Set<string>();

  if (fill) {
    for (let y = -radius; y <= radius; y++) {
      for (let x = -radius; x <= radius; x++) {
        if (x * x + y * y <= radius * radius) {
          addPoint(points, seen, width, height, center.x + x, center.y + y);
        }
      }
    }
    return points;
  }

  let x = radius;
  let y = 0;
  let p = 1 - radius;

  while (x >= y) {
    addOutlinePoints(points, seen, center.x, center.y, x, y, width, height);
    y++;
    if (p <= 0) {
      p = p + 2 * y + 1;
    } else {
      x--;
      p = p + 2 * y - 2 * x + 1;
    }
  }

  return points;
}

/**
 * A circle that fits exactly in a `diameter` x `diameter` box, for ANY
 * diameter (odd or even). The cell under the cursor sits where the pencil's
 * brush puts it (see brushExtent in lineGeometry), so the preview, the drawn
 * circle and the size number all agree: size N is N cells wide and N tall.
 *
 * A cell is part of the disc when its centre is within diameter/2 of the box
 * centre; the outline is every disc cell with at least one side-neighbour
 * outside the disc, which gives a clean 1-cell ring that is symmetric on both
 * axes. `fill` returns the whole disc instead.
 */
export function getCircleCellsByDiameter(
  center: GridPoint,
  diameter: number,
  fill: boolean,
  width: number,
  height: number
) {
  const n = Math.max(1, Math.floor(diameter));
  const before = Math.floor((n - 1) / 2);
  const ox = center.x - before;
  const oy = center.y - before;
  const mid = (n - 1) / 2;
  const r2 = (n / 2) * (n / 2);
  const inside = (i: number, j: number) =>
    i >= 0 && j >= 0 && i < n && j < n && (i - mid) * (i - mid) + (j - mid) * (j - mid) <= r2;

  const points: GridPoint[] = [];
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      if (!inside(i, j)) continue;
      if (!fill && inside(i - 1, j) && inside(i + 1, j) && inside(i, j - 1) && inside(i, j + 1)) {
        continue;
      }
      const x = ox + i;
      const y = oy + j;
      if (x < 0 || x >= width || y < 0 || y >= height) continue;
      points.push({ x, y });
    }
  }
  return points;
}
