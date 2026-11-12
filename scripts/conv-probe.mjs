import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import esbuild from "esbuild";
import { chromium } from "playwright";
const here = "/home/z/my-project/scripts";
const ROOT = "/home/z/my-project/tests/conv";
const stub = { name: "stub", setup(b) { for (const m of ["fs","path","crypto","stream","os","url","http","https","zlib","util","child_process","net","tls","readline","assert"]) b.onResolve({ filter: new RegExp(`^${m}$`) }, () => ({ path: m, namespace: "stub" })); b.onLoad({ filter: /.*/, namespace: "stub" }, () => ({ contents: "module.exports = {};", loader: "js" })); } };
await esbuild.build({ entryPoints: [path.join(here, "conv-probe.src.ts")], bundle: true, format: "iife", platform: "browser", outfile: path.join(ROOT, "probe.js"), define: { "process.env.NODE_ENV": '"production"' }, plugins: [stub], logLevel: "silent" });
const server = http.createServer((req, res) => {
  handle(req, res).catch(() => { if (!res.headersSent) { res.writeHead(404); res.end(); } });
});
async function handle(req, res) {
  let p = new URL(req.url, "http://x").pathname;
  if (p === "/") { res.writeHead(200, {"Content-Type":"text/html"}); res.end('<script src="/probe.js"></script>'); return; }
  const file = p === "/pdf.worker.min.mjs" ? "/home/z/my-project/public/pdf.worker.min.mjs" : path.join(ROOT, p);
  const data = await readFile(file);
  if (res.headersSent) return;
  res.writeHead(200, { "Content-Type": "application/javascript" });
  res.end(data);
}
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const port = server.address().port;
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH });
const page = await browser.newPage();
page.on("pageerror", (e) => console.log("PAGEERROR:", String(e).slice(0, 300)));
await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: "load" });
await page.waitForFunction(() => typeof window.probe === "function", null, { timeout: 30000 });
const b64 = (await readFile(path.join(ROOT, "fixture-report.pdf"))).toString("base64");
const res = await page.evaluate((b) => window.probe(b), b64);
console.log(JSON.stringify(res, null, 1).slice(0, 3800));
await browser.close(); server.close();
process.exit(0);
