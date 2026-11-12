import { chromium } from "playwright";

// hammer fast tools: each must reach the done view (Download button) —
// with the old AnimatePresence(mode=wait) these intermittently hung at 100%
const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH,
});
const tools = [
  { id: "rotate", files: ["tests/baseline/samples/sample-text.pdf"] },
  { id: "page-numbers", files: ["tests/baseline/samples/sample-text.pdf"] },
  { id: "convert-image", files: ["tests/baseline/samples/sample-photo.jpg"] },
  { id: "unlock", files: ["tests/baseline/samples/sample-encrypted.pdf"], pw: true },
  { id: "rotate", files: ["tests/baseline/samples/sample-text.pdf"] },
  { id: "page-numbers", files: ["tests/baseline/samples/sample-text.pdf"] },
  { id: "watermark", files: ["tests/baseline/samples/sample-text.pdf"] },
  { id: "convert-image", files: ["tests/baseline/samples/sample-photo.jpg"] },
];
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
let pass = 0, fail = 0;
for (let i = 0; i < tools.length; i++) {
  const t = tools[i];
  const page = await ctx.newPage();
  try {
    await page.goto(`http://localhost:3000/en/tool/${t.id}`, { waitUntil: "networkidle", timeout: 45000 });
    await page.locator('input[type="file"]').first().setInputFiles(t.files);
    if (t.pw) {
      const pw = page.locator("input[type=password]");
      const n = await pw.count();
      for (let k = 0; k < n; k++) await pw.nth(k).fill("test1234");
    }
    await page.waitForTimeout(800);
    await page.locator("button", { hasText: /^Run / }).first().click();
    await page.locator('button:has-text("Download")').first().waitFor({ state: "visible", timeout: 25000 });
    pass++;
    console.log(`OK   ${i + 1}/${tools.length} ${t.id}`);
  } catch (e) {
    fail++;
    console.log(`HANG ${i + 1}/${tools.length} ${t.id}`);
  }
  await page.close();
}
console.log(`\nresult: ${pass} pass, ${fail} hang`);
await browser.close();
process.exit(fail ? 1 : 0);
