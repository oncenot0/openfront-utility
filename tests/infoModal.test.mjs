import test from "node:test";
import assert from "node:assert/strict";
import { renderMarkdown } from "../docs/app/infoModal.js";

test("https links become safe anchors", () => {
  const html = renderMarkdown("[repo](https://github.com/BrayFlex/openfront-utility)");
  assert.match(html, /<a href="https:\/\/github\.com\/BrayFlex\/openfront-utility" target="_blank" rel="noopener">repo<\/a>/);
});

test("a quote in a URL cannot break out of the href attribute", () => {
  const html = renderMarkdown('[x](a"onmouseover="alert`1`)');
  // No attribute may be injected: the only attributes on <a> are href/target/rel.
  const anchor = html.match(/<a\s[^>]*>/i)?.[0] ?? "";
  const attrs = [...anchor.matchAll(/\s([a-z-]+)=/gi)].map((m) => m[1].toLowerCase());
  assert.ok(attrs.every((a) => ["href", "target", "rel"].includes(a)), `unexpected attributes: ${attrs}`);
  assert.doesNotMatch(html, /onmouseover\s*=\s*"/i);
});

test("javascript: and data: links are not turned into anchors", () => {
  assert.doesNotMatch(renderMarkdown("[click](javascript:alert)"), /<a /i);
  assert.doesNotMatch(renderMarkdown("[click](data:text/html;base64,AAAA)"), /<a /i);
  assert.doesNotMatch(renderMarkdown("[click](JaVaScRiPt:alert)"), /<a /i);
});

test("relative and same-page links are still allowed", () => {
  assert.match(renderMarkdown("[a](#section)"), /<a href="#section"/);
  assert.match(renderMarkdown("[a](./other.md)"), /<a href="\.\/other\.md"/);
});

test("raw HTML in the markdown is escaped", () => {
  const html = renderMarkdown("<img src=x onerror=alert(1)>");
  assert.doesNotMatch(html, /<img/i);
  assert.match(html, /&lt;img/);
});

test("quotes and apostrophes render as text, not markup", () => {
  const html = renderMarkdown(`He said "hi" and it's fine`);
  assert.match(html, /&quot;hi&quot;/);
  assert.match(html, /it&#39;s/);
});

test("existing formatting still works", () => {
  assert.match(renderMarkdown("# Title"), /<h1>Title<\/h1>/);
  assert.match(renderMarkdown("- one\n- two"), /<ul>\n<li>one<\/li>\n<li>two<\/li>\n<\/ul>/);
  assert.match(renderMarkdown("**bold** and `code`"), /<strong>bold<\/strong> and <code>code<\/code>/);
});
