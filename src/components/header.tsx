"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { TOOLS, type ToolCategory, type ToolDef } from "@/lib/tools";
import { LOCALES } from "@/lib/i18n";
import { useCopy, useLocale, useLocaleHref } from "@/lib/i18n-hooks";
import { useToolNav } from "@/lib/use-tool-nav";
import { Button } from "@/components/kit/button";
import { IconTile } from "@/components/kit/icon-tile";
import { Modal, ModalContent } from "@/components/kit/modal";
import { categoryMeta } from "@/components/kit/category";
import { useTheme } from "next-themes";
import { Moon, Sun, ShieldCheck, Search, ChevronDown, Globe, Check, X, ArrowRight, BadgeCheck } from "lucide-react";
import { Logo } from "./logo";
import { cn } from "@/lib/utils";

const CAT_ORDER: ToolCategory[] = ["core", "convert", "edit", "security"];

/**
 * Desktop mega-menu column plan: categories chunked into ≤7-item columns so
 * no column dominates the panel height (Convert's 12 tools used to stretch
 * one column while Security left half the panel empty). Continuation columns
 * get an invisible header spacer so every list starts on the same baseline.
 */
const MEGA_CHUNK = 7;
const MEGA_COLS: { cat: ToolCategory; tools: ToolDef[]; header: boolean }[] = (() => {
  const cols: { cat: ToolCategory; tools: ToolDef[]; header: boolean }[] = [];
  for (const cat of CAT_ORDER) {
    const tools = TOOLS.filter((x) => x.category === cat);
    for (let i = 0; i < tools.length; i += MEGA_CHUNK) {
      cols.push({ cat, tools: tools.slice(i, i + MEGA_CHUNK), header: i === 0 });
    }
  }
  return cols;
})();

