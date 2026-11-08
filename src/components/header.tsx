"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { TOOLS, type ToolCategory } from "@/lib/tools";
import { useCopy, LANGS } from "@/lib/i18n";
import { useToolNav } from "@/lib/use-tool-nav";
import { Button } from "@/components/kit/button";
import { IconTile } from "@/components/kit/icon-tile";
import { Modal, ModalContent } from "@/components/kit/modal";
import { categoryMeta } from "@/components/kit/category";
import { useTheme } from "next-themes";
import { Moon, Sun, ShieldCheck, Command, ChevronDown, Globe, Check, X } from "lucide-react";
import { Logo } from "./logo";
import { cn } from "@/lib/utils";

const CAT_ORDER: ToolCategory[] = ["core", "convert", "edit", "security"];

export function Header() {
  const { resolvedTheme, setTheme } = useTheme();
  const setPalette = useStore((s) => s.setPalette);
  const goHome = useStore((s) => s.goHome);
  const nav = useToolNav();
  const lang = useStore((s) => s.lang);
  const setLang = useStore((s) => s.setLang);
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
    setTimeout(() => {
      document.getElementById("tools")?.scrollIntoView({ behavior: "smooth" });
    }, 60);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border-subtle bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-1.5 px-3 sm:gap-2.5 sm:px-6">
        <button
          onClick={goHome}
          className="mr-1 flex min-h-11 items-center gap-2.5 rounded-control px-1 outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="SwiftPDF home"
        >
          <Logo className="size-8" />
          <span className="hidden text-[17px] font-bold tracking-tight sm:inline">
            Swift<span className="text-gradient">PDF</span>
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
            className="rounded-chip font-semibold"
          >
            {t.nav.tools}
            <ChevronDown
              className={cn("size-4 transition-transform duration-200", megaOpen && "rotate-180")}
              aria-hidden="true"
            />
          </Button>

          {/* Desktop mega panel */}
          {megaOpen && (
            <div
              role="group"
              aria-label={t.mega.aria}
              className="absolute left-0 top-[calc(100%+10px)] z-50 grid max-h-[78dvh] w-[min(880px,calc(100vw-32px))] grid-cols-2 gap-x-6 gap-y-5 overflow-y-auto rounded-card border border-border bg-surface-1 p-6 shadow-lg lg:grid-cols-4"
            >
              {CAT_ORDER.map((cat) => {
                const meta = categoryMeta(cat);
                const tools = TOOLS.filter((x) => x.category === cat);
                return (
                  <div key={cat}>
                    <button
                      onClick={() => pickCategory(cat)}
                      className="flex min-h-11 flex-col items-start justify-center rounded-control px-2 text-left outline-none transition-colors hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-ring"
                      style={{ color: `var(${meta.accentVar})` }}
                    >
                      <span className="text-[13px] font-bold uppercase tracking-wide">
                        {t.cats[cat]}
                      </span>
                      <span className="mt-0.5 text-[11px] font-medium normal-case tracking-normal text-fg-faint">
                        {meta.description}
                      </span>
                    </button>
                    <ul className="mt-2 space-y-0.5">
                      {tools.map((tool) => (
                        <li key={tool.id}>
                          <button
                            onClick={() => pickTool(tool.id)}
                            className="flex min-h-11 w-full items-center gap-2.5 rounded-control px-2 text-left text-[13px] font-medium text-fg-muted outline-none transition-colors hover:bg-surface-2 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            <IconTile icon={tool.icon} category={tool.category} size="sm" />
                            <span className="truncate">{tool.name}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <Link
          href="/blog"
          className="hidden min-h-11 items-center rounded-control px-3 text-sm font-medium text-fg-muted transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring md:inline-flex"
        >
          {t.nav.blog}
        </Link>

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
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
            className="rounded-chip px-3 sm:px-4"
          >
            <Command aria-hidden="true" />
            <span className="hidden md:inline">{t.nav.search}</span>
            <kbd className="hidden h-5 items-center rounded border border-border bg-surface-3 px-1.5 font-mono text-[10px] text-fg-muted lg:inline-flex">
              Ctrl K
            </kbd>
          </Button>

          {/* language switcher */}
          <div className="relative" ref={langRef}>
            <Button
              ref={langTrigger as never}
              variant="secondary"
              size="icon"
              onClick={() => setLangOpen((v) => !v)}
              aria-expanded={langOpen}
              aria-haspopup="true"
              aria-label={`${t.lang.label}: ${LANGS.find((l) => l.id === lang)?.label ?? ""}`}
              className="size-11 rounded-chip"
            >
              <Globe aria-hidden="true" />
              <span className="sr-only">{LANGS.find((l) => l.id === lang)?.short}</span>
            </Button>
            {langOpen && (
              <div
                role="menu"
                aria-label={t.lang.label}
                className="absolute right-0 top-[calc(100%+8px)] z-50 min-w-44 rounded-card border border-border bg-surface-1 p-1.5 shadow-lg"
              >
                {LANGS.map((l) => (
                  <button
                    key={l.id}
                    role="menuitemradio"
                    aria-checked={lang === l.id}
                    onClick={() => {
                      setLang(l.id);
                      setLangOpen(false);
                      langTrigger.current?.focus();
                    }}
                    className="flex min-h-11 w-full items-center justify-between rounded-control px-3 text-[13px] font-medium text-fg-muted outline-none transition-colors hover:bg-surface-2 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {l.label}
                    {lang === l.id && <Check className="size-4 text-primary" aria-hidden="true" />}
                  </button>
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
          </div>
        </ModalContent>
      </Modal>
    </header>
  );
}
