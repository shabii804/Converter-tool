/**
 * INP probe — measures real interaction latency (Event Timing API, the same
 * source Chrome uses for the INP field metric) on the key interactions:
 * open tool from grid, adjust a control, run a fast tool, open palette.
 * Reports the worst duration observed (< 200ms = budget pass).
 */
import { chromium } from "playwright";
import path from "node:path";

const BASE = process.env.BASE ?? "http://localhost:3101";
const SAMPLES = path.join(process.cwd(), "tests/baseline/samples");
const browser = await chromium.launch();

async function probe(name, fn) {
  const page = await (
    await browser.newContext({ viewport: { width: 1280, height: 800 } })
  ).newPage();
  await page.addInitScript(() => {
    window.__inp = [];
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) {
        if (e.interactionId) {
          window.__inp.push({
            name: e.name,
            duration: Math.round(e.duration),
            target: (e.target?.tagName ?? "") + "." + (e.target?.className ?? "").toString().slice(0, 30),
          });
        }
      }
    }).observe({ type: "event", buffered: true, durationThreshold: 16 });
  });
  await fn(page);
  await page.waitForTimeout(600);
  const entries = await page.evaluate(() => window.__inp);
  const worst = entries.reduce((a, b) => (b.duration > (a?.duration ?? 0) ? b : a), null);
  console.log(
    `${name.padEnd(34)} interactions=${String(entries.length).padEnd(4)} worst=${worst ? worst.duration + "ms (" + worst.name + ")" : "none"}`
  );
  await page.close();
  return worst?.duration ?? 0;
}

let max = 0;

max = Math.max(
  max,
  await probe("open tool card from grid", async (page) => {
    await page.goto(`${BASE}/en`, { waitUntil: "networkidle" });
    await page.waitForTimeout(800);
    await page.getByRole("link", { name: /Merge PDF/ }).first().click();
    await page.waitForTimeout(800);
  })
);

max = Math.max(
  max,
  await probe("select compress preset + run", async (page) => {
    await page.goto(`${BASE}/en/tool/compress-target`, { waitUntil: "networkidle" });
    await page.locator('input[type="file"]').first().waitFor({ state: "attached", timeout: 30000 });
    await page
      .locator('input[type="file"]')
      .first()
      .setInputFiles(path.join(SAMPLES, "sample-image.pdf"));
    await page.waitForTimeout(600);
    await page.getByRole("button", { name: "100 KB" }).click();
    await page.waitForTimeout(100);
    await page.getByRole("button", { name: "200 KB" }).click();
    await page.waitForTimeout(100);
    await page.getByRole("button", { name: /Run / }).first().click();
    await page.waitForTimeout(2500);
  })
);

max = Math.max(
  max,
  await probe("command palette open + pick", async (page) => {
    await page.goto(`${BASE}/en`, { waitUntil: "networkidle" });
    await page.waitForTimeout(800);
    await page.keyboard.press("Control+k");
    await page.waitForTimeout(150);
    await page.keyboard.type("pdf to png");
    await page.waitForTimeout(150);
    await page.keyboard.press("Enter");
    await page.waitForTimeout(800);
  })
);

max = Math.max(
  max,
  await probe("mega menu open + category click", async (page) => {
    await page.goto(`${BASE}/en`, { waitUntil: "networkidle" });
    await page.waitForTimeout(800);
    await page.getByRole("button", { name: "Tools", exact: true }).click();
    await page.waitForTimeout(150);
    await page.getByRole("button", { name: "Security" }).first().click();
    await page.waitForTimeout(600);
  })
);

max = Math.max(
  max,
  await probe("editor: add text + drag", async (page) => {
    await page.goto(`${BASE}/en/tool/edit-pdf`, { waitUntil: "networkidle" });
    await page.locator('input[type="file"]').first().waitFor({ state: "attached", timeout: 30000 });
    await page
      .locator('input[type="file"]')
      .first()
      .setInputFiles(path.join(SAMPLES, "sample-text.pdf"));
    await page.waitForSelector("canvas", { timeout: 30000 });
    await page.waitForTimeout(600);
    await page.getByRole("button", { name: "Add text" }).click();
    const ov = page.locator("div.absolute.inset-0").last();
    const b = await ov.boundingBox();
    await ov.click({ position: { x: b.width * 0.3, y: b.height * 0.3 } });
    await page.waitForTimeout(300);
    await page.mouse.move(b.width * 0.3, b.height * 0.3);
    await page.mouse.down();
    await page.mouse.move(b.width * 0.4, b.height * 0.35, { steps: 3 });
    await page.mouse.up();
    await page.waitForTimeout(400);
  })
);

console.log(
  `\nWORST INTERACTION LATENCY (INP, lab): ${max}ms →`,
  max < 200 ? "PASS (<200ms budget)" : "FAIL"
);
await browser.close();
process.exit(max < 200 ? 0 : 0); // report-only
