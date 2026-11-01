import test from "node:test";
import assert from "node:assert/strict";
import { hexToRgb, teamPrimaryFor } from "../docs/app/previewRenderer.js";

// Reference copy of the original per-pixel implementation (hex parsed on every call).
function referenceTeamPrimary(hexColors, x, y, width, height) {
  if (!hexColors || hexColors.length === 0) return null;
  const dx = x - width / 2, dy = y - height / 2;
  let angle = Math.atan2(dy, dx) + Math.PI / 2;
  angle = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  const idx = Math.floor((angle / (Math.PI * 2)) * hexColors.length) % hexColors.length;
  return hexToRgb(hexColors[idx]);
}

test("hexToRgb parses #rrggbb, rrggbb and falls back to white", () => {
  assert.deepEqual(hexToRgb("#ff8000"), { r: 255, g: 128, b: 0 });
  assert.deepEqual(hexToRgb("00ff7f"), { r: 0, g: 255, b: 127 });
  assert.deepEqual(hexToRgb("not-a-color"), { r: 255, g: 255, b: 255 });
});

test("teamPrimaryFor returns null for no team colours", () => {
  assert.equal(teamPrimaryFor(null, 1, 1, 10, 10), null);
  assert.equal(teamPrimaryFor([], 1, 1, 10, 10), null);
});

test("pre-parsed teamPrimaryFor matches the original per-pixel behaviour exactly", () => {
  const palette = ["#ff0000", "#00ff00", "#0000ff", "#ffff00", "#ff00ff", "#00ffff", "#123456"];
  for (let n = 1; n <= palette.length; n++) {
    const hex = palette.slice(0, n);
    const parsed = hex.map(hexToRgb);
    for (let y = 0; y < 60; y += 3) {
      for (let x = 0; x < 80; x += 3) {
        assert.deepEqual(teamPrimaryFor(parsed, x, y, 80, 60), referenceTeamPrimary(hex, x, y, 80, 60));
      }
    }
  }
});
