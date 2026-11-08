import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Inter, Geist_Mono, Noto_Naskh_Arabic, Noto_Sans_Devanagari } from "next/font/google";
import "../globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { Analytics, pwaMetadata } from "@/components/analytics";
import { PwaRegister } from "@/components/pwa-register";
import { LOCALES, localeMeta, type Lang } from "@/lib/i18n";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

/* script-appropriate fonts for Hindi / Urdu / Arabic */
const naskh = Noto_Naskh_Arabic({
  variable: "--font-script",
  subsets: ["arabic"],
  display: "swap",
});

const devanagari = Noto_Sans_Devanagari({
  variable: "--font-script",
  subsets: ["devanagari"],
  display: "swap",
});

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0b0f1a" },
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
  ],
};

export function generateStaticParams() {
  return LOCALES.map((l) => ({ locale: l.id }));
}

export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    metadataBase: new URL(SITE),
    title: {
      default: "SwiftPDF — Fast, private PDF tools in your browser",
      template: "%s | SwiftPDF",
    },
    description:
      "Merge, split, compress, convert, edit and protect PDFs with one click. 100% in-browser processing — your files never leave your device. No sign-up, free forever.",
    keywords: [
      "PDF tools",
      "merge PDF",
      "split PDF",
      "compress PDF",
      "PDF converter",
      "private PDF",
      "browser PDF",
    ],
    ...pwaMetadata(),
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const meta = localeMeta(locale as Lang);
  const scriptFont =
    locale === "hi" ? devanagari : locale === "ur" || locale === "ar" ? naskh : null;

  return (
    <html
      lang={locale}
      dir={meta.dir}
      suppressHydrationWarning
      data-scroll-behavior="smooth"
    >
      <body
        className={`${inter.variable} ${geistMono.variable} ${scriptFont?.variable ?? ""} font-sans antialiased bg-background text-foreground ${
          scriptFont ? "font-script-enabled" : ""
        }`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          {children}
          <Toaster position="top-center" richColors />
          <Analytics />
          <PwaRegister />
        </ThemeProvider>
      </body>
    </html>
  );
}
