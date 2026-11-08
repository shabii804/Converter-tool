import type { ReactNode } from "react";

/**
 * Root layout is a pass-through: every page lives under /[locale], and
 * app/[locale]/layout.tsx renders <html lang dir> per locale. All other
 * top-level paths (api, sitemap.xml, robots.txt, PWA files) are handled
 * outside the page tree.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
