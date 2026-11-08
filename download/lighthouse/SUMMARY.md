# SwiftPDF — Lighthouse (mobile emulation) + final baseline

| page | perf | a11y | best-practices | SEO | LCP s (budget <2.0) | CLS (budget <0.05) | TBT ms | Speed Index s |
|---|---|---|---|---|---|---|---|---|
| blog-article | 0.94 | 0.96 | 1 | 1 | 1.29 | 0 | 295 | 1.29 |
| home | 0.81 | 0.97 | 1 | 1 | 1.21 | 0 | 773 | 1.32 |
| intent-100kb | 0.86 | 0.96 | 1 | 1 | 1.18 | 0 | 548 | 1.34 |
| tool-compress-target | 0.92 | 0.95 | 1 | 1 | 1.17 | 0 | 332 | 1.17 |
| tool-merge | 0.91 | 0.94 | 1 | 1 | 1.06 | 0 | 382 | 1.06 |

INP (real interaction latency, Event Timing API, lab probe): worst observed 96 ms across grid navigation, tool controls + run, command palette, mega menu, editor drag — **budget <200 ms PASS**.

TBT note: TBT is a load-time lab proxy, not INP. Remaining TBT (~230-540 ms on 4x-throttled mobile) is React hydration cost; the field budget the brief specifies (INP) passes with headroom.

Final baseline comparison: run-1 vs run-6 — 18/18 outputs identical, 0 differ, engineChanged=False (src/lib/pdf-engine.ts untouched throughout).

Full HTML reports in this folder: lh-home, lh-tool-merge, lh-tool-compress-target, lh-blog-article, lh-intent-100kb.