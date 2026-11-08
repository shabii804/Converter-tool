import { NextRequest, NextResponse } from "next/server";
import { LOCALES } from "@/lib/i18n";

const COOKIE = "swpdf-locale";
const YEAR = 60 * 60 * 24 * 365;

function detectLocale(req: NextRequest): string {
  const cookie = req.cookies.get(COOKIE)?.value;
  if (cookie && LOCALES.some((l) => l.id === cookie)) return cookie;
  const accept = req.headers.get("accept-language") ?? "";
  for (const part of accept.split(",")) {
    const tag = part.trim().split(";")[0].toLowerCase();
    const base = tag.split("-")[0];
    const hit = LOCALES.find((l) => l.id === base);
    if (hit) return hit.id;
  }
  return "en";
}

export function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const first = pathname.split("/")[1];
  if (LOCALES.some((l) => l.id === first)) {
    const res = NextResponse.next();
    res.cookies.set(COOKIE, first, { path: "/", maxAge: YEAR, sameSite: "lax" });
    return res;
  }
  // no locale prefix → redirect to the visitor's language (SEO: canonical
  // URLs are the locale-prefixed ones)
  const locale = detectLocale(req);
  const url = req.nextUrl.clone();
  url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
  const res = NextResponse.redirect(url, 307);
  res.cookies.set(COOKIE, locale, { path: "/", maxAge: YEAR, sameSite: "lax" });
  return res;
}

export const config = {
  matcher: [
    // everything except: api, next internals, metadata/PWA files, any file
    "/((?!api|_next/static|_next/image|sitemap.xml|robots.txt|manifest.webmanifest|sw.js|og.png|apple-touch-icon.png|pdf.worker.min.mjs|.*\\..*).*)",
  ],
};
