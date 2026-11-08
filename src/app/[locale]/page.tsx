import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { dictionaries, isLocale, type Lang } from "@/lib/i18n";
import { canonicalUrl, localeAlternates, softwareAppLd, SITE_URL } from "@/lib/seo";
import { HomeClient } from "./home-client";

export function generateStaticParams() {
  return [
    { locale: "en" },
    { locale: "es" },
    { locale: "fr" },
    { locale: "pt" },
    { locale: "hi" },
    { locale: "ur" },
    { locale: "ar" },
  ];
}

export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = dictionaries[locale as Lang];
  const title = `${t.hero.h1a} ${t.hero.h1b}`;
  return {
    title,
    description: t.hero.sub,
    alternates: {
      canonical: canonicalUrl(locale as Lang, "/"),
      languages: localeAlternates("/"),
    },
    openGraph: {
      title,
      description: t.hero.sub,
      url: canonicalUrl(locale as Lang, "/"),
      siteName: "SwiftPDF",
      images: [{ url: "/og.png", width: 1200, height: 630, alt: "SwiftPDF — private in-browser PDF tools" }],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: t.hero.sub,
      images: ["/og.png"],
    },
  };
}

export default async function LocaleHome({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = dictionaries[locale];
  const ld = [
    softwareAppLd({
      name: "SwiftPDF",
      description:
        "Fast, private PDF tools that run entirely in your browser — 27 tools, no uploads, no sign-up, free.",
      url: SITE_URL,
      appType: "SoftwareApplication",
    }),
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "SwiftPDF",
      url: SITE_URL,
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: t.faq.items.map((it) => ({
        "@type": "Question",
        name: it.q,
        acceptedAnswer: { "@type": "Answer", text: it.a },
      })),
    },
  ];
  return (
    <>
      <script
        type="application/ld+json"
        // SoftwareApplication + WebSite (no invented ratings)
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }}
      />
      <HomeClient locale={locale} />
    </>
  );
}
