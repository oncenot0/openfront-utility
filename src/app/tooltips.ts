import { TOGGLE_SHORTCUTS, TOOL_SHORTCUTS, formatKeys, splitKeys, type ShortcutTool } from "./shortcuts.js";

export type Tip = { label: string; keys: string | null; description: string | null };

/**
 * Turns the existing `title` text into a tooltip:
 *   "Undo (Ctrl+Z)"                          -> label "Undo", keys "Ctrl+Z"
 *   "Fill — flood fill area; with ..."       -> label "Fill", description "flood fill ..."
 *   "Paste clipboard (Ctrl+V) — then click"  -> all three
 */
export function parseTitle(title: string): Tip {
  const trimmed = title.trim();
  const withKeys = /^(.*?)\s*\(([^)]+)\)\s*(?:—\s*(.*))?$/.exec(trimmed);
  if (withKeys) {
    return { label: withKeys[1].trim(), keys: withKeys[2].trim(), description: withKeys[3]?.trim() || null };
  }
  const parts = trimmed.split(/\s+—\s+/);
  return { label: parts[0], keys: null, description: parts.slice(1).join(" — ") || null };
}

const isMac = () => /Mac|iPhone|iPad/i.test(navigator.platform || navigator.userAgent);

function tipFor(el: HTMLElement, title: string): Tip {
  const tip = parseTitle(title);
  const tool = el.dataset.tool as ShortcutTool | undefined;
  if (tool && tool in TOOL_SHORTCUTS) {
    const def = TOOL_SHORTCUTS[tool];
    // Keep any extra hint from the old title (e.g. "Shift" for Select).
    const extra = tip.keys && tip.keys !== def.key ? ` (or hold ${tip.keys})` : "";
    return { label: def.label, keys: def.key, description: tip.description ?? (extra ? `Also: hold ${tip.keys}` : null) };
  }
  if (el.id === "mirrorXBtn") return { label: TOGGLE_SHORTCUTS.mirrorX.label, keys: TOGGLE_SHORTCUTS.mirrorX.key, description: "Draw on both sides of a line. Drag the line's handle to move it." };
  if (el.id === "mirrorYBtn") return { label: TOGGLE_SHORTCUTS.mirrorY.label, keys: TOGGLE_SHORTCUTS.mirrorY.key, description: "Draw above and below a line. Drag the line's handle to move it." };
  return tip;
}

/** Aseprite-style hover bubbles with the shortcut shown as key caps. */
export function setupTooltips() {
  const mac = isMac();
  const tips = new Map<HTMLElement, Tip>();
  const candidates = document.querySelectorAll<HTMLElement>(
    ".tool-strip [title], #infoModalBtn, #shortcutsBtn, .top-bar [title]",
  );
  candidates.forEach((el) => {
    const title = el.getAttribute("title");
    if (!title) return;
    tips.set(el, tipFor(el, title));
    if (!el.getAttribute("aria-label")) el.setAttribute("aria-label", tips.get(el)!.label);
    el.removeAttribute("title"); // the custom bubble replaces the slow native tooltip
    el.dataset.tip = "1";
  });

  const bubble = document.createElement("div");
  bubble.className = "tip-bubble";
  bubble.setAttribute("role", "tooltip");
  document.body.appendChild(bubble);

  let current: HTMLElement | null = null;
  let timer: number | undefined;
  let shownOnce = false;

  const hide = () => {
    window.clearTimeout(timer);
    bubble.classList.remove("visible");
    current = null;
  };

  const show = (el: HTMLElement) => {
    const tip = tips.get(el);
    if (!tip) return;
    bubble.textContent = "";
    const head = document.createElement("div");
    head.className = "tip-head";
    const name = document.createElement("span");
    name.textContent = tip.label;
    head.appendChild(name);
    if (tip.keys) {
      const group = document.createElement("span");
      group.className = "tip-keys";
      for (const k of splitKeys(formatKeys(tip.keys, mac))) {
        const kbd = document.createElement("kbd");
        kbd.textContent = k;
        group.appendChild(kbd);
      }
      head.appendChild(group);
    }
    bubble.appendChild(head);
    if (tip.description) {
      const d = document.createElement("div");
      d.className = "tip-desc";
      d.textContent = tip.description;
      bubble.appendChild(d);
    }
    const r = el.getBoundingClientRect();
    bubble.style.left = "0px";
    bubble.style.top = "0px";
    const bw = bubble.offsetWidth;
    const bh = bubble.offsetHeight;
    let left = r.left + r.width / 2 - bw / 2;
    left = Math.max(8, Math.min(window.innerWidth - bw - 8, left));
    let top = r.bottom + 8;
    if (top + bh > window.innerHeight - 8) top = r.top - bh - 8;
    bubble.style.left = `${left}px`;
    bubble.style.top = `${top}px`;
    bubble.classList.add("visible");
    shownOnce = true;
  };

  const hitTest = (e: MouseEvent): HTMLElement | null => {
    const direct = (e.target as Element | null)?.closest?.<HTMLElement>("[data-tip]");
    if (direct) return direct;
    // Disabled buttons don't receive mouse events, so find them by position.
    for (const el of tips.keys()) {
      if (!(el as HTMLButtonElement).disabled) continue;
      const r = el.getBoundingClientRect();
      if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) return el;
    }
    return null;
  };

  let pending = false;
  document.addEventListener("mousemove", (e) => {
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => {
      pending = false;
      const el = hitTest(e);
      if (el === current) return;
      hide();
      if (!el) return;
      current = el;
      timer = window.setTimeout(() => current && show(current), shownOnce ? 120 : 380);
    });
  });
  document.addEventListener("mousedown", hide, true);
  document.addEventListener("keydown", hide, true);
  document.addEventListener("wheel", hide, { passive: true });
  window.addEventListener("blur", hide);
  document.documentElement.addEventListener("mouseleave", hide);
}
