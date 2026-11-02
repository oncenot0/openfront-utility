import test from "node:test";
import assert from "node:assert/strict";
import { TOOL_SHORTCUTS, TOGGLE_SHORTCUTS, toolForKey, CHEAT_SHEET, formatKeys, splitKeys } from "../docs/app/shortcuts.js";

test("every tool has a unique single-letter key", () => {
  const keys = Object.values(TOOL_SHORTCUTS).map((t) => t.key);
  assert.equal(new Set(keys).size, keys.length);
  assert.ok(keys.every((k) => /^[A-Z]$/.test(k)));
});

test("tool keys don't collide with the toggle keys", () => {
  const toolKeys = new Set(Object.values(TOOL_SHORTCUTS).map((t) => t.key));
  for (const t of Object.values(TOGGLE_SHORTCUTS)) assert.ok(!toolKeys.has(t.key), t.key);
});

test("the requested keys are mapped: P pencil, F fill", () => {
  assert.equal(toolForKey("p"), "pencil");
  assert.equal(toolForKey("P"), "pencil");
  assert.equal(toolForKey("f"), "fill");
  assert.equal(toolForKey("d"), "ditherBrush");
  assert.equal(toolForKey("g"), "gradient");
});

test("unmapped keys return null", () => {
  for (const k of ["q", "1", "Enter", " ", "Escape"]) assert.equal(toolForKey(k), null);
});

test("cheat sheet lists every tool and every toggle", () => {
  const all = CHEAT_SHEET.flatMap((s) => s.items.map((i) => i.label));
  for (const t of Object.values(TOOL_SHORTCUTS)) assert.ok(all.includes(t.label), t.label);
  for (const t of Object.values(TOGGLE_SHORTCUTS)) assert.ok(all.includes(t.label), t.label);
});

test("Ctrl becomes the Command symbol on a Mac only", () => {
  assert.equal(formatKeys("Ctrl+Z", true), "⌘Z");
  assert.equal(formatKeys("Ctrl+Shift+Z", true), "⌘⇧Z");
  assert.equal(formatKeys("Shift+I", true), "⇧I");
  assert.equal(formatKeys("Ctrl+Z", false), "Ctrl+Z");
  assert.equal(formatKeys("P", true), "P");
});

test("splitKeys makes one chip per key", () => {
  assert.deepEqual(splitKeys("Ctrl+Shift+Z"), ["Ctrl", "Shift", "Z"]);
  assert.deepEqual(splitKeys("P"), ["P"]);
  assert.deepEqual(splitKeys("Space + drag"), ["Space + drag"]);
});
