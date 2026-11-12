/**
 * Root layout is a pass-through: every page lives under /[locale], and
 * app/[locale]/layout.tsx renders <html lang dir> per locale. All other
 * top-level paths (api, sitemap.xml, robots.txt, PWA files) are handled
 * outside the page tree.
 *
 * Note: browser-compat shims for pdf.js live in src/lib/compat-shims.ts
 * and are imported from the client boundaries that need them
 * (components/app-shell.tsx, lib/pipeline.ts) — a server-component import
 * here would never run in the browser.
 */
import type { ReactNode } from "react";

export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
