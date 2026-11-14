/**
 * Asset generator — produces REAL images only:
 *  - PWA icons from the actual logo (sharp)
 *  - og.png from a real screenshot of the homepage
 *  - blog screenshots of the actual tools performing each article's job
 * Usage: BASE=http://localhost:3101 node scripts/gen-assets.mjs
 */
import sharp from "sharp";
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

/** ONLY=brand → PWA icons + og.png only (skip the blog flow screenshots). */
const BRAND_ONLY = process.env.ONLY === "brand";
const BASE = process.env.BASE ?? "http://localhost:3101";
const SAMPLES = path.join(process.cwd(), "tests/baseline/samples");
const BLOG = path.join(process.cwd(), "public/blog");
const SHOTS = path.join(process.cwd(), "tests/lighthouse/shots");
mkdirSync(BLOG, { recursive: true });
mkdirSync(SHOTS, { recursive: true });

/* ---------- 1. PWA icons from the real logo ----------
 * Single source of truth: the SVG brand files themselves.
 *   public/logo.svg           → rounded badge (regular icons)
 *   public/logo-fullbleed.svg → edge-to-edge art inside the maskable safe zone
 */

const LOGO = path.join(process.cwd(), "public/logo.svg");
const LOGO_FULLBLEED = path.join(process.cwd(), "public/logo-fullbleed.svg");

async function makeIcon(size, file, { maskable = false } = {}) {
  const src = await readFile(maskable ? LOGO_FULLBLEED : LOGO, "utf8");
  await sharp(Buffer.from(src), { density: Math.round((72 * size) / 32) })
    .resize(size, size)
    .png()
    .toFile(path.join(process.cwd(), "public", file));
  console.log("icon:", file);
}

/** /favicon.ico — real ICO container (PNG-compressed entry, Vista+ spec) from the logo
 * Uses the simplified small-size mark (logo-small.svg): favicon renders at 16–32px,
 * where the full artwork's fine detail (text lines, thin strokes) turns to noise. */
const LOGO_SMALL = path.join(process.cwd(), "public/logo-small.svg");
async function makeFavicon() {
  const src = await readFile(LOGO_SMALL, "utf8");
  const png = await sharp(Buffer.from(src), { density: 72 }).resize(32, 32).png().toBuffer();
  const header = Buffer.alloc(6); // ICONDIR: reserved, type=icon, count=1
  header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(1, 4);
  const entry = Buffer.alloc(16); // ICONDIRENTRY: 32×32, PNG data at offset 22
  entry.writeUInt8(32, 0); entry.writeUInt8(32, 1); entry.writeUInt16LE(1, 4);
  entry.writeUInt16LE(32, 6); entry.writeUInt32LE(png.length, 8); entry.writeUInt32LE(22, 12);
  const ico = Buffer.concat([header, entry, png]);
  await writeFile(path.join(process.cwd(), "public/favicon.ico"), ico);
  await writeFile(path.join(process.cwd(), "src/app/favicon.ico"), ico);
  console.log("icon: favicon.ico (public + src/app)");
}

/* ---------- 2. og.png — real homepage screenshot ---------- */

async function makeOg(page) {
  await page.goto(`${BASE}/en`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(SHOTS, "og-raw.png") });
  await sharp(path.join(SHOTS, "og-raw.png"))
    .resize(1200, 630, { fit: "cover", position: "top" })
    .png()
    .toFile(path.join(process.cwd(), "public/og.png"));
  console.log("og.png generated");
}

/* ---------- 3. blog screenshots — real tool flows ---------- */

const step = (m) => console.log("  [step]", m);
const shot = (page, name) => {
  step(name);
  return page.screenshot({ path: path.join(BLOG, name) });
};

async function addFile(page, name) {
  const fileAdded = await page
    .getByText(name, { exact: false })
    .first()
    .isVisible()
    .catch(() => false);
  if (fileAdded) return; // already there from an earlier pass
  // the tool view always exposes exactly one file input once hydrated
  await page
    .locator('input[type="file"]')
    .first()
    .waitFor({ state: "attached", timeout: 60000 });
  await page
    .locator('input[type="file"]')
    .first()
    .setInputFiles(path.join(SAMPLES, name), { timeout: 30000 });
  await page.waitForTimeout(700);
}

async function runAndDone(page) {
  await page.getByRole("button", { name: /Run / }).first().click();
  await page.waitForSelector("text=Download", { timeout: 60000 });
  await page.waitForTimeout(400);
}

