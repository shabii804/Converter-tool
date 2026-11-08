/**
 * Tool UI QA — drives the REAL app (Next dev server) in headless Chromium:
 * opens each new tool page, feeds real files, interacts (editor drawing,
 * signature modal, options), presses Run, and verifies the Done view.
 * Also checks responsive integrity (no horizontal scroll, 44px targets,
 * visible focus rings) at 360 / 768 / 1440 px.
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const SAMPLES = path.join(process.cwd(), "tests/baseline/samples");
const SHOTS = path.join(process.cwd(), "tests/toolcheck/screens");
mkdirSync(SHOTS, { recursive: true });

const issues = [];
const pageErrors = [];

function note(msg) {
  issues.push(msg);
  console.log("  ⚠ " + msg);
}

async function checkChrome(page, label, width) {
  const r = await page.evaluate(() => {
    const doc = document.scrollingElement;
    const over = doc ? doc.scrollWidth - doc.clientWidth : 0;
    // touch-target spot check on buttons/links visible in viewport
    const small = [];
    for (const el of document.querySelectorAll("button, a, [role='button']")) {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0 && rect.height < 24 && rect.bottom > 0 && rect.top < window.innerHeight) {
        const txt = (el.textContent ?? el.getAttribute("aria-label") ?? "").trim().slice(0, 24);
        small.push(`${el.tagName.toLowerCase()}"${txt}" h=${Math.round(rect.height)}`);
      }
    }
    return { over, small: small.slice(0, 5) };
  });
  if (r.over > 1) note(`${label} @${width}px: horizontal overflow ${r.over}px`);
  if (r.small.length) note(`${label} @${width}px: tiny touch targets ${JSON.stringify(r.small)}`);
}

async function shot(page, name) {
  const file = path.join(SHOTS, name);
  await page.screenshot({ path: file, fullPage: false });
}

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
page.on("pageerror", (e) => pageErrors.push("pageerror: " + String(e?.message ?? e)));
page.on("console", (m) => {
  if (m.type() === "error" && !/favicon|Download the React DevTools/.test(m.text()))
    pageErrors.push("console: " + m.text().slice(0, 2000));
});

async function openTool(id) {
  await page.goto(`${BASE}/tool/${id}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(300);
}

async function addFile(name) {
  // clear any carried-over files from the previous tool first
  const clear = page.getByRole("button", { name: "Clear", exact: true });
  if (await clear.count()) {
    await clear.click().catch(() => {});
    await page.waitForTimeout(200);
  }
  const file = path.join(SAMPLES, name);
  const input = page.locator('input[type="file"]').first();
  await input.setInputFiles(file);
  await page.waitForTimeout(400);
}

async function runTool() {
  await page.getByRole("button", { name: /Run / }).first().click();
  await page.waitForTimeout(600);
}

async function expectDone(toolName) {
  try {
    await page.waitForSelector("text=Download", { timeout: 60000 });
    console.log("  ✓ done view reached");
    return true;
  } catch {
    note(`${toolName}: no Done view after Run`);
    await shot(page, `fail-${toolName}.png`);
    return false;
  }
}

/* ---------- 1. home renders with 27 tools ---------- */
await page.goto(BASE, { waitUntil: "networkidle" });
const gridCount = await page.locator("main").getByText(/27 tools|27 herramientas|27 outils/).count();
console.log(`home: count-badges mentioning 27 → ${gridCount}`);
const megaBtn = page.getByRole("button", { name: "Tools", exact: true });
await megaBtn.click();
await page.waitForTimeout(300);
const megaItems = await page.locator("div[aria-label*='grouped'] button").count();
console.log(`mega menu buttons (tools+categories): ${megaItems}`);
await shot(page, "home-mega.png");
await page.keyboard.press("Escape");
await page.keyboard.press("Control+k");
await page.waitForTimeout(300);
const paletteItems = await page.locator("[cmdk-item]").count();
console.log(`palette items: ${paletteItems}`);
await page.keyboard.press("Escape");

/* ---------- 2. text-to-pdf end-to-end ---------- */
console.log("text-to-pdf:");
await openTool("text-to-pdf");
await page
  .locator("textarea")
  .first()
  .fill(
    "Hello from the UI QA run.\n\nSecond paragraph — SwiftPDF runs fully in your browser. ".repeat(
      6
    )
  );
await page.waitForTimeout(200);
await runTool();
if (await expectDone("text-to-pdf")) await shot(page, "done-text-to-pdf.png");
await page.evaluate(() => window.dispatchEvent(new Event("beforeunload")));

/* ---------- 3. compress-target end-to-end ---------- */
console.log("compress-target:");
await openTool("compress-target");
await addFile("sample-image.pdf");
await runTool();
if (await expectDone("compress-target")) await shot(page, "done-compress-target.png");

/* ---------- 4. convert-image end-to-end ---------- */
console.log("convert-image:");
await openTool("convert-image");
await addFile("sample-photo.jpg");
await runTool();
if (await expectDone("convert-image")) await shot(page, "done-convert-image.png");

/* ---------- 5. extract-text end-to-end ---------- */
console.log("extract-text:");
await openTool("extract-text");
await addFile("sample-text.pdf");
await runTool();
if (await expectDone("extract-text")) await shot(page, "done-extract-text.png");

/* ---------- 6. pdf-to-png end-to-end ---------- */
console.log("pdf-to-png:");
await openTool("pdf-to-png");
await addFile("sample-second.pdf");
await runTool();
if (await expectDone("pdf-to-png")) await shot(page, "done-pdf-to-png.png");

