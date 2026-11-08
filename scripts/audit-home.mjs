/**
 * Responsive + interaction audit for the redesigned homepage.
 * - Viewports 360 / 768 / 1024 / 1440: horizontal-scroll check + screenshots
 * - Interactions: mega menu, language switch (ES), FAQ, favorites, recents
 * Output: /tmp/render/*.png + console report (verification only).
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

mkdirSync("/tmp/render", { recursive: true });
const browser = await chromium.launch();
const URL = "http://localhost:3000/";

const VPS = [
  [360, 744, "home-360"],
  [768, 1024, "home-768"],
  [1024, 768, "home-1024"],
  [1440, 900, "home-1440"],
];

for (const [w, h, name] of VPS) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await page.goto(URL, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(1500);

  const m = await page.evaluate(() => {
    const de = document.documentElement;
    const overflow = de.scrollWidth - de.clientWidth;
    const offenders = [];
    if (overflow > 2) {
      for (const el of document.querySelectorAll("body *")) {
        const r = el.getBoundingClientRect();
        if (r.right > de.clientWidth + 2 && r.width > 24 && r.height > 4) {
          offenders.push(
            `${el.tagName}.${String(el.className).slice(0, 70)} right=${Math.round(r.right)}`
          );
          if (offenders.length >= 6) break;
        }
      }
    }
    return { overflow, offenders, scrollW: de.scrollWidth, clientW: de.clientWidth };
  });

  // touch-target check for header buttons at this width
  const smallTargets = await page.evaluate(() => {
    const out = [];
    for (const el of document.querySelectorAll("header button")) {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0 && (r.width < 40 || r.height < 40)) {
        out.push(`${(el.getAttribute("aria-label") ?? el.textContent ?? "?").slice(0, 24)} ${Math.round(r.width)}x${Math.round(r.height)}`);
      }
    }
    return out;
  });

  await page.screenshot({ path: `/tmp/render/${name}.png` });
  console.log(`${name}: overflow=${m.overflow} scrollW=${m.scrollW}/${m.clientW} jsErrors=${errors.length}`);
  if (m.offenders.length) console.log("  offenders:", JSON.stringify(m.offenders, null, 1));
  if (smallTargets.length) console.log("  small header targets:", smallTargets.join(" | "));
  await page.close();
}

/* ---- interactions at 1440 ---- */
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
await page.goto(URL, { waitUntil: "networkidle" });
await page.waitForTimeout(800);

// 1. mega menu
await page.getByRole("button", { name: "Tools" }).first().click();
await page.waitForTimeout(400);
await page.screenshot({ path: "/tmp/render/mega-menu.png" });
const megaVisible = await page.evaluate(() => document.body.innerText.includes("Merge PDF"));
await page.keyboard.press("Escape");
await page.waitForTimeout(250);

// 2. language switch → ES + localStorage persistence
await page.getByRole("button", { name: /Language|Idioma|Langue/ }).click();
await page.waitForTimeout(250);
await page.getByRole("menuitemradio", { name: "Español" }).click();
await page.waitForTimeout(500);
const esState = await page.evaluate(() => ({
  htmlLang: document.documentElement.lang,
  ls: localStorage.getItem("swiftpdf.lang"),
  heroText: document.querySelector("h1")?.textContent?.slice(0, 60),
}));
await page.screenshot({ path: "/tmp/render/home-es.png" });

// 3. FAQ accordion (ES copy)
const faqOpened = await page.evaluate(() => {
  const btns = [...document.querySelectorAll("#faq button")];
  if (!btns.length) return false;
  btns[0].click();
  return btns.length;
});

// 4. favorites → star first card, check localStorage + Favorites tab
await page.getByRole("button", { name: "Añadir a favoritas" }).first().click();
await page.waitForTimeout(300);
const favState = await page.evaluate(() => ({
  ls: localStorage.getItem("swiftpdf.favs"),
  favTab: document.body.innerText.includes("Favoritas"),
}));

// 5. recents appear after opening a tool then going home
await page.locator('a[aria-label^="Merge PDF"]').first().click();
await page.waitForTimeout(600);
const toolView = await page.evaluate(() => location.href && document.body.innerText.length > 100);
await page.evaluate(() => window.history.length);
// go home via logo
await page.getByRole("button", { name: "SwiftPDF home" }).click();
await page.waitForTimeout(700);
const recentVisible = await page.evaluate(() => document.body.innerText.includes("Usadas recientemente"));

console.log("mega visible:", megaVisible);
console.log("lang ES:", JSON.stringify(esState));
console.log("faq buttons:", faqOpened, "| favs:", JSON.stringify(favState));
console.log("tool view opened:", toolView, "| recent strip:", recentVisible, "| jsErrors:", errors.length || 0);

await page.close();
await browser.close();
console.log("done");
