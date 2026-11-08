import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { LocaleBoundary } from "@/components/locale-boundary";
import { ARTICLES } from "@/lib/blog-articles";
import { INTENT_PAGES } from "@/lib/intent-pages";
import { dictionaries, isLocale, type Lang } from "@/lib/i18n";
import { canonicalUrl, localeAlternates } from "@/lib/seo";

export function generateStaticParams() {
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
    title: "Blog — honest notes on local-first PDFs",
    description:
      "Honest notes on local-first PDF processing: how in-browser tools work, what they can and cannot do, and why files never need to be uploaded.",
    alternates: {
      canonical: canonicalUrl(locale as Lang, "/blog"),
      languages: localeAlternates("/blog"),
    },
    openGraph: {
      title: "Blog — SwiftPDF",
      description:
        "How in-browser PDF tools work, what they can and cannot do — no spin.",
      url: canonicalUrl(locale as Lang, "/blog"),
      type: "website",
      images: [{ url: "/og.png", width: 1200, height: 630, alt: "SwiftPDF blog" }],
    },
  };
}

const posts = ARTICLES.map((a) => ({
  slug: a.slug,
  date: new Date(a.published).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
  }),
  title: a.title,
  minutes: a.minutes,
  excerpt: a.description,
}));

export default async function BlogPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = dictionaries[locale];
  return (
    <LocaleBoundary locale={locale}>
    <div className="flex min-h-[100dvh] flex-col bg-background">
      <Header />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12 sm:px-6 sm:py-16">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-primary">Blog</p>
        <h1 className="mt-2 text-h1 font-bold tracking-heading">
          Honest notes on local-first PDFs
        </h1>
        <p className="mt-3 text-body text-fg-muted">
          How in-browser tools work, what they can and cannot do — written by the same rules the
          product follows: no spin.
        </p>
        {locale !== "en" && (
          <p className="mt-4 rounded-control border border-warning/30 bg-warning/10 px-4 py-3 text-[13px] text-fg-muted">
            {t.blogNote}
          </p>
        )}

        <div className="mt-10 space-y-6">
          {posts.map((p) => (
            <article
              key={p.slug}
              className="rounded-card border border-border bg-surface-1/60 p-6 shadow-xs transition-colors hover:border-border-strong sm:p-8"
            >
              <p className="text-micro font-semibold uppercase tracking-wide text-fg-faint">
                {p.date} · {p.minutes} min read
              </p>
              <h2 className="mt-2 text-h3 font-bold tracking-heading">
                <Link
                  href={`/en/blog/${p.slug}`}
                  className="outline-none after:absolute after:inset-0 after:content-[''] focus-visible:after:ring-2"
                >
                  {p.title}
                </Link>
              </h2>
              <p className="mt-3 text-[14px] leading-relaxed text-fg-muted">{p.excerpt}</p>
              <p className="mt-4 text-[13px] font-semibold text-primary">
                Read the guide →
              </p>
            </article>
          ))}
        </div>

        <section className="mt-14" aria-labelledby="intent-pages">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-primary">
            Quick answers
          </p>
          <h2 id="intent-pages" className="mt-2 text-h3 font-bold tracking-heading">
            Tool guides for specific jobs
          </h2>
          <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {INTENT_PAGES.map((p) => (
              <li key={p.slug}>
                <Link
                  href={`/en/${p.slug}`}
                  className="flex min-h-11 items-center rounded-control border border-border px-4 py-2.5 text-[13px] font-medium text-fg-muted outline-none transition-colors hover:border-border-strong hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {p.h1}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <p className="mt-12 text-center text-[13px] text-fg-muted">
          Ready to try it?{" "}
          <Link
            href={`/${locale}`}
            className="font-semibold text-primary underline-offset-4 hover:underline"
          >
            Open the toolkit
          </Link>{" "}
          — no account, no uploads.
        </p>
      </main>
      <Footer />
    </div>
    </LocaleBoundary>
  );
}