export function Header() {
  const { resolvedTheme, setTheme } = useTheme();
  const setPalette = useStore((s) => s.setPalette);
  const goHome = useStore((s) => s.goHome);
  const nav = useToolNav();
  const locale = useLocale();
  const localeHref = useLocaleHref();
  const pathname = usePathname();
  const router = useRouter();
  const t = useCopy();

  const [megaOpen, setMegaOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const megaTrigger = useRef<HTMLButtonElement>(null);
  const langTrigger = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const langRef = useRef<HTMLDivElement>(null);

  /* Escape closes menus; outside click closes dropdowns */
  useEffect(() => {
    if (!megaOpen && !langOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (langOpen) {
          setLangOpen(false);
          langTrigger.current?.focus();
        } else {
          setMegaOpen(false);
          megaTrigger.current?.focus();
        }
      }
    };
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (langOpen && langRef.current && !langRef.current.contains(target)) setLangOpen(false);
      if (megaOpen && panelRef.current && !panelRef.current.contains(target) && !megaTrigger.current?.contains(target))
        setMegaOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onClick);
    };
  }, [megaOpen, langOpen]);

  const onToolsClick = () => {
    if (typeof window !== "undefined" && window.innerWidth >= 1024) setMegaOpen((v) => !v);
    else setSheetOpen(true);
  };

  const pickTool = (id: string) => {
    setMegaOpen(false);
    setSheetOpen(false);
    nav(id);
  };

  const pickCategory = (cat: ToolCategory) => {
    useStore.getState().setToolFilter(cat);
    setSheetOpen(false);
    goHome();
    router.push(localeHref("/"));
    setTimeout(() => {
      document.getElementById("tools")?.scrollIntoView({ behavior: "smooth" });
    }, 60);
  };

  /** same path, different locale — real URL per language (hreflang) */
  const localeSwitchHref = (l: string) => {
    const rest = pathname.replace(new RegExp(`^/${locale}(?=/|$)`), "");
    return `/${l}${rest || ""}`;
  };

  /* real-link navigation swaps the SPA to the home view — retry the
     section scroll until the home content has mounted (same as footer) */
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

  const scrollTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  return (
    <header className="sticky top-0 z-40 border-b border-border-subtle bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-1.5 px-3 sm:gap-2.5 sm:px-6">
        <button
          onClick={() => {
            goHome();
            router.push(localeHref("/"));
          }}
          className="mr-1 flex min-h-11 items-center gap-2.5 rounded-control px-1 outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="PrivyPDF home"
        >
          <Logo className="size-8" />
          <span className="hidden text-[17px] font-bold tracking-tight sm:inline">
            Privy<span className="text-[#DC2626] dark:text-[#F87171]">PDF</span>
          </span>
        </button>

        {/* Tools mega-menu / sheet trigger */}
        <div className="relative" ref={panelRef}>
          <Button
            ref={megaTrigger as never}
            variant="ghost"
            size="md"
            onClick={onToolsClick}
            aria-expanded={megaOpen}
            aria-haspopup="true"
            aria-label={t.nav.tools}
            className="rounded-chip px-2 font-semibold sm:px-4"
          >
            {t.nav.tools}
            <ChevronDown
              className={cn("size-4 transition-transform duration-200", megaOpen && "rotate-180")}
              aria-hidden="true"
            />
          </Button>

          {/* Desktop mega panel — chunked, evenly balanced columns */}
          {megaOpen && (
            <div
              role="group"
              aria-label={t.mega.aria}
              className="absolute left-0 top-[calc(100%+10px)] z-50 max-h-[78dvh] w-[min(1120px,calc(100vw-32px))] overflow-y-auto rounded-card border border-border bg-surface-1 p-6 shadow-lg"
            >
              <div
                className="grid gap-x-6"
                style={{ gridTemplateColumns: `repeat(${MEGA_COLS.length}, minmax(0, 1fr))` }}
              >
                {MEGA_COLS.map((col, ci) => {
                  const meta = categoryMeta(col.cat);
                  return (
                    <div key={`${col.cat}-${ci}`}>
                      {col.header ? (
                        <button
                          onClick={() => pickCategory(col.cat)}
                          className="flex h-9 w-full items-center rounded-control px-2 text-left text-[12px] font-bold uppercase leading-none tracking-wide outline-none transition-colors hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-ring"
                          style={{ color: `var(${meta.accentVar})` }}
                        >
                          {t.cats[col.cat]}
                        </button>
                      ) : (
                        <div className="h-9" aria-hidden="true" />
                      )}
                      <ul className="mt-1.5 space-y-0.5">
                        {col.tools.map((tool) => (
                          <li key={tool.id}>
                            <button
                              onClick={() => pickTool(tool.id)}
                              className="flex min-h-11 w-full items-center gap-2 rounded-control px-2 text-left text-[13px] font-medium leading-snug text-fg-muted outline-none transition-colors hover:bg-surface-2 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              <tool.icon
                                className="size-4 shrink-0"
                                style={{ color: `var(${meta.accentVar})` }}
                                aria-hidden="true"
                              />
                              <span>{tool.name}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <Link
          href={localeHref("/blog")}
          className="hidden min-h-11 items-center rounded-control px-3 text-sm font-medium text-fg-muted transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring md:inline-flex"
        >
          {t.nav.blog}
        </Link>

        {/* About — real anchor to the why-on-device section */}
        <Link
          href={`${localeHref("/")}#why`}
          onClick={() => scrollToSection("why")}
          className="hidden min-h-11 items-center rounded-control px-3 text-sm font-medium text-fg-muted transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring md:inline-flex"
        >
          {t.nav.about}
        </Link>

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          {/* free-forever badge — honest: every tool runs free, no account */}
          <div
            className="hidden items-center gap-1.5 whitespace-nowrap rounded-chip border border-primary/25 bg-primary/10 px-3 py-1.5 lg:flex"
            title="Every tool is free — no account, no watermark, no limits."
          >
            <BadgeCheck className="size-3.5 text-primary" aria-hidden="true" />
            <span className="text-micro font-semibold text-primary">{t.nav.freeBadge}</span>
          </div>

          {/* privacy badge — honest, real-time meaningless but true by architecture */}
          <div
            className="hidden items-center gap-1.5 whitespace-nowrap rounded-chip border border-success/25 bg-success/10 px-3 py-1.5 xl:flex"
            title="Files are processed on your device. Nothing is uploaded, ever."
          >
            <ShieldCheck className="size-3.5 text-success" aria-hidden="true" />
            <span className="text-micro font-semibold text-success">{t.nav.privacy}</span>
          </div>

          <Button
            variant="secondary"
            size="md"
            onClick={() => setPalette(true)}
            aria-label={`${t.nav.search} (Ctrl+K)`}
            className="rounded-chip px-2.5 sm:px-4"
          >
            <Search aria-hidden="true" />
            {/* icon-only on phones — less header clutter, text from sm up */}
            <span className="hidden truncate text-[13px] sm:inline sm:text-sm">
              {t.nav.search}
            </span>
            <kbd className="hidden h-5 items-center rounded border border-border bg-surface-3 px-1.5 font-mono text-[10px] text-fg-muted lg:inline-flex">
              Ctrl K
            </kbd>
          </Button>

          {/* language switcher — desktop; on phones it lives inside the Tools sheet */}
          <div className="relative hidden sm:block" ref={langRef}>
            <Button
              ref={langTrigger as never}
              variant="secondary"
              size="icon"
              onClick={() => setLangOpen((v) => !v)}
              aria-expanded={langOpen}
              aria-haspopup="true"
              aria-label={`${t.lang.label}: ${LOCALES.find((l) => l.id === locale)?.label ?? ""}`}
              className="size-11 rounded-chip"
            >
              <Globe aria-hidden="true" />
              <span className="sr-only">{LOCALES.find((l) => l.id === locale)?.short}</span>
            </Button>
            {langOpen && (
              <div
                role="menu"
                aria-label={t.lang.label}
                className="absolute right-0 top-[calc(100%+8px)] z-50 min-w-44 rounded-card border border-border bg-surface-1 p-1.5 shadow-lg"
              >
                {LOCALES.map((l) => (
                  <Link
                    key={l.id}
                    role="menuitemradio"
                    aria-checked={locale === l.id}
                    href={localeSwitchHref(l.id)}
                    onClick={() => setLangOpen(false)}
                    className="flex min-h-11 w-full items-center justify-between rounded-control px-3 text-[13px] font-medium text-fg-muted outline-none transition-colors hover:bg-surface-2 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {l.label}
                    {locale === l.id && <Check className="size-4 text-primary" aria-hidden="true" />}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <Button
            variant="secondary"
            size="icon"
            className="size-11 rounded-chip"
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            aria-label="Toggle theme"
          >
            <Sun className="hidden dark:block" aria-hidden="true" />
            <Moon className="block dark:hidden" aria-hidden="true" />
          </Button>

          {/* primary CTA — scrolls to the hero dropzone */}
          <Button
            variant="primary"
            size="md"
            onClick={scrollTop}
            className="hidden rounded-chip px-4 font-semibold sm:inline-flex"
          >
            {t.nav.getStarted}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Button>
        </div>
      </div>

      {/* Mobile / tablet tools sheet */}
      <Modal open={sheetOpen} onOpenChange={setSheetOpen}>
        <ModalContent
          title={t.mega.mobileTitle}
          description={t.mega.mobileDesc}
          className="max-h-[82dvh] overflow-y-auto"
        >
          <button
            onClick={() => setSheetOpen(false)}
            aria-label="Close"
            className="absolute right-4 top-4 flex size-11 items-center justify-center rounded-chip text-fg-muted outline-none transition-colors hover:bg-surface-3 focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
          <div className="space-y-6">
            {CAT_ORDER.map((cat) => {
              const meta = categoryMeta(cat);
              const tools = TOOLS.filter((x) => x.category === cat);
              return (
                <div key={cat}>
                  <button
                    onClick={() => pickCategory(cat)}
                    className="flex min-h-11 flex-col items-start rounded-control px-2 py-1 text-left outline-none transition-colors hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-ring"
                    style={{ color: `var(${meta.accentVar})` }}
                  >
                    <span className="text-[12px] font-bold uppercase tracking-wide">{t.cats[cat]}</span>
                  </button>
                  <div className="mt-1.5 grid grid-cols-1 gap-0.5 sm:grid-cols-2">
                    {tools.map((tool) => (
                      <button
                        key={tool.id}
                        onClick={() => pickTool(tool.id)}
                        className="flex min-h-11 w-full items-center gap-2.5 rounded-control px-2 text-left text-[13px] font-medium text-fg-muted outline-none transition-colors hover:bg-surface-2 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <IconTile icon={tool.icon} category={tool.category} size="sm" />
                        <span className="truncate">{tool.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}

            {/* language — compact chips (no room for a globe dropdown on phones) */}
            <div className="border-t border-border-subtle pt-5">
              <p className="px-2 text-[11px] font-bold uppercase tracking-wide text-fg-faint">
                {t.lang.label}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {LOCALES.map((l) => (
                  <Link
                    key={l.id}
                    href={localeSwitchHref(l.id)}
                    onClick={() => setSheetOpen(false)}
                    hrefLang={l.id}
                    className={cn(
                      "flex min-h-11 items-center rounded-chip border px-3.5 text-[13px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                      locale === l.id
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : "border-border text-fg-muted hover:bg-surface-2 hover:text-foreground"
                    )}
                  >
                    {l.label}
                    {locale === l.id && <Check className="ml-1.5 size-3.5" aria-hidden="true" />}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </ModalContent>
      </Modal>
    </header>
  );
}
