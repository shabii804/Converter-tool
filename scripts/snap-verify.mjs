/**
 * Visual verification: screenshot / and /design at desktop + home at mobile.
 * Output → /tmp/render/*.png (verification only, not a deliverable).
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

mkdirSync("/tmp/render", { recursive: true });
const browser = await chromium.launch();

async function snap(url, file, width, height) {
  const page = await browser.newPage({ viewport: { width, height } });
  await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `/tmp/render/${file}`, fullPage: false });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  console.log(`✓ ${file} (${width}x${height}) errors=${errors.length}`);
  await page.close();
}

await snap("http://localhost:3000/", "home-desktop.png", 1440, 900);
await snap("http://localhost:3000/design", "design-desktop.png", 1440, 900);
await snap("http://localhost:3000/", "home-mobile.png", 390, 844);

await browser.close();
console.log("done");
