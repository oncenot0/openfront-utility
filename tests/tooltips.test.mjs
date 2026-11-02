import test from "node:test";
import assert from "node:assert/strict";
import { parseTitle } from "../docs/app/tooltips.js";

test("'Name (Keys)' splits into label and keys", () => {
  assert.deepEqual(parseTitle("Undo (Ctrl+Z)"), { label: "Undo", keys: "Ctrl+Z", description: null });
  assert.deepEqual(parseTitle("Cut selection (Ctrl+X)"), { label: "Cut selection", keys: "Ctrl+X", description: null });
});

test("'Name — description' splits into label and description", () => {
  const tip = parseTitle("Fill — flood fill area; with selection: inverts selection");
  assert.equal(tip.label, "Fill");
  assert.equal(tip.keys, null);
  assert.equal(tip.description, "flood fill area; with selection: inverts selection");
});

test("keys and a trailing description can both be present", () => {
  const tip = parseTitle("Paste clipboard (Ctrl+V) — then click top-left position");
  assert.deepEqual(tip, { label: "Paste clipboard", keys: "Ctrl+V", description: "then click top-left position" });
});

test("a plain title is just a label", () => {
  assert.deepEqual(parseTitle("Reset zoom"), { label: "Reset zoom", keys: null, description: null });
});
