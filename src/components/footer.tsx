"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useStore } from "@/lib/store";
import { TOOLS, type ToolCategory } from "@/lib/tools";
import { LOCALES } from "@/lib/i18n";
import { useCopy, useLocale, useLocaleHref } from "@/lib/i18n-hooks";
import { useToolNav } from "@/lib/use-tool-nav";
import { InstallAppButton } from "./install-prompt";
import { Logo } from "./logo";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

const CAT_ORDER: ToolCategory[] = ["core", "convert", "edit", "security"];
const POPULAR_IDS = ["merge", "split", "compress", "jpg-to-pdf", "pdf-to-word", "protect"] as const;

export function Footer() {
  const nav = useToolNav();
  const localeHref = useLocaleHref();
  const locale = useLocale();
  const pathname = usePathname();
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

  /** same path, different locale — real URLs per language, mirrors the header switcher */
  const localeSwitchHref = (l: string) => {
    const rest = pathname.replace(new RegExp(`^/${locale}(?=/|$)`), "");
    return `/${l}${rest || ""}`;
  };

  const linkCls =
    "flex min-h-11 items-center rounded-control px-0 text-[13px] text-fg-muted outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring";
  const headingCls = "text-micro font-bold uppercase leading-none tracking-wide text-fg-faint";

  /* language chips — 44px targets, active locale marked with aria-current */
  const langChip =
    "inline-flex min-h-11 items-center rounded-chip border px-3.5 text-[13px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring";

  /** language group rendered twice (brand column on desktop, full-width row below the grid on phones) */
  const LangGroup = ({ className }: { className?: string }) => (
    <div className={className}>
      <p className={headingCls}>{t.footer.language}</p>
      <ul className="mt-3 flex flex-wrap gap-1.5">
        {LOCALES.map((l) =>
          l.id === locale ? (
            <li key={l.id}>
              <span aria-current="true" className={cn(langChip, "border-border-strong bg-surface-2 font-semibold text-foreground")}>
                {l.label}
              </span>
            </li>
          ) : (
            <li key={l.id}>
              <Link
                href={localeSwitchHref(l.id)}
                hrefLang={l.hreflang}
                className={cn(langChip, "border-border-subtle text-fg-muted hover:border-border-strong hover:text-foreground")}
              >
                {l.label}
              </Link>
            </li>
          ),
        )}
      </ul>
    </div>
  );

  return (
    <footer className="mt-auto">
      {/* brand hairline — a touch of the gradient instead of a flat border */}
      <div aria-hidden="true" className="h-px bg-gradient-brand opacity-30" />

      <div className="bg-surface-1/60">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-x-6 gap-y-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          {/* brand + language (desktop) */}
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
            <LangGroup className="mt-8 hidden lg:block" />
          </div>

          {/* popular tools — full-width two-column list on phones, one column on desktop */}
          <nav aria-label={t.footer.tools} className="col-span-2 lg:col-span-1">
            <p className={headingCls}>{t.footer.tools}</p>
            <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-0.5 lg:grid-cols-1">
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
            <Link
              href={`${localeHref("/")}#tools`}
              onClick={() => setToolFilter("all")}
              className="mt-2 inline-flex min-h-11 items-center gap-2 rounded-control text-[13px] font-semibold text-foreground outline-none transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
            >
              {t.footer.allTools}
              <span className="rounded-chip bg-surface-3 px-2 py-0.5 text-micro font-semibold tabular-nums text-fg-muted">
                {TOOLS.length}
              </span>
              <ArrowRight className="size-3.5 text-primary" aria-hidden="true" />
            </Link>
          </nav>

          {/* categories — real links to the tools grid (filter pre-selected) */}
          <nav aria-label={t.footer.cats}>
            <p className={headingCls}>{t.footer.cats}</p>
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
            <p className={headingCls}>{t.footer.site}</p>
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

          {/* language (phones / tablets — full-width chip row) */}
          <LangGroup className="col-span-2 lg:hidden" />
        </div>

        <div className="border-t border-border-subtle">
          <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6 text-micro text-fg-faint sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
              <p>{t.footer.copyright}</p>
              <InstallAppButton />
            </div>
            <p>{t.footer.bottom}</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
