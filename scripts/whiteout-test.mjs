/**
 * Whiteout QA driver — runs the real edit-pdf engine path (runApplyAnnotations)
 * in headless Chromium with the exact items produced by the browser QA session
 * (two whiteout covers + a replacement text) and saves the output PDF.
 */
import http from "node:http";
import { mkdirSync, writeFileSync } from "node:fs";
import { readFile as rf } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import esbuild from "esbuild";
import { chromium } from "playwright";

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(here, "../tests/conv");
const OUT = path.join(ROOT, "out");
mkdirSync(OUT, { recursive: true });

const stubNodeBuiltins = {
  name: "stub-node-builtins",
  setup(build) {
    const mods = [
      "fs", "path", "crypto", "stream", "os", "url", "http", "https",
      "zlib", "util", "child_process", "net", "tls", "readline", "assert",
    ];
    for (const m of mods) {
      build.onResolve({ filter: new RegExp(`^${m}$`) }, () => ({
        path: m, namespace: "stub",
      }));
    }
    build.onLoad({ filter: /.*/, namespace: "stub" }, () => ({
      contents: "module.exports = {};", loader: "js",
    }));
  },
};
await esbuild.build({
  entryPoints: [path.join(here, "whiteout-harness.src.ts")],
  bundle: true, format: "iife", platform: "browser",
  outfile: path.join(ROOT, "conv-harness.js"),
  define: { "process.env.NODE_ENV": '"production"' },
  plugins: [stubNodeBuiltins], logLevel: "warning",
});

const server = http.createServer(async (req, res) => {
  try {
    let p = new URL(req.url, "http://x").pathname;
    if (p === "/") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end('<!doctype html><html><body><script src="/conv-harness.js"></script></body></html>');
      return;
    }
    const file =
      p === "/pdf.worker.min.mjs"
        ? path.join(here, "../public/pdf.worker.min.mjs")
        : path.join(ROOT, p);
    const data = await rf(file);
    res.writeHead(200, { "Cache-Control": "no-store" });
    res.end(data);
  } catch {
    res.writeHead(404); res.end("nf");
  }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const port = server.address().port;

const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined,
});
const page = await browser.newPage();
page.on("pageerror", (e) => console.log("PAGEERROR:", String(e?.message ?? e)));
await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: "load" });
await page.waitForFunction(() => typeof window.convTest === "function", null, {
  timeout: 60000, polling: 250,
});

/* the items the editor emitted in the browser QA session
   (page fractions x 595.28 / 841.89 → PDF user space, rotation 0) */
const X = (f) => +(f * 595.28).toFixed(2);
const Y = (f) => +((1 - f) * 841.89).toFixed(2);
const items = [
  { page: 0, type: "rect", x: X(0.775), y: Y(0.158), w: X(0.908) - X(0.775), h: Y(0.128) - Y(0.158), color: "#FFFFFF", fill: "#FFFFFF", thickness: 0, opacity: 1 },
  { page: 0, type: "text", text: "November 2026", x: X(0.778), y: Y(0.1475), size: 11, color: "#1D4ED8", font: "helvetica", rotate: 0, opacity: 1 },
];

const b64 = (await rf(path.join(ROOT, "fixture-report.pdf"))).toString("base64");
const res = await page.evaluate(
  ({ b64, items }) => window.convTest("edit-pdf", b64, "fixture-report.pdf", { items }),
  { b64, items }
);
for (const f of res.outputs) {
  writeFileSync(path.join(OUT, "whiteout-output.pdf"), Buffer.from(f.b64, "base64"));
  console.log(`✓ edit-pdf → ${f.name} (${(f.b64.length * 0.75 / 1024).toFixed(1)} KB)`);
}
await browser.close();
server.close();
console.log("done → tests/conv/out/whiteout-output.pdf");
