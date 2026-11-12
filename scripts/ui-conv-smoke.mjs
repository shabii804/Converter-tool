/** UI smoke: real app pages /en/tool/pdf-to-word and /en/tool/word-to-pdf */
import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const errors = [];

const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined,
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on("pageerror", (e) => errors.push("pageerror: " + String(e).slice(0, 200)));

/* --- pdf-to-word --- */
await page.goto(`${BASE}/en/tool/pdf-to-word`, { waitUntil: "load", timeout: 120000 });
const fileInput = page.locator('input[type="file"]').first();
await fileInput.setInputFiles("/home/z/my-project/tests/conv/fixture-report.pdf");
await page.waitForTimeout(500);
const convertBtn = page.locator("button", { hasText: /convert/i }).first();
await convertBtn.click();
await page.waitForTimeout(9000);
await page.screenshot({ path: "/tmp/render/ui_p2w.png" });
const p2wText = await page.evaluate(() => document.body.innerText.slice(0, 3000));
console.log("P2W has download:", /download/i.test(p2wText), "| has DOCX:", /docx/i.test(p2wText));

/* --- word-to-pdf --- */
await page.goto(`${BASE}/en/tool/word-to-pdf`, { waitUntil: "load", timeout: 120000 });
const fileInput2 = page.locator('input[type="file"]').first();
await fileInput2.setInputFiles("/home/z/my-project/tests/conv/fixture-doc.docx");
await page.waitForTimeout(500);
const convertBtn2 = page.locator("button", { hasText: /convert/i }).first();
await convertBtn2.click();
await page.waitForTimeout(9000);
await page.screenshot({ path: "/tmp/render/ui_d2p.png" });
const d2pText = await page.evaluate(() => document.body.innerText.slice(0, 3000));
console.log("D2P has download:", /download/i.test(d2pText), "| has PDF:", /\bpdf\b/i.test(d2pText));

console.log("errors:", errors.length ? errors.slice(0, 5) : "none");
await browser.close();
process.exit(0);
