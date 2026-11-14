import type { Metadata } from "next";
import { LegalDoc, type LegalSection } from "@/components/legal-doc";
import { isLocale, type Lang } from "@/lib/i18n";
import { canonicalUrl } from "@/lib/seo";

const UPDATED = "November 14, 2026";

const SECTIONS: LegalSection[] = [
  {
    h: "The short version",
    p: [
      "PrivyPDF is a local-first document toolkit: every file you open is processed inside your own browser tab. There is no upload step anywhere in the product — your documents never leave your device, so they are never stored, seen or shared by anyone but you.",
    ],
  },
  {
    h: "What we collect",
    p: [
      "Nothing. There are no accounts, no sign-up forms and no email collection. We do not run analytics on file contents and we do not receive copies of your documents. What you open, convert, merge, compress or edit is unknown to us because that information never reaches any server.",
    ],
  },
  {
    h: "How processing works",
    p: [
      "All tools are built on WebAssembly libraries that run locally in your browser. When you drop a file, it is read with the browser's File API, processed in memory by code running in your tab, and written back out as a local download. Nothing is transmitted over the network during processing. Close the tab and the working memory is released.",
    ],
  },
  {
    h: "What is stored on your device",
    p: [
      "Preferences only. Your theme, language, favorite tools, recently used tools and any custom tool order are stored in your browser's localStorage on your device. You can clear them at any time from your browser settings, or with the reset affordances in the interface. Your documents are never written to persistent storage by the app.",
    ],
  },
  {
    h: "Offline use and the app cache",
    p: [
      "PrivyPDF is an installable progressive web app. A service worker caches the application code so the toolkit keeps working offline. That cache contains application files only — never your documents.",
    ],
  },
  {
    h: "Third parties",
    p: [
      "No third-party service participates in processing your files. The site itself is delivered as static files by a hosting provider; like any website, standard request logs may exist at that hosting layer. Those logs concern network requests for the app itself and never contain your documents, because your documents are never sent anywhere.",
    ],
  },
  {
    h: "Changes to this policy",
    p: [
      "If the privacy practices described here ever change, this page will be updated with a new date. Any change that would introduce uploading or tracking will be called out plainly — it is against the design of this product.",
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
    title: "Privacy Policy — PrivyPDF",
    description:
      "PrivyPDF processes every file inside your browser. No uploads, no accounts, no tracking of file contents — what stays on your device and why.",
    alternates: { canonical: canonicalUrl(lang, "/privacy") },
  };
}

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  await params;
  return (
    <LegalDoc title="Privacy Policy" updated={UPDATED} sections={SECTIONS} />
  );
}
