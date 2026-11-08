import type { Metadata } from "next";
import { LocaleBoundary } from "@/components/locale-boundary";
import { isLocale, type Lang } from "@/lib/i18n";
import { canonicalUrl } from "@/lib/seo";

export async function generateStaticParams() {
  return [
    { locale: "en" }, { locale: "es" }, { locale: "fr" },
    { locale: "pt" }, { locale: "hi" }, { locale: "ur" }, { locale: "ar" },
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
  return {
    title: "SwiftPDF Design System — tokens, components & principles",
    description:
      "The SwiftPDF design system: navy + indigo-violet palette, 8px grid, layered shadows, Inter type scale, component kit and motion principles.",
    robots: { index: false, follow: true },
    alternates: { canonical: canonicalUrl(locale as Lang, "/design") },
  };
}

export default async function DesignLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) return null;
  return <LocaleBoundary locale={locale}>{children}</LocaleBoundary>;
}
