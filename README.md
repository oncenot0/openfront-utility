# 1-Bit Pattern Design Application 
## Purposed for https://OpenFront.io Artists

# What This Fork Adds

A fork of [BrayFlex/openfront-utility](https://github.com/BrayFlex/openfront-utility), the OpenFront.io pattern editor, featuring an improved drawing workflow, new tools, and full offline support.

## New Tools

- **Dither Brush (D):** Paints a dot pattern with a density slider (12 / 25 / 50 / 75 / 88% presets). Three modes control how existing canvas pixels are handled:
  - **Add:** Only adds dots; never removes existing pixels.
  - **Replace:** Overwrites the brush area with the pattern.
  - **Erase:** Removes pixels where the pattern has dots.

- **Gradient Fill (G):** Drag from the starting point (solid) to the ending point (faded). Fills the selection or the entire canvas. Supports four dithering styles: ordered 8×8, ordered 4×4, Floyd–Steinberg, and Atkinson. Includes Replace and Keep & Add modes.

- **Mirror X / Mirror Y (X, Y):** Symmetrical drawing for the pencil, dither brush, line, circle, and shape tools. The mirror line is draggable; double-click its handle to re-centre it.

- **Dither Mode in Image Convert:** Converts photos and gradients into 1/0 patterns while preserving their shading. Supports Floyd–Steinberg, Atkinson, and ordered 4×4 / 8×8 dithering.

## Keyboard & Help

- **Tool shortcuts:**
  - `P` — Pencil
  - `D` — Dither
  - `G` — Gradient
  - `L` — Line
  - `C` — Circle
  - `S` — Shape
  - `F` — Fill
  - `H` — Shade
  - `M` — Select
  - `[` / `]` — Brush size
  - `?` — Cheat sheet

- Aseprite-style hover tooltips with keyboard key caps, including `⌘` on macOS.
- Tooltips are also available on disabled buttons.
- Dedicated keyboard-shortcuts button and cheat sheet.

## Full Offline Support

- Fonts are bundled locally, eliminating the need for Google Fonts.
- A service worker caches the entire application after the first visit.
- Draw without an internet connection.
- Installable as an application.
- After a deployment update, users receive a **"New version is ready"** notification.

## Fixes to Existing Behaviour

- **Pencil:**
  - The first cell of a drag is now painted.
  - An entire stroke counts as one undo step.
  - Fast drags no longer leave gaps.
  - Brush sizes are exactly `size × size`.
  - Shift no longer gets stuck after using Alt-Tab.

- Rotating a selection no longer causes it to drift.
- Pasting a share link into Import now works.
- The changelog renderer is hardened.
- Team-colour preview performance is improved.
- Keyboard shortcuts no longer interfere with copying text or activate behind open dialogs.
- `Ctrl/Cmd + Y` now redoes actions.

## Testing

- 110 automated tests (`npm test`).
- Tested in headless Chromium.

## Notes & Limitations

- Safari, Firefox, and physical touch devices have not been tested.
- Offline functionality requires one initial visit while online.
- Bundled fonts currently support only the Latin subset.
- Deployment configuration remains unchanged.
- The service worker requires HTTPS (GitHub Pages supports this).

### Not Changed

- Touch drawing.
- Tile size limits (16–128 × 16–64).
- Stretched image import.

This project is a tool for generating and previewing OpenFront patterns in Base64 format.

It runs a workflow to deploy to GitHub Pages: https://oncenot0.github.io/openfront-utility/

Forked from: https://brayflex.github.io/openfront-utility/

It currently exists as a separate fork enabling me to make changes and improvements that are based solely on my own vision.

It is in beta and will likely have issues & bugs.
