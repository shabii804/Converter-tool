import { chromium } from "playwright";
const BASE = "http://localhost:3101";
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const errs = [];
page.on("pageerror", (e) => errs.push("pageerror: " + String(e?.message ?? e).slice(0, 300)));
page.on("console", (m) => {
  if (m.type() === "error" && !/favicon/.test(m.text())) errs.push("console: " + m.text().slice(0, 300));
});
for (const r of ["/", "/tool/sign-pdf", "/tool/edit-pdf", "/tool/redact-pdf", "/tool/text-to-pdf", "/blog"]) {
  await page.goto(BASE + r, { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  console.log("visited", r);
}
console.log("errors:", errs.length ? errs : "none");
await browser.close();
