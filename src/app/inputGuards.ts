/** True when keystrokes belong to a form control, not to the canvas. */
export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tagName = target.tagName.toLowerCase();
  return (
    target.isContentEditable ||
    tagName === "input" ||
    tagName === "select" ||
    tagName === "textarea"
  );
}

/**
 * While a modal/overlay is open, canvas shortcuts must not act on the pattern
 * hidden behind it (e.g. Backspace clearing the selection, or P switching tool).
 */
export function isOverlayOpen(): boolean {
  return (
    document.body.classList.contains("image-import-open") ||
    document.querySelector("#infoModal:not([hidden]), #shortcutsModal:not([hidden])") !== null
  );
}