async function blogShots(browser) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.log("  PAGEERROR:", String(e).slice(0, 250)));

  // merge
  await page.goto(`${BASE}/en/tool/merge`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  step(`url=${page.url()} inputs=${await page.locator('input[type=file]').count()} h1=${(await page.locator('h1').allTextContents()).join('|')}`);
  await addFile(page, "sample-text.pdf");
  await addFile(page, "sample-second.pdf");
  await page.waitForTimeout(300);
  await shot(page, "merge-1-files.png");
  await runAndDone(page);
  await shot(page, "merge-2-result.png");

  // compress-target
  await page.goto(`${BASE}/en/tool/compress-target`, { waitUntil: "networkidle" });
  await addFile(page, "sample-image.pdf");
  await page.getByRole("button", { name: "100 KB" }).click();
  await page.waitForTimeout(200);
  await shot(page, "compress-1-target.png");
  // run with custom 20KB so the honest "reached" note shows real numbers
  await page.getByLabel("Custom target size in KB").fill("20");
  await runAndDone(page);
  await shot(page, "compress-2-done.png");

  // sign
  await page.goto(`${BASE}/en/tool/sign-pdf`, { waitUntil: "networkidle" });
  await addFile(page, "sample-text.pdf");
  await page.waitForSelector("canvas", { timeout: 30000 });
  await page.waitForTimeout(700);
  await page.getByRole("button", { name: "Add signature" }).click();
  await page.waitForTimeout(400);
  await shot(page, "sign-1-modal.png");
  await page.getByRole("tab", { name: "Type" }).click();
  await page.getByLabel("Type your name").fill("Alex Jordan");
  await page.waitForTimeout(400);
  await page.getByRole("button", { name: "Place signature" }).click();
  await page.waitForTimeout(500);
  await shot(page, "sign-2-placed.png");

  // redact
  await page.goto(`${BASE}/en/tool/redact-pdf`, { waitUntil: "networkidle" });
  await addFile(page, "sample-text.pdf");
  await page.waitForSelector("canvas", { timeout: 30000 });
  await page.waitForTimeout(700);
  const ro = page.locator("div.absolute.inset-0").last();
  const rb = await ro.boundingBox();
  await page.mouse.move(rb.x + rb.width * 0.08, rb.y + rb.height * 0.08);
  await page.mouse.down();
  await page.mouse.move(rb.x + rb.width * 0.7, rb.y + rb.height * 0.17, { steps: 4 });
  await page.mouse.up();
  await page.waitForTimeout(400);
  await shot(page, "redact-1-boxes.png");
  const warn = page.getByText("Redaction is permanent").first();
  await warn.scrollIntoViewIfNeeded();
  await page.waitForTimeout(200);
  await shot(page, "redact-2-warning.png");

  // extract text
  await page.goto(`${BASE}/en/tool/extract-text`, { waitUntil: "networkidle" });
  await addFile(page, "sample-text.pdf");
  await shot(page, "extract-text-1.png");
  await runAndDone(page);
  await shot(page, "extract-text-2-result.png");

  // convert image
  await page.goto(`${BASE}/en/tool/convert-image`, { waitUntil: "networkidle" });
  await addFile(page, "sample-photo.jpg");
  await shot(page, "convert-1-panel.png");
  await runAndDone(page);
  await shot(page, "convert-2-done.png");

  // unlock
  await page.goto(`${BASE}/en/tool/unlock`, { waitUntil: "networkidle" });
  await addFile(page, "sample-encrypted.pdf");
  await page.getByPlaceholder("The password you already know").fill("test1234");
  await page.waitForTimeout(200);
  await shot(page, "unlock-1.png");
  await runAndDone(page);
  await shot(page, "unlock-2-done.png");

  // edit
  await page.goto(`${BASE}/en/tool/edit-pdf`, { waitUntil: "networkidle" });
  await addFile(page, "sample-text.pdf");
  await page.waitForSelector("canvas", { timeout: 30000 });
  await page.waitForTimeout(700);
  await page.getByRole("button", { name: "Add text" }).click();
  const ov = page.locator("div.absolute.inset-0").last();
  const ob = await ov.boundingBox();
  await ov.click({ position: { x: ob.width * 0.25, y: ob.height * 0.3 } });
  await page.waitForTimeout(400);
  await shot(page, "edit-1-editor.png");
  // inspector visible with the selected text item
  await page.evaluate(() => {
    const ta = document.getElementById("ann-text");
    if (ta) ta.closest("section")?.scrollIntoView();
  });
  await page.waitForTimeout(200);
  await shot(page, "edit-2-inspector.png");

  await ctx.close();
}

/* ---------- run ---------- */

await makeIcon(192, "icon-192.png");
await makeIcon(512, "icon-512.png");
await makeIcon(192, "icon-maskable-192.png", { maskable: true });
await makeIcon(512, "icon-maskable-512.png", { maskable: true });
await makeIcon(180, "apple-touch-icon.png");
await makeFavicon();

const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined,
});
if (process.env.SKIP_OG !== "1") {
  const ctx = await browser.newContext({ viewport: { width: 1200, height: 630 } });
  const page = await ctx.newPage();
  await makeOg(page);
  await ctx.close();
} else {
  console.log("og skipped (SKIP_OG=1)");
}
if (!BRAND_ONLY) {
  await blogShots(browser);
}
await browser.close();
console.log(BRAND_ONLY ? "brand assets generated" : "all assets generated");
