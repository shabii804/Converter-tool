import { chromium } from "playwright";
import path from "node:path";
const BASE = "http://localhost:3101";
const SAMPLES = path.join(process.cwd(), "tests/baseline/samples");
const SHOTS = path.join(process.cwd(), "tests/toolcheck/screens");
const browser = await chromium.launch();

const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

// edit-pdf with a file loaded + text placed
await page.goto(`${BASE}/tool/edit-pdf`, { waitUntil: "networkidle" });
await page.locator('input[type="file"]').first().setInputFiles(path.join(SAMPLES, "sample-text.pdf"));
await page.waitForSelector("canvas", { timeout: 30000 });
await page.waitForTimeout(800);
await page.getByRole("button", { name: "Add text" }).click();
const overlay = page.locator("div.absolute.inset-0").last();
const b = await overlay.boundingBox();
await overlay.click({ position: { x: b.width * 0.25, y: b.height * 0.3 } });
await page.waitForTimeout(400);
await page.screenshot({ path: path.join(SHOTS, "prod-edit-pdf.png") });

// text-to-pdf desktop
await page.goto(`${BASE}/tool/text-to-pdf`, { waitUntil: "networkidle" });
await page.locator("textarea").first().fill("Production visual check — SwiftPDF Text to PDF.");
await page.waitForTimeout(300);
await page.screenshot({ path: path.join(SHOTS, "prod-text-to-pdf.png") });

// compress-target desktop
await page.goto(`${BASE}/tool/compress-target`, { waitUntil: "networkidle" });
await page.screenshot({ path: path.join(SHOTS, "prod-compress-target.png") });

// redact with a box drawn
await page.goto(`${BASE}/tool/redact-pdf`, { waitUntil: "networkidle" });
await page.locator('input[type="file"]').first().setInputFiles(path.join(SAMPLES, "sample-text.pdf"));
await page.waitForSelector("canvas", { timeout: 30000 });
await page.waitForTimeout(800);
const ro = page.locator("div.absolute.inset-0").last();
const rb = await ro.boundingBox();
await page.mouse.move(rb.x + rb.width * 0.1, rb.y + rb.height * 0.08);
await page.mouse.down();
await page.mouse.move(rb.x + rb.width * 0.6, rb.y + rb.height * 0.18, { steps: 4 });
await page.mouse.up();
await page.waitForTimeout(300);
await page.screenshot({ path: path.join(SHOTS, "prod-redact.png") });
await ctx.close();

// mobile 360: sign-pdf editor + text-to-pdf
const mctx = await browser.newContext({ viewport: { width: 360, height: 800 } });
const mpage = await mctx.newPage();
await mpage.goto(`${BASE}/tool/text-to-pdf`, { waitUntil: "networkidle" });
await mpage.screenshot({ path: path.join(SHOTS, "prod-mobile-text-to-pdf.png") });
await mpage.goto(`${BASE}/tool/edit-pdf`, { waitUntil: "networkidle" });
await mpage.locator('input[type="file"]').first().setInputFiles(path.join(SAMPLES, "sample-text.pdf"));
await mpage.waitForSelector("canvas", { timeout: 30000 });
await mpage.waitForTimeout(1000);
await mpage.screenshot({ path: path.join(SHOTS, "prod-mobile-edit-pdf.png") });
await mctx.close();
await browser.close();
console.log("shots saved");
