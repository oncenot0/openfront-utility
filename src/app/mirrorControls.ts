import {
  axis2FromPosition,
  axisToPosition,
  clampAxis2,
  resolveAxis2,
  type MirrorState,
} from "./mirror.js";

type MirroredGrid = {
  gridDiv: HTMLElement;
  state: MirrorState;
  getWidth: () => number;
  getHeight: () => number;
};

export type MirrorControls = {
  toggleX: () => void;
  toggleY: () => void;
  /** Snap every mirror line back to the middle of its canvas. */
  center: () => void;
  /** Reposition the lines (call after the grid size or zoom changes). */
  refresh: () => void;
};

/**
 * Mirror X/Y toggle buttons plus a draggable dashed line per axis on each grid.
 * The line snaps to half-cells, so it can run through a cell or between two.
 */
export function createMirrorControls(options: {
  xButton: HTMLButtonElement;
  yButton: HTMLButtonElement;
  /** Optional "Center" button; only shown while a mirror line is on. */
  centerButton?: HTMLButtonElement;
  grids: MirroredGrid[];
}): MirrorControls {
  const { xButton, yButton, centerButton, grids } = options;

  type Axis = { line: HTMLElement; grip: HTMLElement };
  const makeAxis = (kind: "v" | "h", label: string): Axis => {
    const line = document.createElement("div");
    line.className = `mirror-axis mirror-axis-${kind}`;
    const grip = document.createElement("div");
    grip.className = "mirror-grip";
    grip.tabIndex = 0;
    grip.textContent = label;
    grip.title = "Drag to move the mirror line (double-click to centre it)";
    grip.setAttribute("role", "slider");
    grip.setAttribute("aria-label", kind === "v" ? "Left/right mirror line" : "Top/bottom mirror line");
    line.appendChild(grip);
    return { line, grip };
  };

  const parts = grids.map((grid) => {
    const vertical = makeAxis("v", "⇋");
    const horizontal = makeAxis("h", "⇅");
    grid.gridDiv.appendChild(vertical.line);
    grid.gridDiv.appendChild(horizontal.line);
    return { grid, vertical, horizontal };
  });

  const cellSizes = (grid: MirroredGrid) => ({
    w: grid.gridDiv.clientWidth / Math.max(1, grid.getWidth()),
    h: grid.gridDiv.clientHeight / Math.max(1, grid.getHeight()),
  });

  // The canvas is usually bigger than the window and gets panned/zoomed, so
  // the handles can't sit on the grid's edge (it may be off-screen). Put them
  // in the visible part of the canvas, away from the corner panels, and keep
  // them the same on-screen size at any zoom.
  const workspace = document.getElementById("canvasWorkspace");
  const placeGrips = (grid: MirroredGrid, vGrip: HTMLElement, hGrip: HTMLElement) => {
    const gr = grid.gridDiv.getBoundingClientRect();
    if (!workspace || gr.width === 0 || grid.gridDiv.clientWidth === 0) return;
    const wr = workspace.getBoundingClientRect();
    const zoom = gr.width / grid.gridDiv.clientWidth;
    const left = (Math.max(wr.left, gr.left) - gr.left) / zoom;
    const top = (Math.max(wr.top, gr.top) - gr.top) / zoom;
    const right = (Math.min(wr.right, gr.right) - gr.left) / zoom;
    const bottom = (Math.min(wr.bottom, gr.bottom) - gr.top) / zoom;
    const inv = 1 / zoom;
    vGrip.style.transformOrigin = "0 0";
    vGrip.style.transform = `scale(${inv})`;
    vGrip.style.left = `${-8 * inv}px`;
    vGrip.style.top = `${top + (bottom - top) * 0.35}px`;
    hGrip.style.transformOrigin = "0 0";
    hGrip.style.transform = `scale(${inv})`;
    hGrip.style.top = `${-8 * inv}px`;
    hGrip.style.left = `${left + (right - left) * 0.65}px`;
  };

  const render = () => {
    for (const { grid, vertical, horizontal } of parts) {
      const { w, h } = cellSizes(grid);
      const state = grid.state;
      vertical.line.style.display = state.x ? "block" : "none";
      horizontal.line.style.display = state.y ? "block" : "none";
      vertical.line.style.left = `${axisToPosition(resolveAxis2(state.axisX2, grid.getWidth()), w)}px`;
      horizontal.line.style.top = `${axisToPosition(resolveAxis2(state.axisY2, grid.getHeight()), h)}px`;
      placeGrips(grid, vertical.grip, horizontal.grip);
    }
    const anyX = grids.some((g) => g.state.x);
    const anyY = grids.some((g) => g.state.y);
    xButton.classList.toggle("selected", anyX);
    yButton.classList.toggle("selected", anyY);
    xButton.setAttribute("aria-pressed", String(anyX));
    yButton.setAttribute("aria-pressed", String(anyY));
    if (centerButton) {
      centerButton.hidden = !(anyX || anyY);
      // Nothing to do when every line is already in the middle.
      const offCentre = grids.some(
        (g) => (g.state.x && g.state.axisX2 !== null) || (g.state.y && g.state.axisY2 !== null),
      );
      centerButton.disabled = !offCentre;
    }
  };

  const center = () => {
    for (const g of grids) {
      g.state.axisX2 = null;
      g.state.axisY2 = null;
    }
    render();
  };

  const setAxis = (grid: MirroredGrid, axis: "x" | "y", axis2: number) => {
    if (axis === "x") grid.state.axisX2 = clampAxis2(axis2, grid.getWidth());
    else grid.state.axisY2 = clampAxis2(axis2, grid.getHeight());
    render();
  };

  const makeDraggable = (
    grid: MirroredGrid,
    { grip }: Axis,
    axis: "x" | "y",
  ) => {
    const pointerToAxis2 = (clientX: number, clientY: number) => {
      const rect = grid.gridDiv.getBoundingClientRect();
      const { w, h } = cellSizes(grid);
      // getBoundingClientRect is affected by workspace zoom; clientWidth is not.
      const zoom = rect.width / Math.max(1, grid.gridDiv.clientWidth);
      if (axis === "x") return axis2FromPosition((clientX - rect.left) / zoom, w, grid.getWidth());
      return axis2FromPosition((clientY - rect.top) / zoom, h, grid.getHeight());
    };

    grip.addEventListener("mousedown", (e) => {
      // Don't let the grid treat this as the start of a drawing stroke or a pan.
      e.preventDefault();
      e.stopPropagation();
      const move = (ev: MouseEvent) => setAxis(grid, axis, pointerToAxis2(ev.clientX, ev.clientY));
      const up = () => {
        window.removeEventListener("mousemove", move);
        window.removeEventListener("mouseup", up);
      };
      window.addEventListener("mousemove", move);
      window.addEventListener("mouseup", up);
    });
    grip.addEventListener("dblclick", () => {
      if (axis === "x") grid.state.axisX2 = null;
      else grid.state.axisY2 = null;
      render();
    });
    grip.addEventListener("keydown", (e) => {
      const key = e.key;
      const step = e.shiftKey ? 1 : 2; // one cell, or half a cell with Shift
      const current = axis === "x"
        ? resolveAxis2(grid.state.axisX2, grid.getWidth())
        : resolveAxis2(grid.state.axisY2, grid.getHeight());
      const back = axis === "x" ? "ArrowLeft" : "ArrowUp";
      const fwd = axis === "x" ? "ArrowRight" : "ArrowDown";
      if (key !== back && key !== fwd) return;
      e.preventDefault();
      e.stopPropagation();
      setAxis(grid, axis, current + (key === fwd ? step : -step));
    });
  };

  window.addEventListener("resize", render);

  for (const { grid, vertical, horizontal } of parts) {
    makeDraggable(grid, vertical, "x");
    makeDraggable(grid, horizontal, "y");
    if (typeof ResizeObserver !== "undefined") {
      new ResizeObserver(render).observe(grid.gridDiv);
    }
    // Pan and zoom change the viewport's transform, which moves the handles.
    const viewport = grid.gridDiv.closest(".grid-viewport");
    if (viewport) {
      new MutationObserver(render).observe(viewport, { attributes: true, attributeFilter: ["style"] });
    }
  }

  const toggle = (axis: "x" | "y") => {
    const next = !grids.some((g) => g.state[axis]);
    grids.forEach((g) => (g.state[axis] = next));
    render();
  };
  xButton.addEventListener("click", () => toggle("x"));
  yButton.addEventListener("click", () => toggle("y"));
  centerButton?.addEventListener("click", center);
  render();

  return { toggleX: () => toggle("x"), toggleY: () => toggle("y"), center, refresh: render };
}
