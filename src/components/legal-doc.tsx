"use client";

import { Header } from "./header";
import { Footer } from "./footer";
import { MeshBackdrop } from "./kit/mesh-backdrop";

export type LegalSection = { h: string; p: string[] };

/**
 * Shared shell for the legal pages (privacy policy, terms of service).
 * Content is authored in English — legal text is deliberately kept in one
 * language so nothing is lost in translation; the pages render for every
 * locale route.
 */
export function LegalDoc({
  title,
  updated,
  sections,
}: {
  title: string;
  updated: string;
  sections: LegalSection[];
}) {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-background">
      <Header />
      <main className="flex-1">
        <div className="relative overflow-hidden border-b border-border-subtle">
          <MeshBackdrop />
          <div className="relative mx-auto max-w-3xl px-4 py-14 sm:px-6">
            <p className="text-micro font-bold uppercase tracking-widest text-primary">
              SwiftPDF
            </p>
            <h1 className="mt-3 text-h1 font-bold tracking-heading">{title}</h1>
            <p className="mt-3 text-[13px] text-fg-muted">
              Last updated: {updated} · This page is currently available in
              English only.
            </p>
          </div>
        </div>
        <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
          {sections.map((s) => (
            <section key={s.h} className="mt-9 first:mt-0">
              <h2 className="text-h3 font-bold tracking-heading">{s.h}</h2>
              {s.p.map((para, i) => (
                <p
                  key={i}
                  className="mt-3 text-[14.5px] leading-relaxed text-fg-muted"
                >
                  {para}
                </p>
              ))}
            </section>
          ))}
          <div className="mt-12 rounded-card border border-border-subtle bg-surface-1/60 p-5 text-[13px] leading-relaxed text-fg-muted">
            Questions or concerns? Open an issue on{" "}
            <a
              href="https://github.com/shabii804/Converter-tool"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-primary outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              GitHub
            </a>{" "}
            — it is the fastest way to reach the maintainer.
          </div>
        </article>
      </main>
      <Footer />
    </div>
  );
}
