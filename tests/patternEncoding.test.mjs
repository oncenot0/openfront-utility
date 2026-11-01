import test from "node:test";
import assert from "node:assert/strict";
import {
  generatePatternBase64,
  decodePatternBase64,
  normalizePatternInput,
} from "../docs/app/patternEncoding.js";

const makePattern = (w, h, f) =>
  Array.from({ length: h }, (_, y) => Array.from({ length: w }, (_, x) => f(x, y)));

test("encode -> decode round-trips every size the format supports (2..129 x 2..65)", () => {
  for (let w = 2; w <= 129; w++) {
    for (let h = 2; h <= 65; h++) {
      const pattern = makePattern(w, h, (x, y) => (x * 7 + y * 13 + w) % 3 === 0 ? 1 : 0);
      const decoded = decodePatternBase64(generatePatternBase64(pattern, w, h, 0));
      assert.equal(decoded.tileWidth, w);
      assert.equal(decoded.tileHeight, h);
      assert.deepEqual(decoded.pattern, pattern);
    }
  }
});

test("scale survives a round trip", () => {
  for (let scale = 0; scale <= 7; scale++) {
    const code = generatePatternBase64(makePattern(16, 16, () => 1), 16, 16, scale);
    assert.equal(decodePatternBase64(code).scale, scale);
  }
});

test("encoder rejects out-of-range dimensions and scale", () => {
  const p = makePattern(10, 10, () => 0);
  assert.throws(() => generatePatternBase64(p, 1, 10, 0));
  assert.throws(() => generatePatternBase64(p, 130, 10, 0));
  assert.throws(() => generatePatternBase64(p, 10, 66, 0));
  assert.throws(() => generatePatternBase64(p, 10, 10, 8));
});

test("normalizePatternInput leaves a bare code untouched", () => {
  assert.equal(normalizePatternInput("AAAACQ"), "AAAACQ");
});

test("normalizePatternInput trims whitespace", () => {
  assert.equal(normalizePatternInput("  AAAACQ \n"), "AAAACQ");
});

test("normalizePatternInput extracts the code from the app's share link", () => {
  const link = "https://brayflex.github.io/openfront-utility/#AAAACQ?primary=ffffff&secondary=000000";
  assert.equal(normalizePatternInput(link), "AAAACQ");
  assert.equal(normalizePatternInput("#AAAACQ?primary=fff"), "AAAACQ");
  assert.equal(normalizePatternInput("AAAACQ?primary=fff"), "AAAACQ");
});

test("normalizePatternInput returns empty for empty / hash-only input", () => {
  assert.equal(normalizePatternInput(""), "");
  assert.equal(normalizePatternInput("   "), "");
  assert.equal(normalizePatternInput("#"), "");
});

test("a pasted share link decodes to the same pattern as the bare code", () => {
  const pattern = makePattern(8, 8, (x, y) => (x + y) % 2);
  const code = generatePatternBase64(pattern, 8, 8, 2);
  const link = `https://example.com/app/#${code}?primary=ff0000&secondary=00ff00`;
  assert.deepEqual(
    decodePatternBase64(normalizePatternInput(link)),
    decodePatternBase64(code),
  );
});

test("invalid Base64 gives a readable error, not a raw DOMException", () => {
  assert.throws(() => decodePatternBase64("!!!!"), (err) => {
    assert.ok(err instanceof Error);
    assert.match(err.message, /pattern code/i);
    assert.doesNotMatch(err.message, /atob/);
    return true;
  });
});

test("truncated, empty and wrong-version data are rejected", () => {
  assert.throws(() => decodePatternBase64(""), /too short/i);
  assert.throws(() => decodePatternBase64("AAAA"), /too short for the specified dimensions/i);
  assert.throws(() => decodePatternBase64(btoa(String.fromCharCode(1, 0, 0, 0))), /version/i);
});
