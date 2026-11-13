/**
 * Probe: what does pdf.js deliver for a DCTDecode JPEG image under
 * getOperatorList()? Dumps image op args + resolved object shape.
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
    const mods = ["fs","path","crypto","stream","os","url","http","https","zlib","util","child_process","net","tls","readline","assert"];
    for (const m of mods) {
      build.onResolve({ filter: new RegExp(`^${m}$`) }, () => ({ path: m, namespace: "stub" }));
    }
    build.onLoad({ filter: /.*/, namespace: "stub" }, () => ({ contents: "module.exports = {};", loader: "js" }));
  },
};
await esbuild.build({
  entryPoints: [path.join(here, "img-probe.src.ts")],
  bundle: true, format: "iife", platform: "browser",
  outfile: path.join(ROOT, "img-probe.js"),
  define: { "process.env.NODE_ENV": '"production"' },
  plugins: [stubNodeBuiltins], logLevel: "warning",
});

const server = http.createServer(async (req, res) => {
  try {
    const p = new URL(req.url, "http://x").pathname;
    if (p === "/") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end('<!doctype html><html><body><script src="/img-probe.js"></script></body></html>');
      return;
    }
    const file = p === "/pdf.worker.min.mjs"
      ? path.join(here, "../public/pdf.worker.min.mjs")
      : path.join(ROOT, p);
    const data = await rf(file);
    res.writeHead(200, {
      "Content-Type": p.endsWith(".js") || p.endsWith(".mjs") ? "text/javascript" : "application/octet-stream",
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
page.on("console", (m) => {
  if (m.text().startsWith("[probe]")) console.log(m.text());
});
await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: "load" });
await page.waitForFunction(() => typeof window.probe === "function", null, { timeout: 60000, polling: 250 });

for (const f of ["fixture-baseline-jpeg.pdf", "fixture-image.pdf"]) {
  const res = await page.evaluate(async (name) => {
    const buf = await (await fetch("/" + name)).arrayBuffer();
    return await window.probe(new Uint8Array(buf));
  }, f);
  console.log(`--- ${f} ---`);
  console.log(JSON.stringify(res.rects, null, 1).slice(0, 2400));
  console.log("image ops histogram:", Object.fromEntries(
    Object.entries(res.opHistogram).filter(([k]) => /image|jpeg|mask/i.test(k))
  ));
}

await browser.close();
server.close();