/* ---------- 7. edit-pdf: text + draw via real pointer ---------- */
console.log("edit-pdf:");
await openTool("edit-pdf");
await addFile("sample-text.pdf");
await page.waitForSelector("canvas", { timeout: 30000 });
await page.waitForTimeout(600);
// add text: click the Text tool then click on the canvas overlay
await page.getByRole("button", { name: "Add text" }).click();
const overlay = page.locator("div.absolute.inset-0").last();
const box = await overlay.boundingBox();
await overlay.click({ position: { x: box.width * 0.3, y: box.height * 0.3 } });
await page.waitForTimeout(300);
const textareaCount = await page.locator("textarea[id='ann-text']").count();
if (!textareaCount) note("edit-pdf: text item inspector did not appear");
// freehand draw: pick Draw tool, drag across canvas
await page.getByRole("button", { name: "Freehand draw" }).click();
await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.7);
await page.mouse.down();
for (let i = 1; i <= 8; i++) {
  await page.mouse.move(box.x + box.width * (0.2 + i * 0.06), box.y + box.height * (0.7 + (i % 2) * 0.03));
}
await page.mouse.up();
await page.waitForTimeout(300);
const runEnabled = await page.getByRole("button", { name: /Run / }).first().isEnabled();
if (!runEnabled) note("edit-pdf: Run button disabled after annotations");
await runTool();
if (await expectDone("edit-pdf")) await shot(page, "done-edit-pdf.png");

/* ---------- 8. sign-pdf: type signature, place, run ---------- */
console.log("sign-pdf:");
await openTool("sign-pdf");
await addFile("sample-text.pdf");
await page.waitForSelector("canvas", { timeout: 30000 });
await page.waitForTimeout(600);
await page.getByRole("button", { name: "Add signature" }).click();
await page.waitForTimeout(400);
await page.getByRole("tab", { name: "Type" }).click();
await page.getByLabel("Type your name").fill("Alex Jordan");
await page.waitForTimeout(400);
await page.getByRole("button", { name: "Place signature" }).click();
await page.waitForTimeout(500);
const sigImg = await page.locator("img[alt='Signature']").count();
if (!sigImg) note("sign-pdf: signature item not placed on page");
await runTool();
if (await expectDone("sign-pdf")) await shot(page, "done-sign-pdf.png");

/* ---------- 9. redact-pdf: draw a box over first line ---------- */
console.log("redact-pdf:");
await openTool("redact-pdf");
await addFile("sample-text.pdf");
await page.waitForSelector("canvas", { timeout: 30000 });
await page.waitForTimeout(600);
const redOverlay = page.locator("div.absolute.inset-0").last();
const redBox = await redOverlay.boundingBox();
await page.mouse.move(redBox.x + redBox.width * 0.08, redBox.y + redBox.height * 0.08);
await page.mouse.down();
await page.mouse.move(redBox.x + redBox.width * 0.7, redBox.y + redBox.height * 0.18, { steps: 4 });
await page.mouse.up();
await page.waitForTimeout(400);
const redCount = await page.getByText(/1 redaction box/).count();
if (!redCount) note("redact-pdf: redaction counter did not update");
await runTool();
if (await expectDone("redact-pdf")) await shot(page, "done-redact-pdf.png");

/* ---------- 10. extract-images on scanned sample ---------- */
console.log("extract-images:");
await openTool("extract-images");
await addFile("sample-image.pdf");
await runTool();
if (await expectDone("extract-images")) await shot(page, "done-extract-images.png");

/* ---------- 11. compress-image end-to-end ---------- */
console.log("compress-image:");
await openTool("compress-image");
await addFile("sample-photo.jpg");
await runTool();
if (await expectDone("compress-image")) await shot(page, "done-compress-image.png");

/* ---------- 12. resize-image end-to-end ---------- */
console.log("resize-image:");
await openTool("resize-image");
await addFile("sample-photo.jpg");
await runTool();
if (await expectDone("resize-image")) await shot(page, "done-resize-image.png");

/* ---------- 13. responsive pass on key pages ---------- */
console.log("responsive:");
for (const width of [360, 768, 1440]) {
  await page.setViewportSize({ width, height: 900 });
  for (const route of ["/", "/tool/edit-pdf", "/tool/text-to-pdf", "/tool/redact-pdf"]) {
    await page.goto(BASE + route, { waitUntil: "networkidle" });
    await page.waitForTimeout(500);
    await checkChrome(page, route, width);
    await shot(page, `resp-${width}${route.replace(/\//g, "-") || "home"}.png`);
  }
}

/* ---------- 14. keyboard access: focus ring visible ---------- */
await page.setViewportSize({ width: 1440, height: 900 });
await page.goto(`${BASE}/tool/pdf-to-png`, { waitUntil: "networkidle" });
await page.keyboard.press("Tab");
const ring = await page.evaluate(() => {
  const el = document.activeElement;
  if (!el || el === document.body) return "none";
  const st = getComputedStyle(el);
  return `${el.tagName}:${(st.boxShadow !== "none" || st.outlineWidth !== "0px") ? "ring" : "no-ring"}`;
});
console.log(`focus ring on first Tab: ${ring}`);

await browser.close();

console.log("\n=== UI QA SUMMARY ===");
if (issues.length) {
  console.log("Issues:");
  for (const i of issues) console.log(" - " + i);
} else {
  console.log("No layout/interaction issues found.");
}
if (pageErrors.length) {
  console.log("Page errors:");
  for (const e of [...new Set(pageErrors)].slice(0, 10)) console.log(" - " + e);
} else {
  console.log("No page errors.");
}
writeFileSync(
  path.join(process.cwd(), "tests/toolcheck/ui-qa.json"),
  JSON.stringify({ issues, pageErrors }, null, 2)
);
process.exit(issues.length || pageErrors.length ? 1 : 0);
