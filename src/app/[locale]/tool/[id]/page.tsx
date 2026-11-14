import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TOOLS, toolById } from "@/lib/tools";
import { LOCALES } from "@/lib/i18n";
import { isLocale, localeMeta, type Lang } from "@/lib/i18n";
import { breadcrumbLd, canonicalUrl, howToLd, localeAlternates } from "@/lib/seo";
import { ToolPageClient } from "./tool-client";

export function generateStaticParams() {
  return LOCALES.flatMap((l) => TOOLS.map((t) => ({ locale: l.id, id: t.id })));
}

export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { locale, id } = await params;
  const tool = toolById(id);
  if (!tool || !isLocale(locale)) return {};
  /* search engines: short description (<160 chars) + tool-specific
     keywords where provided, honest generic fallbacks otherwise */
  const description =
    tool.metaDescription ??
    `${tool.tagline} — ${tool.description}`.slice(0, 160);
  return {
    title: `${tool.name} — Free, Private, 100% In Your Browser`,
    description,
    keywords: tool.metaKeywords,
    alternates: {
      canonical: canonicalUrl(locale as Lang, `/tool/${tool.id}`),
      languages: localeAlternates(`/tool/${tool.id}`),
    },
    openGraph: {
      title: `${tool.name} | PrivyPDF`,
      description,
      url: canonicalUrl(locale as Lang, `/tool/${tool.id}`),
      type: "website",
      /* resolved against metadataBase (NEXT_PUBLIC_SITE_URL) — never localhost
         in production when the env var is set */
      images: [
        { url: "/og.png", width: 1200, height: 630, alt: `${tool.name} — PrivyPDF` },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${tool.name} | PrivyPDF`,
      description,
      images: ["/og.png"],
    },
  };
}

export default async function ToolPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const tool = toolById(id);
  if (!tool || !isLocale(locale)) notFound();

  const toolUrl = canonicalUrl(locale as Lang, `/tool/${tool.id}`);
  const homeUrl = canonicalUrl(locale as Lang, "/");
  const ld = [
    howToLd({
      name: `How to ${tool.name.toLowerCase()} online`,
      description: tool.description,
      url: toolUrl,
      steps: [
        {
          name: "Drop your file",
          text: "Drag your file into the drop zone, paste it with Ctrl+V, or browse for it. It stays on your device — nothing is uploaded.",
        },
        {
          name: `Use the ${tool.name} options`,
          text: `Pick the settings you need, then press Run ${tool.name}. Processing happens on your device's own CPU.`,
        },
        {
          name: "Download the result",
          text: "Save the finished file to your device. It was never sent to any server.",
        },
      ],
    }),
    breadcrumbLd([
      { name: "PrivyPDF", url: homeUrl },
      { name: tool.name, url: toolUrl },
    ]),
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }}
      />
      <ToolPageClient locale={locale} id={id} />
    </>
  );
}
