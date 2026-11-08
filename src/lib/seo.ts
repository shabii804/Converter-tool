import { LOCALES, type Lang } from "./i18n";

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/** hreflang alternates for a locale-prefixed path */
export function localeAlternates(path: string): Record<string, string> {
  const suffix = path === "/" ? "" : path;
  const languages: Record<string, string> = {};
  for (const l of LOCALES) {
    languages[l.hreflang] = `${SITE_URL}/${l.id}${suffix}`;
  }
  languages["x-default"] = `${SITE_URL}/en${suffix}`;
  return languages;
}

export function canonicalUrl(locale: Lang, path: string): string {
  return `${SITE_URL}/${locale}${path === "/" ? "" : path}`;
}

/* ---------- JSON-LD builders (all data is real, no invented ratings) ---------- */

export function breadcrumbLd(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: it.url,
    })),
  };
}

export function softwareAppLd(opts: {
  name: string;
  description: string;
  url: string;
  appType?: "SoftwareApplication" | "WebApplication";
}) {
  return {
    "@context": "https://schema.org",
    "@type": opts.appType ?? "WebApplication",
    name: opts.name,
    description: opts.description,
    url: opts.url,
    applicationCategory: "UtilitiesApplication",
    operatingSystem: "Any (works in the browser)",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  };
}

export function howToLd(opts: {
  name: string;
  description: string;
  url: string;
  steps: { name: string; text: string }[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: opts.name,
    description: opts.description,
    url: opts.url,
    step: opts.steps.map((s, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      name: s.name,
      text: s.text,
    })),
  };
}

export function faqLd(items: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((it) => ({
      "@type": "Question",
      name: it.q,
      acceptedAnswer: { "@type": "Answer", text: it.a },
    })),
  };
}
