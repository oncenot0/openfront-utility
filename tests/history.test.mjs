import test from "node:test";
import assert from "node:assert/strict";
import { createHistoryManager } from "../docs/app/undoRedo.js";

test("without a batch, every record is its own undo step", () => {
  const h = createHistoryManager();
  h.record("a"); h.record("b"); h.record("c");
  assert.equal(h.undo(), "b");
  assert.equal(h.undo(), "a");
  assert.equal(h.undo(), null);
});

test("a batch groups many records into ONE undo step", () => {
  const h = createHistoryManager();
  h.record("empty");
  h.beginBatch();
  h.record("1"); h.record("12"); h.record("123");
  h.endBatch();
  assert.equal(h.undo(), "empty");
  assert.equal(h.canUndo(), false);
  assert.equal(h.redo(), "123");
});

test("two batches are two undo steps", () => {
  const h = createHistoryManager();
  h.record("0");
  h.beginBatch(); h.record("a"); h.record("ab"); h.endBatch();
  h.beginBatch(); h.record("abc"); h.record("abcd"); h.endBatch();
  assert.equal(h.undo(), "ab");
  assert.equal(h.undo(), "0");
  assert.equal(h.undo(), null);
});

test("a batch that changes nothing adds no undo step", () => {
  const h = createHistoryManager();
  h.record("same");
  h.beginBatch(); h.record("same"); h.endBatch();
  assert.equal(h.canUndo(), false);
});

test("an empty batch is harmless", () => {
  const h = createHistoryManager();
  h.record("x");
  h.beginBatch(); h.endBatch();
  assert.equal(h.canUndo(), false);
});

test("canUndo is true during a batch that has changed something", () => {
  const h = createHistoryManager();
  h.record("0");
  h.beginBatch();
  assert.equal(h.canUndo(), false);
  h.record("1");
  assert.equal(h.canUndo(), true);
  h.endBatch();
  assert.equal(h.canUndo(), true);
});

test("undo during an open batch commits the stroke first, never loses it", () => {
  const h = createHistoryManager();
  h.record("0");
  h.beginBatch(); h.record("1"); h.record("2");
  assert.equal(h.undo(), "0"); // reverts the whole in-progress stroke
  assert.equal(h.redo(), "2");
});

test("a new stroke after an undo clears redo", () => {
  const h = createHistoryManager();
  h.record("0"); h.record("1");
  h.undo();
  assert.equal(h.canRedo(), true);
  h.beginBatch(); h.record("x"); h.endBatch();
  assert.equal(h.canRedo(), false);
});

test("one long stroke counts once against the history limit", () => {
  const h = createHistoryManager(5);
  h.record("start");
  h.beginBatch();
  for (let i = 0; i < 1000; i++) h.record(`cell-${i}`);
  h.endBatch();
  assert.equal(h.undo(), "start");
});

test("object history with a key function still works in batches", () => {
  const h = createHistoryManager(200, (v) => JSON.stringify(v));
  h.record([[0]]);
  h.beginBatch(); h.record([[1]]); h.record([[1], [1]]); h.endBatch();
  assert.deepEqual(h.undo(), [[0]]);
});
