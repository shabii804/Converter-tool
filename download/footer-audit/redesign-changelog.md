# Premium Desktop Redesign — Changelog

Scope: home page (`/en`), navbar, footer. Engine untouched — all 32 tools
and the PDF/Word processing pipeline are exactly as before
(`src/lib/pdf-engine.ts` was not modified; no baseline rerun needed).

| # | Commit | What changed |
|---|--------|----------------|
| 1 | `e018c31` | **Container 1152px → 1280px.** `--container` token and every `max-w-6xl` section moved to `max-w-7xl`; the layout now uses the available screen width on large displays with balanced margins and one shared left edge. |
| 2 | `59a1d8e` | **Two-column compact hero + quick-tools toolbar.** Desktop hero height ~1206px → ~801px. Left: eyebrow, gradient-highlighted heading, description, compact dropzone, formats chips, honest "no size limits" note, trust chips. Right: brand artwork with two floating proof chips (float animation disabled under `prefers-reduced-motion`). Below: one horizontal quick-access toolbar — Convert, Compress, Merge, Split, Edit, Protect, Unlock, More — real tool launches, snap-scroll on phones, replacing the old 6-tile grid inside the hero. New copy keys `hero.noLimit` + `quick.*` in all 7 locales. |
| 3 | `3fe786f` | **Navbar.** About link (real `#why` anchor, retry-scroll), "Free forever" badge (lg+), primary "Get started" button (scrolls to the hero dropzone, hidden on phones). Keys `nav.about`, `nav.freeBadge`, `nav.getStarted` in all 7 locales. |
| 4 | `46a8f01` | **Legal + footer.** New `/privacy` and `/terms` pages for every locale (shared `LegalDoc` shell, per-page canonical metadata, honest content: local-only processing, localStorage prefs, PWA cache, no third-party processors). Footer bottom bar links to both; brand column gains the GitHub repo icon. Keys `footer.privacy`, `footer.terms` in all 7 locales. |

## Verification performed

- Screenshots at 1440px (light + dark, full page) and 360px: no horizontal
  overflow at any width; hero, grid, sections, CTA and footer all render.
- Console clean (only dev Fast Refresh logs); no page errors.
- Upload flow re-tested end-to-end through the real dropzone input — file
  chip appears, store receives the file; drag-and-drop/paste untouched.
- Section entrance animations (`whileInView`) confirmed to fire on scroll;
  they intentionally start at opacity 0 until scrolled into view.
- `whileInView`/float/press motion all collapse under reduced-motion.
- Footer links ≥44px tall, focus ring token verified, dropzone is a real
  button (keyboard reachable).

## Honest-content decisions

- "ToolsPDF" in the brief is treated as the template name for this product;
  the shipped brand remains **SwiftPDF** (routes, PWA identity and 32 tool
  names unchanged, per the preserve-everything requirement).
- No fake social icons: only the GitHub repository (real) is linked.
- No invented "max file size": the hero states the truth — there is no
  artificial cap, processing happens on the device.
- Legal pages are English-only for now (same policy as the blog), clearly
  labelled as such on the page.
