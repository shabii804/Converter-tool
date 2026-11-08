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
import path from "node:path";

const BASE = process.env.BASE ?? "http://localhost:3101";
const SAMPLES = path.join(process.cwd(), "tests/baseline/samples");
const BLOG = path.join(process.cwd(), "public/blog");
const SHOTS = path.join(process.cwd(), "tests/lighthouse/shots");
mkdirSync(BLOG, { recursive: true });
mkdirSync(SHOTS, { recursive: true });

/* ---------- 1. PWA icons from the real logo ---------- */

const LOGO = path.join(process.cwd(), "public/logo.svg");

async function makeIcon(size, file, { maskable = false } = {}) {
  const pad = maskable ? Math.round(size * 0.18) : Math.round(size * 0.08);
  const inner = size - pad * 2;
  const svg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${size}" height="${size}" rx="${maskable ? 0 : Math.round(size * 0.22)}" fill="#0b0f1a"/>
    <g transform="translate(${pad}, ${pad}) scale(${inner / 30})">
      <rect x="0" y="0" width="30" height="30" rx="7" fill="#2D2D2D" stroke="#FFFFFF" stroke-width="0.6317"/>
      <path d="M15.47,7.1l-1.3,1.85c-0.2,0.29-0.54,0.47-0.9,0.47h-7.1V7.09C6.16,7.1,15.47,7.1,15.47,7.1z" fill="#FFFFFF"/>
      <polygon points="24.3,7.1 13.14,22.91 5.7,22.91 16.86,7.1" fill="#FFFFFF"/>
      <path d="M14.53,22.91l1.31-1.86c0.2-0.29,0.54-0.47,0.9-0.47h7.09v2.33H14.53z" fill="#FFFFFF"/>
    </g>
  </svg>`;
  await sharp(Buffer.from(svg)).png().toFile(path.join(process.cwd(), "public", file));
  console.log("icon:", file);
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

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1200, height: 630 } });
const page = await ctx.newPage();
await makeOg(page);
await ctx.close();
await blogShots(browser);
await browser.close();
console.log("all assets generated");
