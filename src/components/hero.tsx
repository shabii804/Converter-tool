"use client";

import Image from "next/image";
import { useCallback } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useStore } from "@/lib/store";
import { TOOLS, toolById } from "@/lib/tools";
import { useToolNav } from "@/lib/use-tool-nav";
import { executeRun } from "@/lib/pipeline";
import { useCopy } from "@/lib/i18n-hooks";
import { Button } from "@/components/kit/button";
import { Dropzone } from "@/components/kit/dropzone";
import { IconTile } from "@/components/kit/icon-tile";
import { MeshBackdrop } from "@/components/kit/mesh-backdrop";
import {
  X,
  ArrowRight,
  ArrowDown,
  Sparkles,
  ShieldCheck,
  WifiOff,
  UserRoundX,
  BadgeCheck,
  InfinityIcon,
} from "lucide-react";

export function Hero() {
  const addFiles = useStore((s) => s.addFiles);
  const files = useStore((s) => s.files);
  const suggestion = useStore((s) => s.suggestion);
  const removeFile = useStore((s) => s.removeFile);
  const nav = useToolNav();
  const pushRecent = useStore((s) => s.pushRecent);
  const reduce = useReducedMotion();
  const t = useCopy();

  /* quick-access toolbar under the hero — real tool launches, "More" scrolls to the grid */
  const QUICK_TOOLS = [
    { id: "pdf-to-word", label: t.quick.convert },
    { id: "compress", label: t.quick.compress },
    { id: "merge", label: t.quick.merge },
    { id: "split", label: t.quick.split },
    { id: "edit-pdf", label: t.quick.edit },
    { id: "protect", label: t.quick.protect },
    { id: "unlock", label: t.quick.unlock },
  ] as const;

  const onFiles = useCallback(
    (list: File[]) => {
      if (list.length) addFiles(list);
    },
    [addFiles]
  );

  const primary = suggestion ? toolById(suggestion.primary) : null;

  const reason =
    suggestion?.reasonKey === "combine"
      ? t.sug.combine.replace("{n}", String(suggestion.count))
      : suggestion?.reasonKey === "convert"
        ? t.sug.convert.replace("{n}", String(suggestion.count))
        : suggestion
          ? t.sug.one
          : "";

  const scrollToTools = () =>
    document.getElementById("tools")?.scrollIntoView({ behavior: reduce ? "auto" : "smooth" });

  return (
    <section className="relative overflow-hidden">
      <MeshBackdrop />
      <div className="relative mx-auto max-w-7xl px-4 pb-2 pt-4 sm:px-6 sm:pt-8">
        <div className="grid items-center gap-4 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10">
          {/* left — heading, description, compact dropzone */}
          <div>
            <p className="flex items-center gap-1.5 text-xs font-semibold text-fg-muted sm:text-[13px]">
              <Sparkles className="size-3.5 text-primary" aria-hidden="true" />
              {t.hero.eyebrow.replace("{n}", String(TOOLS.length))}
            </p>
            <h1 className="mt-2.5 text-[27px] font-bold leading-[1.12] tracking-heading sm:text-[42px] lg:text-[46px]">
              <span className="block">{t.hero.h1a}</span>
              <span className="block text-gradient">{t.hero.h1b}</span>
            </h1>
            <p className="mt-2.5 max-w-xl text-body text-fg-muted sm:text-base">
              {t.hero.sub}
            </p>

            {/* dropzone (Ctrl+V paste handled inside Dropzone) */}
            <div className="relative mt-4 sm:mt-6">
              <Dropzone
                compact
                accept="application/pdf,image/jpeg,image/png,.docx"
                onFiles={onFiles}
                title={t.hero.dropTitle}
                subtitle={
                  <>
                    <span className="font-semibold text-primary">{t.hero.dropBrowse}</span>
                    {/* paste needs a keyboard — desktop-only affordance */}
                    <span className="hidden sm:inline">
                      {" · "}{t.hero.dropPaste}{" "}
                      <kbd className="rounded border border-border bg-surface-3 px-1.5 py-0.5 font-mono text-[10px]">
                        Ctrl+V
                      </kbd>
                    </span>
                  </>
                }
                hint={
                  <span className="inline-flex flex-wrap items-center justify-center gap-1.5 sm:justify-end">
                    <span className="sr-only">{t.hero.formatsLabel}</span>
                    {["PDF", "JPG", "PNG", "DOCX"].map((f) => (
                      <span
                        key={f}
                        className="rounded-chip border border-border bg-surface-2 px-2 py-0.5 font-mono text-[10px] font-semibold tracking-wide text-fg-muted"
                      >
                        {f}
                      </span>
                    ))}
                  </span>
                }
              />
              {/* honest size note — there is no artificial upload cap */}
              <p className="mt-1.5 flex items-center justify-center gap-1.5 text-micro text-fg-faint">
                <InfinityIcon className="size-3.5" aria-hidden="true" />
                {t.hero.noLimit}
              </p>
            </div>

            {/* trust chips — light inline row, wraps on phones */}
            <div className="mt-2.5 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 sm:justify-start">
              {[
                { icon: ShieldCheck, label: t.hero.chips.private, cls: "text-success" },
                { icon: WifiOff, label: t.hero.chips.offline, cls: "text-primary" },
                { icon: UserRoundX, label: t.hero.chips.nosignup, cls: "text-primary" },
                { icon: BadgeCheck, label: t.hero.chips.free, cls: "text-primary" },
              ].map((c) => (
                <span
                  key={c.label}
                  className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-fg-muted"
                >
                  <c.icon className={`size-3.5 ${c.cls}`} aria-hidden="true" />
                  {c.label}
                </span>
              ))}
            </div>
          </div>

          {/* right — brand artwork with floating proof chips */}
          <div className="relative mx-auto w-full max-w-xl lg:max-w-none">
            <div className="relative aspect-[2/1] overflow-hidden rounded-card border border-border bg-surface-2 shadow-lg sm:aspect-[7/4]">
              <Image
                src="/hero-art.png"
                alt=""
                aria-hidden="true"
                width={1344}
                height={768}
                sizes="(min-width: 1024px) 600px, calc(100vw - 32px)"
                className="h-full w-full object-cover"
                priority
              />
            </div>
            {!reduce && (
              <>
                <motion.div
                  aria-hidden="true"
                  animate={{ y: [0, -8, 0] }}
                  transition={{ repeat: Infinity, duration: 4.5, ease: "easeInOut" }}
                  className="absolute -right-3 top-6 inline-flex items-center gap-1.5 rounded-chip border border-border bg-surface-2/90 px-3 py-2 text-[12px] font-semibold text-fg-muted shadow-md backdrop-blur sm:-right-5"
                >
                  <ShieldCheck className="size-3.5 text-success" aria-hidden="true" />
                  {t.hero.chips.private}
                </motion.div>
                <motion.div
                  aria-hidden="true"
                  animate={{ y: [0, 8, 0] }}
                  transition={{ repeat: Infinity, duration: 5, ease: "easeInOut", delay: 0.6 }}
                  className="absolute -left-3 bottom-8 inline-flex items-center gap-1.5 rounded-chip border border-border bg-surface-2/90 px-3 py-2 text-[12px] font-semibold text-fg-muted shadow-md backdrop-blur sm:-left-5"
                >
                  <WifiOff className="size-3.5 text-primary" aria-hidden="true" />
                  {t.hero.chips.offline}
                </motion.div>
              </>
            )}
          </div>
        </div>

        {/* selected files chips */}
        {files.length > 0 && (
          <div className="mx-auto mt-6 flex max-w-3xl flex-wrap justify-center gap-2">
            {files.map((f) => (
              <span
                key={f.id}
                className="inline-flex max-w-[240px] items-center gap-1.5 rounded-chip border border-border bg-surface-2 py-1.5 pl-3 pr-1.5 text-micro shadow-xs"
              >
                <span className="truncate font-medium">{f.name}</span>
                <button
                  onClick={() => removeFile(f.id)}
                  className="flex size-6 shrink-0 items-center justify-center rounded-full text-fg-muted transition-colors hover:bg-destructive/10 hover:text-destructive"
                  aria-label={`Remove ${f.name}`}
                >
                  <X className="size-3" aria-hidden="true" />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* smart suggestion (auto tool detection preserved) */}
        {suggestion && primary && (
          <motion.div
            initial={reduce ? undefined : { opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
            className="mx-auto mt-6 max-w-3xl"
          >
            <div className="flex flex-col items-center gap-4 rounded-card border border-border bg-surface-2 p-5 shadow-md sm:flex-row">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-card bg-gradient-brand shadow-glow">
                <primary.icon className="size-5 text-white" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1 text-center sm:text-left">
                <p className="text-sm font-semibold">
                  <Sparkles className="mr-1 inline size-3.5 text-primary" aria-hidden="true" />
                  {reason}
                </p>
                <p className="mt-0.5 text-[13px] text-fg-muted">{primary.description}</p>
              </div>
              <div className="flex flex-col items-center gap-2 sm:flex-row">
                <Button
                  onClick={() => {
                    pushRecent(primary.id);
                    if (primary.zeroOption) {
                      executeRun(
                        primary.id,
                        files.map((f) => ({ id: f.id, file: f.file })),
                        {}
                      );
                    } else {
                      nav(suggestion.primary);
                    }
                  }}
                  size="lg"
                >
                  {primary.name}
                  <ArrowRight aria-hidden="true" />
                </Button>
                {suggestion.alternatives.length > 0 && (
                  <div className="flex flex-wrap justify-center gap-1.5">
                    {suggestion.alternatives.slice(0, 3).map((alt) => {
                      const altTool = toolById(alt);
                      if (!altTool) return null;
                      return (
                        <button
                          key={alt}
                          onClick={() => nav(alt)}
                          className="flex min-h-11 items-center rounded-control border border-border px-3 py-2 text-[13px] font-medium text-fg-muted transition-colors hover:border-border-strong hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          {altTool.name}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* quick tools — one horizontal toolbar; wraps on phones so every tile stays on screen */}
        <div className="mt-6 sm:mt-8">
          <p className="mb-2 text-center text-[11px] font-bold uppercase tracking-[0.14em] text-fg-faint">
            {t.hero.popularTools}
          </p>
          <div className="flex flex-wrap justify-center gap-2 sm:gap-2.5">
            {QUICK_TOOLS.map((q) => {
              const tool = toolById(q.id);
              if (!tool) return null;
              return (
                <button
                  key={q.id}
                  onClick={() => nav(q.id)}
                  className="group flex min-h-[64px] w-[72px] flex-col items-center justify-center gap-1 rounded-card border border-border bg-surface-2/80 p-2 text-center shadow-xs outline-none backdrop-blur transition-[border-color,box-shadow,translate] duration-200 hover:-translate-y-0.5 hover:border-border-strong hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring sm:w-[80px]"
                >
                  <IconTile
                    icon={tool.icon}
                    category={tool.category}
                    size="sm"
                    className="transition-transform duration-200 group-hover:scale-110"
                  />
                  <span className="text-xs font-semibold leading-tight text-fg-muted transition-colors group-hover:text-foreground">
                    {q.label}
                  </span>
                </button>
              );
            })}
            <button
              onClick={scrollToTools}
              className="group flex min-h-[64px] w-[72px] flex-col items-center justify-center gap-1 rounded-card border border-dashed border-border bg-surface-2/40 p-2 text-center outline-none transition-[border-color,box-shadow,translate] duration-200 hover:-translate-y-0.5 hover:border-border-strong hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring sm:w-[80px]"
            >
              <span className="flex size-7 items-center justify-center rounded-[10px] border border-border bg-surface-3 transition-transform duration-200 group-hover:scale-110">
                <ArrowDown className="size-3.5 text-fg-muted" aria-hidden="true" />
              </span>
              <span className="text-xs font-semibold leading-tight text-fg-muted transition-colors group-hover:text-foreground">
                {t.quick.more}
              </span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
