# Changelog — OpenFront Utility (BrayFlex fork)

*Note: some changes may be undocumented prior to September 2026 because I didn't keep track ¯\_(ツ)_/¯*

## November 3, 2026 — Bigger Brushes, Thick Lines & Selection Buttons
- **Smoother dragging and dithering** — drawing no longer re-encodes the pattern and redraws the preview for every single cell the mouse crosses; updates are merged to once per frame, brush stamps skip cells that already have the right value, and dragging a select box only repaints the cells that changed.
- **Center button for Mirror** — a **Center** button appears next to Mirror X / Y while a mirror line is on and snaps the line(s) back to the middle of the canvas in one click (double-clicking a handle still works too).
- **Circle tool** — size now goes up to **128** (was 30) and is the circle's true **diameter**, so a size of 7 is exactly 7 cells wide. Even sizes work properly (they used to match the odd size below them), and the outline is a clean, symmetric ring at every size.
- **Pencil** — size now goes up to **64** (was 9).
- **Line tool thickness** — the line tool now has a size slider (1–32) and the preview shows the thick line before you place it.
- **Selection buttons** — while something is selected, a bar appears at the bottom of the canvas with **move**, **rotate** and **flip X / flip Y** buttons (the toolbar buttons still work too).
- Size slider labels are thinned out on wide ranges so the numbers stay readable.

## August 16, 2026 — Update Links
- The **Links** now reference the new artist dashboard and links related to the old system have been removed.

## August 16, 2026 — New Dashboard Submit
- The **Submit** button no longer pops up a form modal. Clicking it now opens the **OpenFront Dashboard Submission Form Page** in a new tab with your pattern already filled in — ready to fill out, review and submit.

## August 16, 2026 — Simulate In-Game Map & Team Colors
Three big additions to the Preview panel:

- **Simulate Map (🗺 button)** — opens a popover where you can pick from **9 real in-game maps** (World, Alps, Two Lakes, Arctic, Mare Nostrum, Gulf of St. Lawrence, Australia, Baikal, and South America). Your pattern is layered over the map using the game's own terrain colours and territory-fill style, drawn **only on land**, and kept in sync with the pattern zoom — so it looks just like the in-game map view.
- **Show Team Colors** — a toggle (now sitting below the map list with its own description) that shows what your pattern looks like in **team games**: the primary colour is swapped out for each team's colour in radial pie-style wedges radiating from the centre, so you can eyeball all 7 team colours at once.
- Behind the scenes fix, the preview background turns to the map's dark colour while a map is shown, so your primary colour no longer bleeds through at the edges when you zoom out.
- Added a **Copy image (⎙) button** to the right of it — one click copies the preview **exactly as you see it** (pattern, zoom, map simulation and all) to your clipboard as a PNG image.
- The **🗺 button now glows with the 7 team colours** when *Simulate Teams* is switched on, so you can tell at a glance that team colours are active behind that popover menu button.
- Small fixes to: UI spacing on popovers to create uniformity, size tick display, color display area in floating preview and font imports.

## August 15, 2026 — Crisper, Pixel-Perfect Preview
The preview panel got a big clarity upgrade:
- The pattern now **repeats right to the edges** of the panel, at any size or zoom level — resizing the panel just reveals more of the pattern instead of stretching it.
- **Zoom controls the pattern size** 50% up to 500% 
- **Fixed Monitor Interpolation** by adding a formula to calculate how to display pattern **sharp and pixel-perfect** at every level and every screen size — no more mis-sized, blurry or smudged edges (avoids half pixel rounding).
- The preview area now takes up about **60% of the panel's height**, giving your pattern more room to shine.
- Fixed an edge case where the pattern could stop just short of the panel's borders at certain zoom levels.

## August 14, 2026 — Favorite Colours
- Added a **★ star button** next to the Color Code button so you can **favorite your current color palette** (preset or custom) with one click — tap again to remove it.
- Favorited colors appear in a new **Favorites** list above the Color Presets, so you can quickly jump back to the palettes you use most. Custom palettes are listed as **"custom"**, and your favorites are remembered between sessions.

