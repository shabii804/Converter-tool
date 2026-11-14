import type { Metadata } from "next";
import { LegalDoc, type LegalSection } from "@/components/legal-doc";
import { isLocale, type Lang } from "@/lib/i18n";
import { canonicalUrl } from "@/lib/seo";

const UPDATED = "November 14, 2026";

const SECTIONS: LegalSection[] = [
  {
    h: "The short version",
    p: [
      "PrivyPDF gives you free document tools that run entirely in your browser. Your files stay on your device, you keep every right to them, and the service is provided as-is. Please verify important output before relying on it.",
    ],
  },
  {
    h: "The service",
    p: [
      "PrivyPDF is a browser-based document toolkit. It requires no account, charges nothing and performs all processing locally on your device using WebAssembly. Features may be added, improved or retired over time; the installable app keeps the tools you already have working offline.",
    ],
  },
  {
    h: "Your files and your rights",
    p: [
      "You retain all rights to the documents you process. Because processing happens on your device, no copy of your files is ever received, stored or transmitted by us. Output files produced by the tools belong entirely to you.",
    ],
  },
  {
    h: "Acceptable use",
    p: [
      "Use the tools only for content you have the right to process, and only in ways that comply with the laws that apply to you — including copyright and privacy law. Do not use the service to interfere with, overload or break the site, and do not misrepresent the product as your own.",
    ],
  },
  {
    h: "No warranty",
    p: [
      "The service is provided \u201cas is\u201d and \u201cas available\u201d, without warranties of any kind, express or implied. Document conversion and editing are inherently lossy operations: layout, fonts and embedded features may not survive every conversion. Always review important output — especially legal, financial or medical documents — before relying on it.",
    ],
  },
  {
    h: "Limitation of liability",
    p: [
      "To the maximum extent permitted by law, the maintainer is not liable for any loss of data, profit or business, or for any indirect or consequential damages arising from your use of the service. You are responsible for keeping your own backups.",
    ],
  },
  {
    h: "Changes to these terms",
    p: [
      "These terms may be updated as the product evolves; the date at the top of this page always reflects the current version. Continued use of the service after a change means you accept the updated terms.",
    ],
  },
];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const lang: Lang = isLocale(locale) ? locale : "en";
  return {
    title: "Terms of Service — PrivyPDF",
    description:
      "Terms for using PrivyPDF: free browser-based tools that process files locally. Your files stay yours, the service is as-is — read the short summary.",
    alternates: { canonical: canonicalUrl(lang, "/terms") },
  };
}

export default async function TermsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  await params;
  return <LegalDoc title="Terms of Service" updated={UPDATED} sections={SECTIONS} />;
}
