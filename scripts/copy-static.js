import { createHash } from "node:crypto";
import { cp, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const srcDir = path.join(rootDir, "src");
const outDir = path.join(rootDir, "docs");

const shouldCopy = (fileName) => !fileName.endsWith(".ts");

const copyStaticFiles = async (dir) => {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await copyStaticFiles(entryPath);
      continue;
    }
    if (!shouldCopy(entry.name)) {
      continue;
    }
    const relPath = path.relative(srcDir, entryPath);
    const destPath = path.join(outDir, relPath);
    await mkdir(path.dirname(destPath), { recursive: true });
    await cp(entryPath, destPath);
  }
};

// Copy noUiSlider assets
const nouisliderDir = path.join(rootDir, "node_modules", "nouislider", "dist");
const nouisliderOutDir = path.join(outDir, "nouislider");
await mkdir(nouisliderOutDir, { recursive: true });
await cp(path.join(nouisliderDir, "nouislider.min.css"), path.join(nouisliderOutDir, "nouislider.min.css"));
await cp(path.join(nouisliderDir, "nouislider.min.mjs"), path.join(nouisliderOutDir, "nouislider.min.mjs"));

await mkdir(outDir, { recursive: true });
await copyStaticFiles(srcDir);

// Copy the self-hosted fonts (Latin subset) so the app needs no internet for text.
const fonts = [
  ["dm-sans", [400, 500, 600, 700]],
  ["dm-mono", [400, 500]],
  ["space-grotesk", [400, 500, 600, 700]],
  ["ibm-plex-mono", [400, 500]],
];
const fontsOutDir = path.join(outDir, "fonts");
await mkdir(fontsOutDir, { recursive: true });
for (const [family, weights] of fonts) {
  for (const weight of weights) {
    const file = `${family}-latin-${weight}-normal.woff2`;
    await cp(
      path.join(rootDir, "node_modules", "@fontsource", family, "files", file),
      path.join(fontsOutDir, file)
    );
  }
}

// Generate the service worker: every built file is cached so the whole app
// works offline. The content hash changes whenever any file does, which is what
// makes browsers install the new version.
const listFiles = async (dir) => {
  const found = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...(await listFiles(full)));
    else found.push(full);
  }
  return found;
};
const built = (await listFiles(outDir))
  .map((file) => path.relative(outDir, file).split(path.sep).join("/"))
  .filter((rel) => rel !== "sw.js" && !rel.endsWith(".map"))
  .sort();
const optional = built.filter((rel) => rel.startsWith("maps/"));
const core = ["./", ...built.filter((rel) => !rel.startsWith("maps/"))];
const hash = createHash("sha1");
for (const rel of built) {
  hash.update(rel);
  hash.update(await readFile(path.join(outDir, rel)));
}
const template = await readFile(path.join(rootDir, "scripts", "sw-template.js"), "utf8");
await writeFile(
  path.join(outDir, "sw.js"),
  template
    .replace("__VERSION__", hash.digest("hex").slice(0, 10))
    .replace("__CORE__", JSON.stringify(core, null, 2))
    .replace("__OPTIONAL__", JSON.stringify(optional, null, 2))
);
