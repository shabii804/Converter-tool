/**
 * Image-probe driver — serves the probe harness to headless Chromium and
 * prints the op-list rects for known pdf-lib image placements.
 */
import http from "node:http";
import { readFile as rf } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import esbuild from "esbuild";
import { chromium } from "playwright";

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(here, "../tests/conv");

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
  entryPoints: [path.join(here, "img-probe.src.ts")],
  bundle: true, format: "iife", platform: "browser",
  outfile: path.join(ROOT, "conv-harness.js"),
  define: { "process.env.NODE_ENV": '"production"' },
  plugins: [stubNodeBuiltins], logLevel: "warning",
});

const server = http.createServer(async (req, res) => {
  try {
    const p = new URL(req.url, "http://x").pathname;
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
    const type = p.endsWith(".mjs")
      ? "text/javascript; charset=utf-8"
      : p.endsWith(".html")
        ? "text/html; charset=utf-8"
        : "application/octet-stream";
    res.writeHead(200, { "Cache-Control": "no-store", "Content-Type": type });
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
page.on("console", (m) => {
  if (m.text().startsWith("[status]")) console.log(m.text());
});
await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: "load" });
await page.waitForFunction(() => typeof window.probeFile === "function", null, {
  timeout: 60000, polling: 250,
});

const res = await page.evaluate(() => window.probeFile("/fixture-report.pdf"));
console.log(JSON.stringify(res, null, 2));
await browser.close();
server.close();
