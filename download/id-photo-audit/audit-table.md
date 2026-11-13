# ID Photo page audit — /en/tool/id-photo (before redesign)

Measured live in headless Chromium at **360px**, **768px**, **1440px** (dark theme default; light-theme pairs computed from tokens). Contrast ratios calculated with the WCAG 2.x relative-luminance formula.

## Typography & metrics table

| Element | 1440px | 768px | 360px | Spec (brief) |
| --- | --- | --- | --- | --- |
| Font family | Inter (all elements) | Inter | Inter | one family — OK |
| H1 `ID Photo` | 24px / 26.9px / 700 | 22.98px / 25.7px / 700 | 20.12px / 22.5px / 700 | 36/44 desktop, 28/36 mobile |
| Intro text | 14px / 20px / 400 | 14px / 20px / 400 | 13px / 20.8px / 400 | 16px / 24px |
| Section labels (`Size preset`, `Zoom`…) | 13px / 20px / 500 | same | same | 14px / 20px / 600 |
| Helper text (face-detection note) | 13px / 21px, `fg-faint` | same | same | 13–14px / 20px, ≥4.5:1 |
| Micro helper ("As many copies…") | 12px / 19.2px, `fg-faint` | same | same | ≥13px, ≥4.5:1 |
| Preset buttons | 13px / 600, h=43px, w=327 | h=43px | h=43px, w=278 | ≥44px target |
| Zoom slider thumb | 16px circle | 16px | 16px | drag+wheel+slider, 44px hit area |
| Back button | 35×40px | 20×40px | 18×40px | ≥44×44px |
| Color input | 48×40px | same | same | ≥44px tall |
| Run button | h=56px, w=712 (end of options) | sticky bar | sticky bar | sticky action bar |
| Files card | 360px (31% of row) | 720px | 328px | left ~60% = upload+preview |
| Options card | 712px (62% of row) | 720px | 328px | right ~40% = options |
| Content left edge | H1 x=279 vs card x=168 (Δ111px) | Δ96px | Δ94px | one left edge |
| Container | 1152px | 720px | 328px | 1120px |
| Header → body spacing | 32px | 32px | 32px | 8-pt scale |
| Body → related tools | 40px + 48px | same | same | 8-pt scale |
| Horizontal overflow | none | none | none | required none — OK |

## Contrast ratios (computed)

| Pair | Ratio | Verdict |
| --- | --- | --- |
| H1 dark `#f2f5fa` on `#0b0f1a` | 17.51:1 | pass |
| H1 light `#0b0f1a` on `#ffffff` | 19.13:1 | pass |
| Muted text dark `#97a1b5` on `#0b0f1a` | 7.36:1 | pass |
| Muted on card dark `#97a1b5` on `#101627` | 6.93:1 | pass |
| Muted light `#5b6472` on `#ffffff` | 5.98:1 | pass |
| **Helper faint dark `#6b7590` on `#0b0f1a`** | **4.17:1** | **fail (AA 4.5:1)** |
| **Helper faint on card dark `#6b7590` on `#101627`** | **3.92:1** | **fail** |
| **Faint light `#8a93a3` on `#ffffff`** | **3.10:1** | **fail** |
| White on primary button `#4f46e5` | 6.29:1 | pass |
| White on gradient end `#7c3aed` | 5.70:1 | pass |

## Issues found (numbered, each fixed in the redesign)

1. **No tool layout** — generic Files(31%)+Options(62%) split; the crop preview is buried mid-card in "Options"; ratio ≠ 60/40 spec.
2. **No single left edge** — H1/intro indented 94–111px relative to the cards (back arrow + icon tile offset).
3. **H1 too small** (24/23/20px vs 36/44 desktop, 28/36 mobile) and intro is 13–14px instead of 16px/24px.
4. **Empty state** — all controls enabled before any photo is added; a dead empty canvas box renders above the presets.
5. **No direct manipulation** — pan only via "Move left/right" + "Move up/down" sliders; no drag, no wheel zoom, no pinch.
6. **No visible zoom %** (only "Zoom · 1.00×" in the label) and **no Reset**.
7. **No ID-photo guide** — overlay is a thirds grid, not head zone / eye line / centerline; no toggle; guidance buried in a paragraph.
8. **Presets** — only 4; tiles show no pixel dimensions at 300 DPI; missing 25×35, 40×50, India 2×2 in, Pakistan passport/CNIC, Custom.
9. **Print sheet** — fixed 10×15 cm, "as many copies as fit" only; no paper choice (4×6 in / A4), no copies count, no cut-guide toggle, no sheet mini-preview.
10. **Output flow** — single "Run ID Photo" → Done view → one combined PDF; no "Download photo" / "Download print sheet" actions, no on-page success state, no file-size note.
11. **"print at 100%" guidance** is buried in a helper paragraph, not a visible callout next to the actions.
12. **Background control** mislabeled "Background fill (behind transparent areas)" with a single color input; no swatches; no honest statement that background *removal* isn't supported.
13. **Privacy badge duplication** — header chip says "0 bytes uploaded" while the files card repeats "Nothing is uploaded"; maxFiles=5 (brief says 1).
14. **No breadcrumb**; footer FAQ / How it works / category items are `<button>`s with no real URLs.
15. **Touch targets** — back button 18–35px wide, preset tiles 43px, slider thumbs 16px with no enlarged hit area.
16. **AA contrast failure** for `--foreground-faint` helper text in both themes (4.17:1 dark, 3.10:1 light) — token contradicts the token file's own "≥4.5:1 verified" contract.
17. **SEO** — meta description 230 chars (>160); page metadata ignores the tool's own keywords (falls back to global PDF keywords); canonical/og URL falls back to `http://localhost:3000` when `NEXT_PUBLIC_SITE_URL` is unset.
18. **Offline** — service worker exists and registers; navigations are network-first with cache fallback (verified registered in audit; re-verified after redesign).

