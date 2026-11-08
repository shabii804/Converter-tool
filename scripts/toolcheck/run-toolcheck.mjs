/**
 * Toolcheck runner — serves the harness + samples + fonts, runs every
 * Tier-1 engine test in headless Chromium, writes report.json and prints
 * a pass/fail summary. Exits 1 if any test fails.
 */
import http from "node:http";
import { mkdirSync, writeFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(here, "../../tests/toolcheck");
const HARNESS_DIR = path.join(ROOT, "harness");
const SAMPLES_DIR = path.join(here, "../../tests/baseline/samples");
const WORKER = path.join(here, "../../public/pdf.worker.min.mjs");
const FONT_DIR = "/usr/share/fonts/truetype/chinese";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".pdf": "application/pdf",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".ttf": "font/ttf",
  ".json": "application/json",
};

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://x");
    let p = url.pathname;
    if (p === "/") p = "/index.html";
    let file = null;
    if (p === "/pdf.worker.min.mjs") file = WORKER;
    else if (p.startsWith("/samples/")) file = path.join(SAMPLES_DIR, p.slice(9));
    else if (p.startsWith("/fonts/")) file = path.join(FONT_DIR, p.slice(7));
    else file = path.join(HARNESS_DIR, p);
    const data = await readFile(file);
    res.writeHead(200, {
      "Content-Type": MIME[path.extname(file)] ?? "application/octet-stream",
      "Cache-Control": "no-store",
    });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end("not found");
  }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const port = server.address().port;
console.log(`toolcheck harness at http://127.0.0.1:${port}`);

const browser = await chromium.launch();
const page = await browser.newPage();
const pageErrors = [];
page.on("pageerror", (e) => pageErrors.push(String(e?.message ?? e)));
page.on("console", (m) => {
  if (m.type() === "error" && !/favicon/.test(m.text())) pageErrors.push(m.text());
});

await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: "load" });
await page.waitForFunction(() => typeof window.runAll === "function", null, {
  timeout: 60000,
  polling: 250,
});

const results = await page.evaluate(() => window.runAll());
await browser.close();
server.close();

mkdirSync(ROOT, { recursive: true });
writeFileSync(
  path.join(ROOT, "report.json"),
  JSON.stringify({ results, pageErrors }, null, 2)
);

let pass = 0;
let fail = 0;
console.log("\n=== TOOLCHECK RESULTS ===");
for (const [key, r] of Object.entries(results)) {
  if (r.ok) {
    pass++;
    console.log(`✓ ${key.padEnd(58)} ${r.ms}ms  ${r.detail ?? ""}`);
  } else {
    fail++;
    console.log(`✗ ${key.padEnd(58)} ${r.error}`);
  }
}
console.log(`\n${pass} passed, ${fail} failed → tests/toolcheck/report.json`);
if (pageErrors.length) console.log("page errors:", pageErrors.slice(0, 8));
process.exit(fail > 0 ? 1 : 0);
