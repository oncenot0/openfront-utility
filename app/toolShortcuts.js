import { isEditableTarget, isOverlayOpen } from "./inputGuards.js";
import { toolForKey } from "./shortcuts.js";
/** Single-key shortcuts: P pencil, F fill, ... X/Y mirror, [ ] brush size, ? help. */
export function setupToolShortcuts(options) {
    const { toolState, mirror, cheatSheet } = options;
    document.addEventListener("keydown", (event) => {
        if (event.defaultPrevented || isEditableTarget(event.target))
            return;
        if (event.ctrlKey || event.metaKey || event.altKey)
            return;
        if (event.key === "?") {
            event.preventDefault();
            cheatSheet.toggle();
            return;
        }
        // Everything below acts on the canvas, so it must not fire behind a modal.
        if (isOverlayOpen() || event.shiftKey)
            return;
        const tool = toolForKey(event.key);
        if (tool) {
            event.preventDefault();
            toolState.selectTool(tool);
            return;
        }
        const key = event.key.toLowerCase();
        if (key === "x" || key === "y") {
            event.preventDefault();
            if (!event.repeat)
                (key === "x" ? mirror.toggleX : mirror.toggleY)();
        }
        else if (event.key === "[") {
            event.preventDefault();
            toolState.adjustSize(-1);
        }
        else if (event.key === "]") {
            event.preventDefault();
            toolState.adjustSize(1);
        }
    });
}