Functional notes: upload → preview verified with a real 14.8 KB JPEG (canvas 320×411 renders, grid overlay present). The "0 bytes / could not be previewed" seen during one automated upload was a tooling artifact of the file transfer, not a product bug — re-verified with a real in-page file.

---

# After the redesign — measured

Same methodology, same viewports, dark theme default (light theme screenshots included).

| Element | 1440px | 768px | 360px | Verdict |
| --- | --- | --- | --- | --- |
| H1 | 36px / 44px / 700 | 28px / 36px / 700 | 28px / 36px / 700 | matches spec |
| Intro text | 16px / 24px / 400 | 16px / 24px | 16px / 24px | matches spec |
| Section labels | 14px / 20px / 600 | same | same | matches spec |
| Helper text | 13px / 20px, `fg-faint` recolored | same | same | matches spec |
| Preset tiles | one line: name + mm + px @300 DPI | same | 2-col grid | matches spec |
| Left edge | breadcrumb = H1 = intro = cards at x=184 | x=24 | x=16 | one left edge |
| Container | 1120px (max-w) | fluid | fluid | matches spec |
| Card padding | 24px (≥1024) | 16px | 16px | 8-pt scale |
| Horizontal overflow | 0px | 0px | 0px | pass |
| Slider thumb / hit row | 24px thumb in 44px row | same | same | AA pass |
| Selects / inputs / buttons | 44px | same | same | AA pass |
| Breadcrumb link | 44px tall chip | same | same | AA pass |
| Switches | 44×24 track in 44px row | same | same | AA (2.5.8) pass |

Contrast after the token fix:

| Pair | Before | After |
| --- | --- | --- |
| Helper faint dark `on #0b0f1a` | 4.17:1 FAIL | 5.09:1 pass (`#7a8499`) |
| Helper faint dark `on card #101627` | 3.92:1 FAIL | 4.79:1 pass |
| Helper faint light `on #ffffff` | 3.10:1 FAIL | 4.93:1 pass (`#687180`) |
| Helper faint light `on surface-1` | 2.97:1 FAIL | 4.60:1 pass |

Functional results (all verified in the browser):

- Empty state: options inert + dimmed, hint shown; downloads disabled with a hint.
- Direct manipulation: drag pans (1:1 with the overflow), wheel zooms 100→300% (verified 100→143%), pinch via two pointers, arrow keys nudge (verified via state probe; Shift = 0.1), +/− zooms; Reset zeroes zoom/pan; zoom % visible (tabular-nums).
- Face guide: head zone (9–69%), eye line (36–46%), centerline, toggleable, honest "no face detection" note.
- Presets: 8 standard tiles + custom (mm/in). Switching re-renders the preview: 0.778 / 1.000 / 0.714 aspects verified. Custom 40×60mm → 472×709 px verified. Unit toggle 35 mm → 1.38 in verified.
- Background: white / light blue / light gray swatches + custom picker; honest note that removal isn't supported on-device.
- Print sheet: paper 10×15 / 4×6 / A4, copies (auto-fit shows the real count, e.g. 6 on 10×15, 30 on A4), cap note when copies exceed the paper ("capped at 6 (paper limit)"), cut-guide toggle, live mini-preview matching the caption.
- Downloads: "Download photo" → 413×531 px JPEG, 13.5 KB (35×45 mm at 300 DPI verified byte-level); "Download print sheet" → 1-page A4 PDF (595.28×841.89 pt verified), 14.7–15.4 KB; success card with size note, aria-live polite.
- Privacy: header badge now "Nothing leaves your device" (7 locales), file limit 1.
- Navigation: breadcrumb Tools › ID Photo works; footer FAQ / How-it-works / categories are real URL links that land on the right section; the SPA view machine follows the URL (AppShell fix).
- Performance (dev build, localhost, 360px): FCP ≈ 432 ms, load ≈ 495 ms; the engine (pdf-lib) is lazy-loaded only when a download runs; no heavy library ships with the page.
- Offline: SW registered → offline reload delivers the full page (verified via manual SW registration; production registers automatically).
