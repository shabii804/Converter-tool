/**
 * Baseline runner — serves the harness + samples, runs all 16 tools in
 * headless Chromium, writes outputs + a metrics report to /tests/baseline/<run>/.
 *
 * Usage: node scripts/baseline/run-baseline.mjs run-1
 */
import http from "node:http";
import { mkdirSync, writeFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import JSZip from "jszip";
import { chromium } from "playwright";

const RUN = process.argv[2] || "run-1";
const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(here, "../../tests/baseline");
const HARNESS_DIR = path.join(ROOT, "harness");
const SAMPLES_DIR = path.join(ROOT, "samples");
const WORKER = path.join(here, "../../public/pdf.worker.min.mjs");
const OUT_DIR = path.join(ROOT, RUN);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".pdf": "application/pdf",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".json": "application/json",
};

mkdirSync(OUT_DIR, { recursive: true });

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://x");
    let p = url.pathname;
    if (p === "/") p = "/index.html";
    let file = null;
    if (p === "/pdf.worker.min.mjs") file = WORKER;
    else if (p.startsWith("/samples/")) file = path.join(SAMPLES_DIR, p.slice(9));
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
server.on("request", (req) => console.log("  [req]", req.url));
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const port = server.address().port;
console.log(`harness served at http://127.0.0.1:${port}`);

const browser = await chromium.launch({
  executablePath:
    process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined,
});
const page = await browser.newPage();
const pageErrors = [];
page.on("pageerror", (e) => pageErrors.push(String(e?.message ?? e)));
page.on("console", (m) => {
  if (m.type() === "error") pageErrors.push(m.text());
});

await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: "load" });
console.log("  [goto done] runAll =", await page.evaluate(() => String(typeof window.runAll)));
await page.waitForFunction(
  () => typeof window.runAll === "function",
  null,
  { timeout: 60000, polling: 250 }
);

const results = await page.evaluate(() => window.runAll());
await browser.close();
server.close();

/* ---------- post-process + persist ---------- */
const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");

for (const [key, run] of Object.entries(results)) {
  if (!run.ok) continue;
  const dir = path.join(OUT_DIR, key);
  mkdirSync(dir, { recursive: true });
  for (const out of run.outputs) {
    const buf = Buffer.from(out.b64, "base64");
    writeFileSync(path.join(dir, out.name), buf);
    out.sha256 = sha256(buf);
    delete out.b64;
    if (out.kind === "DOCX" || out.kind === "XLSX" || out.kind === "PPTX") {
      const zip = await JSZip.loadAsync(buf);
      const entries = {};
      const names = Object.keys(zip.files).filter((n) => !zip.files[n].dir && n !== "docProps/core.xml");
      names.sort();
      for (const n of names) entries[n] = sha256(await zip.files[n].async("nodebuffer"));
      out.zipEntries = entries;
    }
  }
}

const report = {
  run: RUN,
  harness: "scripts/baseline/harness.src.ts → tests/baseline/harness/harness.js (esbuild)",
  engineSource: "src/lib/pdf-engine.ts (unmodified)",
  samples: "tests/baseline/samples (deterministic)",
  chromium: page.context().browser()?.version?.() ?? "unknown",
  pageErrors,
  runs: results,
};
writeFileSync(path.join(OUT_DIR, "report.json"), JSON.stringify(report, null, 2));

/* ---------- console summary ---------- */
let okCount = 0;
let failCount = 0;
console.log("\n=== BASELINE", RUN, "===");
for (const [key, run] of Object.entries(results)) {
  if (run.ok) {
    okCount++;
    const sizes = run.outputs.map((o) => `${o.name} (${(o.size / 1024).toFixed(1)} KB)`).join(", ");
    console.log(`✓ ${key.padEnd(16)} ${run.ms}ms  → ${sizes}`);
  } else {
    failCount++;
    console.log(`✗ ${key.padEnd(16)} ERROR: ${run.error}`);
  }
}
console.log(`\n${okCount} ok, ${failCount} failed. Report → tests/baseline/${RUN}/report.json`);
if (pageErrors.length) console.log("page errors:", pageErrors.slice(0, 5));
process.exit(0);
