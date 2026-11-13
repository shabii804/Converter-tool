/**
 * Image round-trip QA driver — verifies the user-reported bug:
 * "pic i insert gets removed when i convert pdf<->doc".
 * Cases:
 *   1. word-to-pdf on fixture-doc-img.docx      (PNG images inserted in Word)
 *   2. pdf-to-word on fixture-wordexport.pdf    (LibreOffice/Word-style export)
 *   3. pdf-to-word on fixture-image.pdf         (pdf-lib built images)
 * Outputs + pixel coverage of the rendered result page are printed so the
 * image survival can be judged objectively.
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
  entryPoints: [path.join(here, "conv-img-harness.src.ts")],
  bundle: true, format: "iife", platform: "browser",
  outfile: path.join(ROOT, "conv-img-harness.js"),
  define: { "process.env.NODE_ENV": '"production"' },
  plugins: [stubNodeBuiltins], logLevel: "warning",
});

const server = http.createServer(async (req, res) => {
  try {
    let p = new URL(req.url, "http://x").pathname;
    if (p === "/") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end('<!doctype html><html><body><script src="/conv-img-harness.js"></script></body></html>');
      return;
    }
    const file =
      p === "/pdf.worker.min.mjs"
        ? path.join(here, "../public/pdf.worker.min.mjs")
        : path.join(ROOT, p);
    const data = await rf(file);
    res.writeHead(200, {
      "Content-Type": p.endsWith(".js") || p.endsWith(".mjs")
        ? "text/javascript"
        : "application/octet-stream",
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
await page.waitForFunction(() => typeof window.imgTest === "function", null, {
  timeout: 60000, polling: 250,
});

const CASES = [
  {
    id: "word-to-pdf",
    fixture: "fixture-doc-img.docx",
    name: "fixture-doc-img.docx",
    opts: { pageSize: "a4" },
    outName: "img-roundtrip-from-docx.pdf",
  },
  {
    id: "pdf-to-word",
    fixture: "fixture-wordexport.pdf",
    name: "fixture-wordexport.pdf",
    opts: {},
    outName: "img-roundtrip-from-wordexport.docx",
  },
  {
    id: "pdf-to-word",
    fixture: "fixture-image.pdf",
    name: "fixture-image.pdf",
    opts: {},
    outName: "img-roundtrip-from-pdflib.docx",
  },
  /* real-world patterns users actually hit */
  {
    id: "word-to-pdf",
    fixture: "fixture-docx-jpeg.docx",
    name: "fixture-docx-jpeg.docx",
    opts: { pageSize: "a4" },
    outName: "rw-docx-jpeg.pdf",
  },
  {
    id: "word-to-pdf",
    fixture: "fixture-docx-float.docx",
    name: "fixture-docx-float.docx",
    opts: { pageSize: "a4" },
    outName: "rw-docx-float.pdf",
  },
  {
    id: "word-to-pdf",
    fixture: "fixture-docx-table.docx",
    name: "fixture-docx-table.docx",
    opts: { pageSize: "a4" },
    outName: "rw-docx-table.pdf",
  },
  {
    id: "pdf-to-word",
    fixture: "fixture-baseline-jpeg.pdf",
    name: "fixture-baseline-jpeg.pdf",
    opts: {},
    outName: "rw-pdf-baselinejpg.docx",
  },
  {
    id: "pdf-to-word",
    fixture: "fixture-progressive-jpeg.pdf",
    name: "fixture-progressive-jpeg.pdf",
    opts: {},
    outName: "rw-pdf-progressivejpg.docx",
  },
];

for (const c of CASES) {
  const b64 = (await rf(path.join(ROOT, c.fixture))).toString("base64");
  const res = await page.evaluate(
    ({ id, b64, name, opts }) => window.imgTest(id, b64, name, opts),
    { id: c.id, b64, name: c.name, opts: c.opts }
  );
  if (res.b64) {
    writeFileSync(path.join(OUT, c.outName), Buffer.from(res.b64, "base64"));
  }
  console.log(
    `→ ${c.id} [${c.fixture}] out=${res.name} ${res.size} bytes ` +
      (res.imageCoverage
        ? `nonWhite=${res.imageCoverage.nonWhitePct}% colored=${res.imageCoverage.coloredPct}%`
        : "")
  );
}

await browser.close();
server.close();
console.log("done → tests/conv/out/");
