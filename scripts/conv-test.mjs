/**
 * Conversion QA driver — bundles conv-harness.src.ts, serves it with the
 * fixtures, runs pdf-to-word and word-to-pdf in headless Chromium and saves
 * the outputs to tests/conv/out/.
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

/* bundle */
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
  entryPoints: [path.join(here, "conv-harness.src.ts")],
  bundle: true, format: "iife", platform: "browser",
  outfile: path.join(ROOT, "conv-harness.js"),
  define: { "process.env.NODE_ENV": '"production"' },
  plugins: [stubNodeBuiltins], logLevel: "warning",
});

/* serve */
const server = http.createServer(async (req, res) => {
  try {
    let p = new URL(req.url, "http://x").pathname;
    if (p === "/") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(
        '<!doctype html><html><body><script src="/conv-harness.js"></script></body></html>'
      );
      return;
    }
    const file =
      p === "/pdf.worker.min.mjs"
        ? path.join(here, "../public/pdf.worker.min.mjs")
        : path.join(ROOT, p);
    const data = await rf(file);
    res.writeHead(200, {
      "Content-Type": p.endsWith(".js") ? "text/javascript" : "application/javascript",
      "Cache-Control": "no-store",
    });
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

const CASES = [
  {
    id: "pdf-to-word",
    fixture: "fixture-report.pdf",
    name: "fixture-report.pdf",
    opts: {},
  },
  {
    id: "word-to-pdf",
    fixture: "fixture-doc.docx",
    name: "fixture-doc.docx",
    opts: { pageSize: "a4" },
  },
  {
    id: "pdf-to-word",
    fixture: "fixture-image.pdf",
    name: "fixture-image.pdf",
    opts: {},
  },
];

for (const c of CASES) {
  const b64 = (await rf(path.join(ROOT, c.fixture))).toString("base64");
  const res = await page.evaluate(
    ({ id, b64, name, opts }) => window.convTest(id, b64, name, opts),
    { id: c.id, b64, name: c.name, opts: c.opts }
  );
  for (const f of res.outputs) {
    writeFileSync(path.join(OUT, f.name), Buffer.from(f.b64, "base64"));
    console.log(`✓ ${c.id} → ${f.name} (${(f.b64.length * 0.75 / 1024).toFixed(1)} KB)`);
  }
}

await browser.close();
server.close();
console.log("done → tests/conv/out/");
