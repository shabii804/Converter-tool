import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { LocaleBoundary } from "@/components/locale-boundary";
import { ShareButton } from "@/components/share-button";
import { AdSlot } from "@/components/ad-slot";
import { ARTICLES, articleBySlug } from "@/lib/blog-articles";
import { isLocale, type Lang } from "@/lib/i18n";
import { breadcrumbLd, canonicalUrl } from "@/lib/seo";
import { toolById } from "@/lib/tools";

export function generateStaticParams() {
  return ARTICLES.map((a) => ({ locale: "en", slug: a.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const article = articleBySlug(slug);
  if (!article || locale !== "en") return {};
  return {
    title: article.title,
    description: article.description,
    alternates: { canonical: canonicalUrl("en", `/blog/${article.slug}`) },
    openGraph: {
      title: article.title,
      description: article.description,
      url: canonicalUrl("en", `/blog/${article.slug}`),
      type: "article",
      publishedTime: article.published,
      images: article.sections.find((s) => s.image)?.image
        ? [{ url: article.sections.find((s) => s.image)!.image!.src, alt: article.sections.find((s) => s.image)!.image!.alt }]
        : [{ url: "/og.png", width: 1200, height: 630, alt: article.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description: article.description,
    },
  };
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const article = articleBySlug(slug);
  if (!article || locale !== "en") notFound();
  const tool = article.toolId ? toolById(article.toolId) : null;

  const url = canonicalUrl("en", `/blog/${article.slug}`);
  const ld = [
    {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: article.title,
      description: article.description,
      datePublished: article.published,
      url,
      image: article.sections.find((s) => s.image)?.image?.src,
      publisher: { "@type": "Organization", name: "SwiftPDF" },
    },
    breadcrumbLd([
      { name: "SwiftPDF", url: canonicalUrl("en", "/") },
      { name: "Blog", url: canonicalUrl("en", "/blog") },
      { name: article.title, url },
    ]),
  ];

  return (
    <LocaleBoundary locale="en">
      <div className="flex min-h-[100dvh] flex-col bg-background">
        <Header />
        <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
          <nav aria-label="Breadcrumb" className="mb-6 text-[13px] text-fg-faint">
            <Link href="/en" className="hover:text-foreground">
              SwiftPDF
            </Link>
            <span className="mx-1.5">/</span>
            <Link href="/en/blog" className="hover:text-foreground">
              Blog
            </Link>
            <span className="mx-1.5">/</span>
            <span className="text-fg-muted">{article.title}</span>
          </nav>

          <h1 className="text-h1 font-bold tracking-heading">{article.title}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-[13px] text-fg-faint">
            <time dateTime={article.published}>
              {new Date(article.published).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </time>
            <span aria-hidden="true">·</span>
            <span>{article.minutes} min read</span>
            <ShareButton title={article.title} url={url} />
          </div>

          <div className="mt-8 space-y-10">
            {article.sections.map((section, si) => (
              <section key={si}>
                <h2 className="text-h3 font-bold tracking-heading">{section.heading}</h2>
                {section.paragraphs.map((p, pi) => (
                  <p key={pi} className="mt-3 text-[15px] leading-relaxed text-fg-muted">
                    {p}
                  </p>
                ))}
                {section.steps && (
                  <ol className="mt-4 space-y-2.5">
                    {section.steps.map((step, sti) => (
                      <li key={sti} className="flex gap-3 text-[14px] leading-relaxed text-fg-muted">
                        <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[12px] font-bold text-primary">
                          {sti + 1}
                        </span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                )}
                {section.image && (
                  <figure className="mt-5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={section.image.src}
                      alt={section.image.alt}
                      width={1280}
                      height={800}
                      loading={si === 0 ? "eager" : "lazy"}
                      className="w-full rounded-card border border-border shadow-sm"
                    />
                    <figcaption className="mt-2 text-center text-[12px] text-fg-faint">
                      {section.image.alt}
                    </figcaption>
                  </figure>
                )}
              </section>
            ))}
          </div>

          <AdSlot height={90} slot="blog-article-footer" />
          {tool && (
            <div className="mt-12 rounded-card border border-border bg-surface-1/60 p-6 text-center">
              <p className="text-sm font-semibold">Try it yourself — it stays on your device</p>
              <p className="mt-1 text-[13px] text-fg-muted">{tool.description}</p>
              <Link
                href={`/en/tool/${tool.id}`}
                className="mt-4 inline-flex min-h-11 items-center rounded-control bg-gradient-brand px-6 text-sm font-semibold text-white shadow-glow outline-none transition-[filter] hover:brightness-105 focus-visible:ring-2 focus-visible:ring-ring"
              >
                Open {tool.name}
              </Link>
            </div>
          )}

          <p className="mt-10 text-center text-[13px] text-fg-muted">
            More honest notes in the{" "}
            <Link href="/en/blog" className="font-semibold text-primary underline-offset-4 hover:underline">
              blog index
            </Link>
            .
          </p>
        </main>
        <Footer />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }}
        />
      </div>
    </LocaleBoundary>
  );
}
