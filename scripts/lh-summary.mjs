/** Extracts the budget-relevant metrics from Lighthouse JSON reports. */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const dir = path.join(process.cwd(), "tests/lighthouse");
const files = readdirSync(dir).filter((f) => f.startsWith("lh-") && f.endsWith(".json"));

console.log("\n=== LIGHTHOUSE SUMMARY (mobile emulation) ===");
console.log(
  "page".padEnd(28),
  "perf".padEnd(6),
  "a11y".padEnd(6),
  "SEO".padEnd(6),
  "LCP(s)".padEnd(8),
  "CLS".padEnd(8),
  "TBT(ms)".padEnd(9),
  "SI(s)"
);
let allPass = true;
const budgets = { lcp: 2.0, cls: 0.05, tbt: 200 }; // TBT reported as INP proxy

for (const f of files) {
  const r = JSON.parse(readFileSync(path.join(dir, f), "utf8"));
  const cats = r.categories;
  const a = r.audits;
  const lcp = (a["largest-contentful-paint"]?.numericValue ?? 0) / 1000;
  const cls = a["cumulative-layout-shift"]?.numericValue ?? 0;
  const tbt = a["total-blocking-time"]?.numericValue ?? 0;
  const si = (a["speed-index"]?.numericValue ?? 0) / 1000;
  const row =
    f.replace("lh-", "").replace(".json", "").padEnd(28) +
    cats.performance.score.toFixed(2).padEnd(6) +
    cats.accessibility.score.toFixed(2).padEnd(6) +
    cats.seo.score.toFixed(2).padEnd(6) +
    lcp.toFixed(2).padEnd(8) +
    cls.toFixed(4).padEnd(8) +
    tbt.toFixed(0).padEnd(9) +
    si.toFixed(2);
  console.log(row);
  if (lcp > budgets.lcp || cls > budgets.cls || tbt > budgets.tbt) allPass = false;
}
console.log(
  "\nbudgets: LCP<" +
    budgets.lcp +
    "s  CLS<" +
    budgets.cls +
    "  TBT<" +
    budgets.tbt +
    "ms (TBT = lab proxy for INP field metric) →",
  allPass ? "ALL PASS" : "SOME FAILED"
);