## August 14, 2026 — Guides, Ruler & Toolbar Polish
- Guide controls are now a tidy **Grid / Center / Ruler** toggle group with a more subtle tab-like style.
- The **Grid and Center toggles now stay in sync across both the Main and Test canvases** without resizing either one.
- Added an outside **ruler** around the drawable canvas — ticks on every line with numbers every 5 — plus a **Show/Hide Ruler** toggle. Center ticks appear on all four sides when Center is on, independent of the ruler.
- Moved the **Invert/Clear** buttons into the toolbar and the **Grid/Center/Ruler** toggles into the secondary toolbar (they swapped places), stacking Invert/Clear to save space.
- Tidied the top bar: extra top/bottom padding, smaller export buttons, and consistent 12px font across the main controls.

## August 13, 2026 — Test Canvas & Preview Fixes
- The **Test Canvas** is now a fixed 128×128 scratchpad with its own independent pan/zoom, so drawing there never silently changes the size of your main canvas.
- Fixed **Undo/Redo on the Test Canvas** (it previously couldn't record your steps because a 128×128 pattern can't be compressed into the standard pattern code).
- The preview panel now renders correctly no matter which canvas is active.
- Helpful little **toasts** (bottom-corner notifications) now confirm when you copy the JSON, console string, or preview link, and the Test Canvas tab shows a short tip on first use.

## August 12, 2026 — DM Mono Font
The monospace font everywhere (canvas size numbers, shape buttons, image-import threshold and the preview code view) switched from **IBM Plex Mono** to **DM Mono**, matching the DM Sans look of the rest of the interface.

## August 12, 2026 — Invert shortcut now Ctrl+I
- Inverting pixels is now **Ctrl/Cmd+I** (was plain `I`), matching the other clipboard-style shortcuts.
- The **Controls** tab was tidied up: panning via Space or Ctrl is now a single line.

## August 11, 2026 — Reworked Info Panel into Five Tabs
The **Info** modal was broken down into five focused tabs:
- **About** — the beta disclaimer, how patterns work, team-colour tips, and credits.
- **Guide** — step-by-step instructions for testing your pattern in-game.
- **Controls** — every keyboard shortcut in a clean table.
- **Links** — all useful resources (submit form, status tracker, pattern tools, converter, feedback) in tidy cards.
- **Changelog** — the latest changes pulled straight from GitHub.

## August 10, 2026 — Redesigned Colors Section of the Preview Panel
The panel is now more compact in both fixed and floating preview and the text style matches other labels.

## August 10, 2026 — Fresh New App Icon
The little icon shown in your browser tab (the favicon) has been replaced with a brand new design.

## August 10, 2026 — Cleaner Font (DM Sans)
The whole interface now uses the **DM Sans** font, giving the tool a cleaner, more modern look.

## August 10, 2026 — Polished Tool-Size Slider
Refreshed the slider used to change tool size: clearer tick marks and number labels that are easy to read in **both light and dark mode**.

## August 9, 2026 — Artist Name Field
Text descriptions and label names have been written from scratch, concise and clear to keep everything compact. 

## August 9, 2026 — Pattern Scale Tabs (1× / 2× / 4×)
Pattern scale is now chosen with three simple tabs instead of a dropdown. The Width/Height labels and zoom controls were also tidied up.

## August 9, 2026 — Tool-Size Slider Fixes
Fixed the size slider so it works properly for every tool (the Circle and Shape tools use a 1–30 range), and improved how the slider looks with clear tick marks.

