import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { LocaleBoundary } from "@/components/locale-boundary";
import { IntentTool } from "@/components/intent-tool";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/kit/accordion";
import { INTENT_SLUGS, intentBySlug } from "@/lib/intent-pages";
import { isLocale, type Lang } from "@/lib/i18n";
import { breadcrumbLd, canonicalUrl, faqLd, howToLd, softwareAppLd } from "@/lib/seo";
import { toolById } from "@/lib/tools";

export function generateStaticParams() {
  return INTENT_SLUGS.map((slug) => ({ locale: "en", slug }));
}

export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const page = intentBySlug(slug);
  if (!page || locale !== "en") return {};
  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: canonicalUrl("en", `/${page.slug}`) },
    openGraph: {
      title: page.title,
      description: page.description,
      url: canonicalUrl("en", `/${page.slug}`),
      type: "website",
      images: [{ url: "/og.png", width: 1200, height: 630, alt: page.h1 }],
    },
    twitter: {
      card: "summary_large_image",
      title: page.title,
      description: page.description,
      images: ["/og.png"],
    },
  };
}

export default async function IntentPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const page = intentBySlug(slug);
  const tool = page ? toolById(page.toolId) : null;
  if (!page || !tool || locale !== "en") notFound();

  const url = canonicalUrl("en", `/${page.slug}`);
  const ld = [
    howToLd({
      name: page.title,
      description: page.description,
      url,
      steps: page.steps,
    }),
    faqLd(page.faqs),
    breadcrumbLd([
      { name: "SwiftPDF", url: canonicalUrl("en", "/") },
      { name: page.h1, url },
    ]),
    softwareAppLd({
      name: `SwiftPDF — ${tool.name}`,
      description: page.description,
      url,
      appType: "WebApplication",
    }),
  ];

  return (
    <LocaleBoundary locale="en">
      <div className="flex min-h-[100dvh] flex-col bg-background">
        <Header />
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
          <nav aria-label="Breadcrumb" className="mb-6 text-[13px] text-fg-faint">
            <Link href="/en" className="hover:text-foreground">
              SwiftPDF
            </Link>
            <span className="mx-1.5">/</span>
            <span className="text-fg-muted">{page.h1}</span>
          </nav>

          <h1 className="text-h1 font-bold tracking-heading">{page.h1}</h1>
          <p className="mt-4 text-body leading-relaxed text-fg-muted">{page.intro[0]}</p>
          <p className="mt-3 text-body leading-relaxed text-fg-muted">{page.intro[1]}</p>

          {/* the working tool — same engine, preset pre-selected */}
          <div className="mt-8">
            <IntentTool toolId={page.toolId} preset={page.preset} />
          </div>

          <section className="mt-12" aria-labelledby="how-steps">
            <h2 id="how-steps" className="text-h3 font-bold tracking-heading">
              Step by step
            </h2>
            <ol className="mt-4 space-y-3">
              {page.steps.map((s, i) => (
                <li key={i} className="flex gap-3.5 rounded-card border border-border bg-surface-1/50 p-4">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-gradient-brand text-[13px] font-bold text-white">
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-sm font-semibold">{s.name}</p>
                    <p className="mt-1 text-[13px] leading-relaxed text-fg-muted">{s.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section className="mt-12" aria-labelledby="intent-faq">
            <h2 id="intent-faq" className="text-h3 font-bold tracking-heading">
              Frequently asked questions
            </h2>
            <div className="mt-4">
              <Accordion type="single" collapsible>
                {page.faqs.map((f, i) => (
                  <AccordionItem key={i} value={`faq-${i}`}>
                    <AccordionTrigger>{f.q}</AccordionTrigger>
                    <AccordionContent>{f.a}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </section>

          <p className="mt-12 rounded-control border border-success/25 bg-success/[0.07] px-4 py-3.5 text-[13px] leading-relaxed text-fg-muted">
            Every tool on this page runs entirely in your browser — nothing is
            uploaded, there is no account, and it keeps working offline once
            loaded.
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
