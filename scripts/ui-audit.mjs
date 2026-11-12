/**
 * UI audit — drives every tool through the real browser flow:
 * open tool page -> upload sample -> Run -> capture success/error -> download output.
 * Reports a JSON matrix to /tmp/ui-audit.json.
 */
import { chromium } from "playwright";
import fs from "node:fs";

const BASE = "http://localhost:3000/en/tool";
const S = "tests/baseline/samples";
const OUT_DIR = "/tmp/ui-outputs";
fs.mkdirSync(OUT_DIR, { recursive: true });

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// toolId -> { files: [paths], fill: async (page) => void, minWaitMs }
const PLAN = {
  merge: { files: [`${S}/sample-text.pdf`, `${S}/sample-second.pdf`] },
  split: { files: [`${S}/sample-text.pdf`], fill: async (page) => {
    await page.locator('input[placeholder="1-3, 5, 8-10"]').fill("1-2");
  } },
  compress: { files: [`${S}/sample-image.pdf`] },
  organize: { files: [`${S}/sample-text.pdf`] },
  rotate: { files: [`${S}/sample-text.pdf`] },
  "pdf-to-jpg": { files: [`${S}/sample-text.pdf`] },
  "jpg-to-pdf": { files: [`${S}/sample-photo.jpg`] },
  "pdf-to-word": { files: [`${S}/sample-text.pdf`] },
  "pdf-to-excel": { files: [`${S}/sample-text.pdf`] },
  "pdf-to-ppt": { files: [`${S}/sample-text.pdf`] },
  "word-to-pdf": { files: [`${S}/sample-doc.docx`] },
  watermark: { files: [`${S}/sample-text.pdf`] },
  "page-numbers": { files: [`${S}/sample-text.pdf`] },
  crop: { files: [`${S}/sample-text.pdf`] },
  protect: { files: [`${S}/sample-text.pdf`], fill: async (page) => {
    await page.locator('input[placeholder="At least 4 characters"]').fill("test1234");
    await page.locator('input[placeholder="Repeat password"]').fill("test1234");
  } },
  unlock: { files: [`${S}/sample-encrypted.pdf`], fill: async (page) => {
    const inputs = page.locator("input[type=password]");
    const n = await inputs.count();
    for (let i = 0; i < n; i++) await inputs.nth(i).fill("test1234");
  } },
  "compress-target": { files: [`${S}/sample-image.pdf`] },
  "compress-image": { files: [`${S}/sample-photo.jpg`] },
  "resize-image": { files: [`${S}/sample-photo.jpg`] },
  "convert-image": { files: [`${S}/sample-photo.jpg`] },
  "pdf-to-png": { files: [`${S}/sample-text.pdf`] },
  "extract-images": { files: [`${S}/sample-image.pdf`] },
  "extract-text": { files: [`${S}/sample-text.pdf`] },
  "text-to-pdf": { files: [], fill: async (page) => {
    const ta = page.locator("textarea").first();
    await ta.fill("Hello SwiftPDF.\nThis is a UI audit test with a few lines of text to make sure the tool works end to end.");
  } },
};

const results = {};
const consoleErrors = {};

const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH,
});
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });

for (const [tool, plan] of Object.entries(PLAN)) {
  const page = await ctx.newPage();
  const errs = [];
  page.on("console", (m) => { if (m.type() === "error") errs.push(m.text().slice(0, 300)); });
  page.on("pageerror", (e) => errs.push(String(e).slice(0, 300)));
  const entry = { ok: false, note: "", output: null, errors: [] };
  try {
    await page.goto(`${BASE}/${tool}`, { waitUntil: "networkidle", timeout: 45000 });
    await wait(600);

    if (plan.files.length) {
      const input = page.locator('input[type="file"]').first();
      await input.setInputFiles(plan.files);
      await wait(900);
    }
    if (plan.fill) await plan.fill(page);

    // click the Run button (text starts with "Run ")
    const runBtn = page.locator("button", { hasText: /^Run / }).first();
    if (!(await runBtn.isVisible().catch(() => false)) || !(await runBtn.isEnabled().catch(() => false))) {
      entry.note = "run button missing/disabled";
    } else {
      await runBtn.click();
      // wait for done view or error toast (max 60s)
      const done = page.getByText(/Download (all|JPG|PNG|PDF|XLSX|DOCX|PPTX|TXT)/i).first();
      const toast = page.locator('[data-sonner-toast]').first();
      const res = await Promise.race([
        page.locator('button:has-text("Download")').first().waitFor({ state: "visible", timeout: 60000 }).then(() => "done"),
        toast.waitFor({ state: "visible", timeout: 60000 }).then(() => "toast"),
      ]).catch(() => "timeout");
      if (res === "done") {
        entry.ok = true;
        // try to capture the note line
        const note = await page.locator("text=/Saved|pages|image|slide|placed|stamped|Numbers|Crop|Password|Lossless|KB|converted|Resized|Re-encoded|extracted/i").first().textContent({ timeout: 3000 }).catch(() => "");
        entry.note = (note || "").slice(0, 140);
        // download first output
        const dl = page.locator("button", { hasText: /^Download / }).first();
        if (await dl.isVisible().catch(() => false)) {
          try {
            const [download] = await Promise.all([page.waitForEvent("download", { timeout: 15000 }), dl.click()]);
            const path = `${OUT_DIR}/${tool}-${download.suggestedFilename()}`;
            await download.saveAs(path);
            entry.output = path;
          } catch (e) { entry.note += " (download failed: " + String(e).slice(0, 80) + ")"; }
        }
      } else if (res === "toast") {
        entry.note = (await toast.textContent().catch(() => "")) || "error toast";
      } else {
        entry.note = "neither done view nor toast appeared in 60s";
      }
    }
  } catch (e) {
    entry.note = "EXCEPTION: " + String(e).slice(0, 200);
  }
  entry.errors = [...new Set(errs)].slice(0, 5);
  results[tool] = entry;
  console.log(`${entry.ok ? "OK  " : "FAIL"} ${tool.padEnd(16)} ${entry.note.slice(0, 110)}`);
  await page.close();
}

await browser.close();
fs.writeFileSync("/tmp/ui-audit.json", JSON.stringify(results, null, 2));
console.log("\nwritten /tmp/ui-audit.json");