## August 8, 2026 — New Shortcuts & Easier Panning
- **Arrow keys** now pan around the canvas.
- Hold **Ctrl** and drag to pan — the cursor turns into a grab hand.
- **Backspace / Delete** erases the cells inside your current selection (and won't wipe the whole canvas by accident).
- Press **i** to invert pixels in your selection (or the whole canvas if nothing is selected); press **Shift+i** to invert the selection area itself.
- Fixed **Cut** so it actually removes the pixels, and **pasting** is now centred on your cursor and stays inside your selection.

## August 8, 2026 — Redesigned Tool-Size Selector
The size picker is now a clean floating panel in the corner of the canvas. It only appears for tools that have a size (like Pencil or Circle). You can type a size directly, and it automatically clamps to the limits of whichever tool you have selected. Pasting no longer deselects your pasted cells.

## August 2, 2026 — Preview Panel Overhaul
Big update to the preview panel:
- **Zoom** the preview from 50% up to 400%.
- Colour controls (primary / secondary / swap / copy colour code) are now in a single tidy row.
- The preview can be **undocked into a floating window** that you can drag anywhere, resize freely (grab the corner), and it remembers its position between sessions.
- Fixed a few dragging and resizing bugs along the way.

## July 30, 2026 — Smarter Preview Behaviour
The preview now **collapses automatically when you float it** and **expands when you dock it back**, keeping the workspace tidy.

## July 29–30, 2026 — Grid & Center Guides
- The **Center Guide** is now a clean, perfectly centred crosshair overlay.
- Refined the grid and center-guide colours and lines so they're clearly visible on any background.
- Added a "Size" label under the toolbar size button.

## July 29, 2026 — Preview Sizing Fixes
Fixed the preview canvas sizing so it keeps the correct proportions and fills its panel properly.

## July 22–23, 2026 — UI Revamp & Expanded Info Popup
- New animated **moon/sun** switch on the dark-mode toggle.
- Transform buttons (rotate / shift / flip) arranged into a tidy grid.
- Fixed Undo accidentally clearing the canvas when a selection was active.
- The selection border is now clearly visible even over black pixels.
- Side panels can be resized by dragging the divider, and the floating preview now has a resize handle.
- The **Info (ⓘ) popup** is now scrollable and includes more detail (including tips about testing FFA vs Teams colours).
- Removed third-party analytics for privacy.

## July 15, 2026 — New Blue Theme, Dark Mode & Compact Layout
- Restyled the whole app with a clean blue theme.
- Added a **Dark Mode toggle** that follows your system setting and remembers your choice.
- The tool-size picker is now a popover with clear tick marks.
- Colour presets are shown in a tidy 2-column grid, and the toolbar is compact enough to fit on 1080p / iPad screens.

## July 8, 2026 — Better Drawing Tools & Easier Submission
- **Submit** now collects your name, player ID, and pattern name, then opens a **pre-filled Google Form** in a new tab.
- **Paste** is now a tool of its own with a live preview under your cursor — it returns to your previous tool once placed.
- Hold **Shift** with any tool to temporarily switch into selection mode.
- New **Shape tool** (choose **Star** or **Cube**), and **circles** are now much smoother thanks to a better drawing algorithm.
- Fixed the Fill and Shade tools, and Clear / Invert now respect your selection.

## July 1, 2026 — Feature & Function Revamp (THE BIG UI OVERHAUL)
This was a complete rebuild of the tool, so almost everything about how you use it changed. Compared to the previous version:

**A brand-new toolbar**
- Drawing tools moved out of a side panel and into a horizontal toolbar along the top: **Pencil, Circle, Star, Line**, plus **Fill** and a new **Shade** tool (fills an area with a checkerboard pattern).
- One shared, adaptive **size slider** replaces the old separate size control per tool — it automatically matches whichever tool you pick.

**Cut, Copy & Paste**
- New **Cut / Copy / Paste** buttons — select part of your pattern, copy it, and paste it back down anywhere on the canvas.

**Selection tools**
- New **Select Area** and **Select Custom** tools plus a **Deselect** button, with **Shift / Rotate** buttons that act on your selection.

**Two canvases**
- A brand-new **Scrap Canvas** (a scratch/test canvas) alongside the main **Pattern Canvas**, switched with tabs at the top of the canvas area — each with its own Undo/Redo.

**Canvas controls bar**
- Canvas width and height now use compact number boxes with ▲/▼ arrows, plus dropdowns for **Scale** (1×–16×) and **Grid Zoom**, and **Invert / Clear** buttons.

**Preview panel**
- The preview can now be **floated** as its own window, **docked** back, or hidden (with a button to show it again when collapsed). The colour controls (primary / secondary / swap / presets) stayed in the panel.

**Simpler export & submit**
- Export and Import were reorganized into tabs with one-click **Copy** buttons (JSON, Discord, Preview link, Console) and a brand-new **Submit** button that opens a submission popup.
- The old **Stamp** tool and the complicated shift-mode settings were removed to keep things simpler.
