import { isEditableTarget, isOverlayOpen } from "./inputGuards.js";
// Leave the browser's normal copy alone when the user has selected page text.
const hasTextSelection = () => { var _a, _b; return ((_b = (_a = window.getSelection()) === null || _a === void 0 ? void 0 : _a.toString()) !== null && _b !== void 0 ? _b : "") !== ""; };
export function setupHistoryShortcuts(options) {
    const { onUndo, onRedo, onDeselect, onCopy, onCut, onPaste, onClearSelection, onInvert, onInvertSelection } = options;
    document.addEventListener("keydown", (event) => {
        if (event.defaultPrevented || isEditableTarget(event.target) || isOverlayOpen())
            return;
        const key = event.key.toLowerCase();
        const mod = event.metaKey || event.ctrlKey;
        if (mod && !event.shiftKey && key === "z") {
            event.preventDefault();
            onUndo();
            return;
        }
        if (mod && event.shiftKey && key === "z") {
            event.preventDefault();
            onRedo();
            return;
        }
        if (mod && !event.shiftKey && key === "y") {
            event.preventDefault();
            onRedo();
            return;
        }
        if (mod && !event.shiftKey && key === "d") {
            event.preventDefault();
            onDeselect();
            return;
        }
        if (mod && !event.shiftKey && key === "c") {
            if (hasTextSelection())
                return;
            event.preventDefault();
            onCopy();
            return;
        }
        if (mod && !event.shiftKey && key === "x") {
            event.preventDefault();
            onCut();
            return;
        }
        if (mod && !event.shiftKey && key === "v") {
            event.preventDefault();
            onPaste();
            return;
        }
        // Backspace / Delete — erase cells within selection
        if (!mod && (key === "backspace" || key === "delete")) {
            event.preventDefault();
            onClearSelection();
            return;
        }
        // Ctrl+i — invert bits of selection (or full canvas if no selection)
        if (mod && !event.shiftKey && key === "i") {
            event.preventDefault();
            onInvert();
            return;
        }
        // Shift+i — invert the selection itself
        if (!mod && event.shiftKey && key === "i") {
            event.preventDefault();
            onInvertSelection();
            return;
        }
    });
}
