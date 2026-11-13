"use client";

import Link from "next/link";
import { useStore } from "@/lib/store";
import { TOOLS, type ToolCategory } from "@/lib/tools";
import { useCopy, useLocaleHref } from "@/lib/i18n-hooks";
import { useToolNav } from "@/lib/use-tool-nav";
import { InstallAppButton } from "./install-prompt";
import { Logo } from "./logo";
import { ShieldCheck } from "lucide-react";

const CAT_ORDER: ToolCategory[] = ["core", "convert", "edit", "security"];
const POPULAR_IDS = ["merge", "split", "compress", "jpg-to-pdf", "pdf-to-word", "protect"] as const;

export function Footer() {
  const nav = useToolNav();
  const localeHref = useLocaleHref();
  const setToolFilter = useStore((s) => s.setToolFilter);
  const t = useCopy();

  /* real-link navigation swaps the SPA to the home view — retry the
     section scroll until the home content has mounted */
  const scrollToSection = (id: string) => {
    const t0 = performance.now();
    const tryScroll = () => {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
      } else if (performance.now() - t0 < 1200) {
        setTimeout(tryScroll, 120);
      }
    };
    setTimeout(tryScroll, 120);
  };

  const linkCls =
    "flex min-h-11 items-center rounded-control px-0 text-[13px] text-fg-muted outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <footer className="mt-auto border-t border-border-subtle bg-surface-1/60">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-x-6 gap-y-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
        {/* brand */}
        <div className="col-span-2 lg:col-span-1">
          <div className="flex items-center gap-2.5">
            <Logo className="size-7" />
            <span className="text-[16px] font-bold tracking-tight">
              Swift<span className="text-gradient">PDF</span>
            </span>
          </div>
          <p className="mt-3 max-w-xs text-[13px] leading-relaxed text-fg-muted">{t.footer.tagline}</p>
          <div className="mt-4 inline-flex items-center gap-1.5 rounded-chip border border-success/25 bg-success/10 px-3 py-1.5">
            <ShieldCheck className="size-3.5 text-success" aria-hidden="true" />
            <span className="text-micro font-semibold text-success">{t.nav.privacy}</span>
          </div>
        </div>

        {/* popular tools */}
        <nav aria-label={t.footer.tools}>
          <p className="px-0 text-[12px] font-bold uppercase tracking-wide text-fg-faint">
            {t.footer.tools}
          </p>
          <ul className="mt-3 space-y-0.5">
            {POPULAR_IDS.map((id) => {
              const tool = TOOLS.find((x) => x.id === id);
              if (!tool) return null;
              return (
                <li key={id}>
                  <Link href={localeHref(`/tool/${id}`)} className={linkCls}>
                    {tool.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* categories — real links to the tools grid (filter pre-selected) */}
        <nav aria-label={t.footer.cats}>
          <p className="text-[12px] font-bold uppercase tracking-wide text-fg-faint">
            {t.footer.cats}
          </p>
          <ul className="mt-3 space-y-0.5">
            {CAT_ORDER.map((cat) => (
              <li key={cat}>
                <Link
                  href={`${localeHref("/")}#tools`}
                  onClick={() => setToolFilter(cat)}
                  className={linkCls}
                >
                  {t.cats[cat]}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* site */}
        <nav aria-label={t.footer.site}>
          <p className="text-[12px] font-bold uppercase tracking-wide text-fg-faint">
            {t.footer.site}
          </p>
          <ul className="mt-3 space-y-0.5">
            <li>
              <Link href={localeHref("/blog")} className={linkCls}>
                {t.nav.blog}
              </Link>
            </li>
            <li>
              {/* real anchor URLs — shareable, crawlable; the SPA switches to
                  the home view via AppShell, then we scroll to the section */}
              <Link
                href={`${localeHref("/")}#faq`}
                className={linkCls}
                onClick={() => scrollToSection("faq")}
              >
                {t.footer.faq}
              </Link>
            </li>
            <li>
              <Link
                href={`${localeHref("/")}#how`}
                className={linkCls}
                onClick={() => scrollToSection("how")}
              >
                {t.footer.how}
              </Link>
            </li>
            <li>
              <Link href={localeHref("/design")} className={linkCls}>
                Design system
              </Link>
            </li>
          </ul>
        </nav>
      </div>

      <div className="border-t border-border-subtle">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-5 text-micro text-fg-faint sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
            <p>{t.footer.copyright}</p>
            <InstallAppButton />
          </div>
          <p>{t.footer.bottom}</p>
        </div>
      </div>
    </footer>
  );
}
