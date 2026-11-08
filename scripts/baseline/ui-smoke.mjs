/**
 * UI smoke test — screenshots + organize regression through the real UI.
 * Screenshots → /tmp/render/ui/
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = "http://127.0.0.1:3100";
const OUT = "/tmp/render/ui";
mkdirSync(OUT, { recursive: true });
mkdirSync("/tmp/render/ui/mobile", { recursive: true });

const browser = await chromium.launch();

/* ---------- desktop ---------- */
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(BASE, { waitUntil: "networkidle" });
await page.waitForTimeout(600);
await page.screenshot({ path: `${OUT}/home-dark.png` });

// toggle to light
await page.click('button[aria-label="Toggle theme"]');
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/home-light.png` });

// back to dark, open Merge workspace
await page.click('button[aria-label="Toggle theme"]');
await page.waitForTimeout(400);
await page.click('button[aria-label="Merge PDF — Combine files into one"]');
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/workspace-merge.png` });

/* ---------- organize regression: delete/rotate only, NO drag ---------- */
await page.goto(BASE, { waitUntil: "networkidle" });
await page.click('button[aria-label="Organize Pages — Sort, delete, rotate pages"]');
await page.waitForTimeout(400);
await page.setInputFiles('input[type="file"]', "tests/baseline/samples/sample-text.pdf");
// wait for thumbnails to render
await page.waitForSelector('img[alt="Page 1"]', { timeout: 30000 });
await page.waitForTimeout(800);
await page.screenshot({ path: `${OUT}/workspace-organize.png`, fullPage: false });
await page.click('button:has-text("Run Organize Pages")');
await page.waitForSelector('h1:has-text("Done")', { timeout: 60000 });
await page.waitForTimeout(800);
await page.screenshot({ path: `${OUT}/done-organize.png` });
console.log("ORGANIZE-WITHOUT-DRAG: PASS ✓");

/* ---------- design page ---------- */
await page.goto(`${BASE}/design`, { waitUntil: "networkidle" });
await page.waitForTimeout(800);
await page.screenshot({ path: `${OUT}/design-top.png` });
await page.screenshot({ path: `${OUT}/design-full.png`, fullPage: true });
await page.close();

/* ---------- mobile ---------- */
const mob = await browser.newPage({ viewport: { width: 390, height: 844 } });
await mob.goto(BASE, { waitUntil: "networkidle" });
await mob.waitForTimeout(600);
await mob.screenshot({ path: `${OUT}/mobile/home-dark.png` });
await mob.click('button[aria-label="Toggle theme"]');
await mob.waitForTimeout(500);
await mob.screenshot({ path: `${OUT}/mobile/home-light.png` });
await mob.click('button[aria-label="Toggle theme"]');
await mob.waitForTimeout(300);
await mob.click('button[aria-label="Merge PDF — Combine files into one"]');
await mob.waitForTimeout(500);
await mob.screenshot({ path: `${OUT}/mobile/workspace-merge.png` });
await mob.close();

await browser.close();
console.log("screenshots done →", OUT);
