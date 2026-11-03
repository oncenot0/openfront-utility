import { CHEAT_SHEET, formatKeys, splitKeys } from "./shortcuts.js";
export function createCheatSheet(openButton) {
    const mac = /Mac|iPhone|iPad/i.test(navigator.platform || navigator.userAgent);
    const modal = document.createElement("div");
    modal.id = "shortcutsModal";
    modal.className = "shortcuts-modal";
    modal.hidden = true;
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-labelledby", "shortcutsTitle");
    const backdrop = document.createElement("div");
    backdrop.className = "shortcuts-backdrop";
    const card = document.createElement("div");
    card.className = "shortcuts-card";
    const header = document.createElement("header");
    const title = document.createElement("h2");
    title.id = "shortcutsTitle";
    title.textContent = "Keyboard shortcuts";
    const close = document.createElement("button");
    close.type = "button";
    close.className = "shortcuts-close";
    close.textContent = "Close";
    header.append(title, close);
    const grid = document.createElement("div");
    grid.className = "shortcuts-grid";
    for (const section of CHEAT_SHEET) {
        const box = document.createElement("section");
        box.className = "shortcuts-section";
        const h3 = document.createElement("h3");
        h3.textContent = section.title;
        box.appendChild(h3);
        for (const item of section.items) {
            const row = document.createElement("div");
            row.className = "shortcuts-row";
            const label = document.createElement("span");
            label.textContent = item.label;
            const keys = document.createElement("span");
            keys.className = "shortcuts-keys";
            for (const k of splitKeys(formatKeys(item.keys, mac))) {
                const kbd = document.createElement("kbd");
                kbd.textContent = k;
                keys.appendChild(kbd);
            }
            row.append(label, keys);
            box.appendChild(row);
        }
        grid.appendChild(box);
    }
    const foot = document.createElement("p");
    foot.className = "shortcuts-foot";
    foot.textContent = "Hover over any tool to see its shortcut. Press ? any time to open this list.";
    card.append(header, grid, foot);
    modal.append(backdrop, card);
    document.body.appendChild(modal);
    let returnFocus = null;
    const openSheet = () => {
        returnFocus = document.activeElement;
        modal.hidden = false;
        close.focus();
    };
    const closeSheet = () => {
        var _a;
        modal.hidden = true;
        (_a = returnFocus === null || returnFocus === void 0 ? void 0 : returnFocus.focus) === null || _a === void 0 ? void 0 : _a.call(returnFocus);
    };
    close.addEventListener("click", closeSheet);
    backdrop.addEventListener("click", closeSheet);
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && !modal.hidden) {
            e.preventDefault();
            closeSheet();
        }
    });
    openButton === null || openButton === void 0 ? void 0 : openButton.addEventListener("click", openSheet);
    return {
        open: openSheet,
        close: closeSheet,
        toggle: () => (modal.hidden ? openSheet() : closeSheet()),
        isOpen: () => !modal.hidden,
    };
}
