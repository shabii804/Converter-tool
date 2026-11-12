"use client";

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

  // quick-launch cluster shown right inside the hero
  const POPULAR_TOOLS = ["merge", "split", "compress", "pdf-to-jpg", "jpg-to-pdf", "rotate"] as const;

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

  return (
    <section className="relative overflow-hidden">
      <MeshBackdrop />
      <div className="relative mx-auto max-w-6xl px-4 pb-2 pt-8 sm:px-6 sm:pt-12">
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-4 flex items-center justify-center gap-1.5 text-xs font-semibold text-fg-muted sm:text-[13px]">
            <Sparkles className="size-3.5 text-primary" aria-hidden="true" />
            {t.hero.eyebrow.replace("{n}", String(TOOLS.length))}
          </p>
          <h1 className="text-display font-bold tracking-heading">
            {t.hero.h1a}{" "}
            <span className="text-gradient">{t.hero.h1b}</span>
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-body text-fg-muted sm:mt-4 sm:text-base">
            {t.hero.sub}
          </p>
        </div>

        {/* dropzone (Ctrl+V paste handled inside Dropzone) */}
        <div className="relative mx-auto mt-6 max-w-3xl sm:mt-8">
          <Dropzone
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
              <span className="inline-flex flex-wrap items-center justify-center gap-1.5">
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

          {/* trust chips — balanced 2×2 grid on phones, single row on ≥sm */}
          <div className="mt-4 grid grid-cols-2 justify-items-center gap-2 sm:flex sm:flex-wrap sm:items-center sm:justify-center">
            {[
              { icon: ShieldCheck, label: t.hero.chips.private, cls: "text-success" },
              { icon: WifiOff, label: t.hero.chips.offline, cls: "text-primary" },
              { icon: UserRoundX, label: t.hero.chips.nosignup, cls: "text-primary" },
              { icon: BadgeCheck, label: t.hero.chips.free, cls: "text-primary" },
            ].map((c) => (
              <span
                key={c.label}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-chip border border-border bg-surface-2/70 px-3 py-2 text-[13px] font-medium text-fg-muted shadow-xs backdrop-blur sm:w-auto sm:py-1.5"
              >
                <c.icon className={`size-3.5 ${c.cls}`} aria-hidden="true" />
                {c.label}
              </span>
            ))}
          </div>

          {/* popular tools — launch straight from the hero; 2-col grid on phones */}
          <div className="mt-6">
            <p className="mb-2.5 text-center text-[11px] font-bold uppercase tracking-[0.14em] text-fg-faint">
              {t.hero.popularTools}
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-2.5 lg:grid-cols-6">
              {POPULAR_TOOLS.map((id) => {
                const tool = toolById(id);
                if (!tool) return null;
                return (
                  <button
                    key={id}
                    onClick={() => nav(id)}
                    className="group flex min-h-[76px] flex-col items-center justify-center gap-2 rounded-card border border-border bg-surface-2/80 p-3 text-center shadow-xs outline-none backdrop-blur transition-[border-color,box-shadow,translate] duration-200 hover:-translate-y-0.5 hover:border-border-strong hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <IconTile
                      icon={tool.icon}
                      category={tool.category}
                      size="sm"
                      className="transition-transform duration-200 group-hover:scale-110"
                    />
                    <span className="text-xs font-semibold leading-tight text-fg-muted transition-colors group-hover:text-foreground">
                      {tool.name}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="mt-2.5 text-center">
              <a
                href="#tools"
                className="inline-flex min-h-11 items-center gap-1 text-[13px] font-semibold text-primary outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
              >
                {t.hero.viewAll}
                <ArrowDown className="size-3.5" aria-hidden="true" />
              </a>
            </p>
          </div>

          {/* selected files chips */}
          {files.length > 0 && (
            <div className="mt-4 flex flex-wrap justify-center gap-2">
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
              className="mt-6"
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
        </div>
      </div>
    </section>
  );
}
