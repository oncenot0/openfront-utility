/**
 * Single source of truth for keyboard shortcuts. The tool keys, the hover
 * tooltips and the cheat sheet all read from here, so they can't disagree.
 */

export type ShortcutTool =
  | "pencil"
  | "ditherBrush"
  | "gradient"
  | "line"
  | "circle"
  | "shape"
  | "fill"
  | "shade"
  | "selectArea";

export const TOOL_SHORTCUTS: Record<ShortcutTool, { key: string; label: string }> = {
  pencil: { key: "P", label: "Pencil" },
  ditherBrush: { key: "D", label: "Dither Brush" },
  gradient: { key: "G", label: "Gradient Fill" },
  line: { key: "L", label: "Line" },
  circle: { key: "C", label: "Circle" },
  shape: { key: "S", label: "Shape" },
  fill: { key: "F", label: "Fill" },
  shade: { key: "H", label: "Shade" },
  selectArea: { key: "M", label: "Select" },
};

/** Keys that toggle things rather than pick a tool. */
export const TOGGLE_SHORTCUTS = {
  mirrorX: { key: "X", label: "Mirror left/right" },
  mirrorY: { key: "Y", label: "Mirror top/bottom" },
  smallerBrush: { key: "[", label: "Smaller brush" },
  largerBrush: { key: "]", label: "Larger brush" },
  help: { key: "?", label: "Keyboard shortcuts" },
} as const;

export function toolForKey(key: string): ShortcutTool | null {
  const wanted = key.length === 1 ? key.toUpperCase() : key;
  for (const [tool, def] of Object.entries(TOOL_SHORTCUTS)) {
    if (def.key === wanted) return tool as ShortcutTool;
  }
  return null;
}

export type CheatSheetSection = {
  title: string;
  items: Array<{ keys: string; label: string }>;
};

/** "Ctrl" means Cmd on a Mac; formatKeys() swaps it in for display. */
export const CHEAT_SHEET: CheatSheetSection[] = [
  {
    title: "Tools",
    items: [
      ...(Object.values(TOOL_SHORTCUTS).map((t) => ({ keys: t.key, label: t.label }))),
      { keys: "Hold Shift", label: "Select while held" },
    ],
  },
  {
    title: "Brush & mirror",
    items: [
      { keys: TOGGLE_SHORTCUTS.smallerBrush.key, label: TOGGLE_SHORTCUTS.smallerBrush.label },
      { keys: TOGGLE_SHORTCUTS.largerBrush.key, label: TOGGLE_SHORTCUTS.largerBrush.label },
      { keys: TOGGLE_SHORTCUTS.mirrorX.key, label: TOGGLE_SHORTCUTS.mirrorX.label },
      { keys: TOGGLE_SHORTCUTS.mirrorY.key, label: TOGGLE_SHORTCUTS.mirrorY.label },
    ],
  },
  {
    title: "Edit",
    items: [
      { keys: "Ctrl+Z", label: "Undo" },
      { keys: "Ctrl+Shift+Z", label: "Redo" },
      { keys: "Ctrl+Y", label: "Redo" },
      { keys: "Ctrl+C", label: "Copy selection" },
      { keys: "Ctrl+X", label: "Cut selection" },
      { keys: "Ctrl+V", label: "Paste" },
      { keys: "Ctrl+D", label: "Deselect" },
      { keys: "Delete", label: "Clear selection" },
      { keys: "Ctrl+I", label: "Invert canvas / selection" },
      { keys: "Shift+I", label: "Invert the selection itself" },
    ],
  },
  {
    title: "View",
    items: [
      { keys: "Scroll", label: "Zoom" },
      { keys: "Space + drag", label: "Pan" },
      { keys: "Ctrl + drag", label: "Pan" },
      { keys: "Arrow keys", label: "Pan" },
      { keys: TOGGLE_SHORTCUTS.help.key, label: TOGGLE_SHORTCUTS.help.label },
    ],
  },
];

/** Display form of a key combo; on a Mac "Ctrl" becomes the Command symbol. */
export function formatKeys(keys: string, isMac: boolean): string {
  if (!isMac) return keys;
  return keys
    .replace(/Ctrl\+/g, "⌘")
    .replace(/Shift\+/g, "⇧")
    .replace(/Alt\+/g, "⌥")
    .replace(/Ctrl/g, "⌘");
}

/** Split a combo like "Ctrl+Shift+Z" into chips: ["Ctrl","Shift","Z"]. */
export function splitKeys(keys: string): string[] {
  if (keys.includes(" + ") || keys.includes(" ")) return [keys];
  return keys.split("+").filter(Boolean);
}
