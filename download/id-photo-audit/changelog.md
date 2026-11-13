# Changelog — ID Photo page redesign (/en/tool/id-photo)

One commit, audit-driven. Files with what changed and why.

## New files

- **`src/components/id-photo-tool.tsx`** — dedicated one-page UI for the ID
  Photo tool: breadcrumb (Tools › ID Photo), 36/44 H1 (28/36 mobile) with
  16/24 intro, desktop 60/40 two-column layout (upload/crop preview left,
  options + sticky action dock right), mobile order title → dropzone/preview
  → presets → adjustments → print sheet → sticky bottom action bar. Direct
  manipulation (drag pan, wheel/pinch zoom, arrow-key nudge, +/− zoom, zoom
  slider with visible % and Reset), face-guide overlay (head zone, eye line,
  centerline) with an honest "manual placement, no face detection" note, 8
  preset tiles showing mm + px at 300 DPI, custom size in mm/in, background
  swatches + custom picker, print-sheet panel (paper 10×15/4×6/A4, copies
  with paper-limit cap note, cut guides, live sheet mini-preview), print at
  100% info callout, two download actions with aria-live success state and
  file-size note, empty state with inert/dimmed options until a photo is
  added.
- **`src/lib/id-photo-presets.ts`** — single source for preset/paper data and
  shared grid math, used by the UI, the workspace option mapping and the
  engine (Pakistan 35×45 and India/US 2×2 in = 51×51 verified against the
  NADRA/OCI portals; no invented sizes).

## Engine (lib/extra-engine.ts — pdf-engine.ts untouched)

- `IdPhotoOptions` extended: optional `w`/`h` mm (custom sizes), `paper`,
  `copies` (0 = auto-fit), `cutGuides`.
- New exported builders `idPhotoPhotoBlob()` (300 DPI JPEG) and
  `idPhotoSheetBlob()` (paper/copies/guides PDF) — the UI calls these
  directly for on-page downloads; `runIdPhoto()` keeps the same public
  behavior (photo page + optional sheet page) on top of the new helpers.
- The 16 original pdf-engine.ts tools and the baseline harness are untouched
  (id-photo was never part of the baseline).

## Page shell & site

- **`src/components/workspace.tsx`** — id-photo renders the dedicated tool;
  its option state gained guide/paper/copies/cutGuides/unit/custom fields;
  old `IdPhotoOptions` + thirds-grid preview removed.
- **`src/lib/tools.ts`** — id-photo `maxFiles: 1`; optional
  `metaDescription`/`metaKeywords` fields (shorter description 123 chars and
  ID-photo keywords instead of global PDF keywords).
- **`src/app/[locale]/tool/[id]/page.tsx`** — metadata uses the per-tool
  short description (<160 chars) and tool keywords; og:image resolves
  against `metadataBase` (`NEXT_PUBLIC_SITE_URL`) instead of being
  localhost-bound in production.
- **`src/app/globals.css`** — page-scoped CSS variables (`--idp-*` for
  spacing/type/radius) implementing the 8-pt scale and the brief's type
  scale; `.idp-h1/label/body/help` utilities.
- **`src/design/tokens.css`** — `--foreground-faint` recolored in both
  themes (#6b7590→#7a8499 dark, #8a93a3→#687180 light): the old values
  failed WCAG AA (4.17:1 / 3.10:1) despite the file's own ≥4.5:1 contract;
  all pairings now ≥4.6:1.
- **`src/lib/i18n.ts`, `src/lib/i18n-extra.ts`** — header privacy badge
  "0 bytes uploaded" → "Nothing leaves your device" in all 7 locales.
- **`src/components/footer.tsx`** — FAQ, How-it-works and category items are
  real links (`/en#faq`, `/en#how`, `/en#tools`) with retry-scrolled
  sections; dead buttons removed.
- **`src/components/app-shell.tsx`** — the home route now resets any leaked
  SPA tool view (the zustand store survives route changes, so real links
  used to leave the tool UI rendered at `/en`).
- **`src/components/header.tsx`** — search is icon-only on phones (less
  mobile header clutter).
- **`src/components/share-button.tsx`, `related-tools.tsx`** — 44px touch
  targets on the share button and the "all tools" link.

## Verified

- tsc clean for all touched files; eslint clean for new/edited components
  (only pre-existing warnings remain elsewhere).
- End-to-end in the browser at 360/768/1440 in both themes: uploads, drag/
  wheel/keyboard, presets, custom size, unit toggle, swatches, sheet panel
  with live mini-preview, both downloads (byte-verified 413×531 JPEG and
  A4 PDF), success states, breadcrumb/footer navigation, offline reload via
  the service worker, and a regression pass on the home page and the
  Compress PDF tool (generic layout intact, zero horizontal overflow).

## Known honest limitations

- Canonical/og URLs fall back to `http://localhost:3000` until
  `NEXT_PUBLIC_SITE_URL` is set to the production domain at deploy time
  (no production domain is configured anywhere in the repo).
- Native switches are 44px wide × 24px tall inside 44px-tall rows (WCAG
  2.5.8 AA minimum is 24px; the full row is the practical target).
- Background removal is not included — the background colour paints behind
  transparent PNG areas only, and the UI says so.
- Face placement is manual by design; the guide overlay is an aid, not
  detection.
