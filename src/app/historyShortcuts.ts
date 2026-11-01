type KeyboardShortcutOptions = {
  onUndo: () => void;
  onRedo: () => void;
  onDeselect: () => void;
  onCopy: () => void;
  onCut: () => void;
  onPaste: () => void;
  onClearSelection: () => void;
  onInvert: () => void;
  onInvertSelection: () => void;
};

const isEditableTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const t = target.tagName.toLowerCase();
  return t === "input" || t === "textarea" || t === "select";
};

// While a modal/overlay is open, canvas shortcuts must not act on the pattern
// hidden behind it (e.g. Backspace clearing the selection).
const isOverlayOpen = () =>
  document.body.classList.contains("image-import-open") ||
  document.querySelector("#infoModal:not([hidden])") !== null;

// Leave the browser's normal copy alone when the user has selected page text.
const hasTextSelection = () => (window.getSelection()?.toString() ?? "") !== "";

export function setupHistoryShortcuts(options: KeyboardShortcutOptions) {
  const { onUndo, onRedo, onDeselect, onCopy, onCut, onPaste, onClearSelection, onInvert, onInvertSelection } = options;

  document.addEventListener("keydown", (event) => {
    if (event.defaultPrevented || isEditableTarget(event.target) || isOverlayOpen()) return;

    const key = event.key.toLowerCase();
    const mod = event.metaKey || event.ctrlKey;

    if (mod && !event.shiftKey && key === "z") { event.preventDefault(); onUndo(); return; }
    if (mod && event.shiftKey && key === "z") { event.preventDefault(); onRedo(); return; }
    if (mod && !event.shiftKey && key === "y") { event.preventDefault(); onRedo(); return; }
    if (mod && !event.shiftKey && key === "d") { event.preventDefault(); onDeselect(); return; }
    if (mod && !event.shiftKey && key === "c") {
      if (hasTextSelection()) return;
      event.preventDefault(); onCopy(); return;
    }
    if (mod && !event.shiftKey && key === "x") { event.preventDefault(); onCut(); return; }
    if (mod && !event.shiftKey && key === "v") { event.preventDefault(); onPaste(); return; }

    // Backspace / Delete — erase cells within selection
    if (!mod && (key === "backspace" || key === "delete")) { event.preventDefault(); onClearSelection(); return; }

    // Ctrl+i — invert bits of selection (or full canvas if no selection)
    if (mod && !event.shiftKey && key === "i") { event.preventDefault(); onInvert(); return; }

    // Shift+i — invert the selection itself
    if (!mod && event.shiftKey && key === "i") { event.preventDefault(); onInvertSelection(); return; }
  });
}
