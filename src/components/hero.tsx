"use client";

import { useCallback } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useStore } from "@/lib/store";
import { toolById } from "@/lib/tools";
import { executeRun } from "@/lib/pipeline";
import { Button } from "@/components/kit/button";
import { Dropzone } from "@/components/kit/dropzone";
import { MeshBackdrop } from "@/components/kit/mesh-backdrop";
import { PrivacyIllustration } from "@/components/illustrations";
import { X, ArrowRight, Sparkles, Zap, HardDrive, ShieldCheck } from "lucide-react";

export function Hero() {
  const addFiles = useStore((s) => s.addFiles);
  const files = useStore((s) => s.files);
  const suggestion = useStore((s) => s.suggestion);
  const removeFile = useStore((s) => s.removeFile);
  const openTool = useStore((s) => s.openTool);
  const reduce = useReducedMotion();

  const onFiles = useCallback(
    (list: File[]) => {
      if (list.length) addFiles(list);
    },
    [addFiles]
  );

  const primary = suggestion ? toolById(suggestion.primary) : null;

  return (
    <section className="relative overflow-hidden">
      <MeshBackdrop />
      <div className="relative mx-auto max-w-6xl px-4 pb-2 pt-16 sm:px-6 sm:pt-24">
        <motion.div
          initial={reduce ? undefined : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={reduce ? { duration: 0 } : { duration: 0.4, ease: "easeOut" }}
          className="mx-auto max-w-3xl text-center"
        >
          <div className="mb-6 inline-flex items-center gap-2 rounded-chip border border-border bg-surface-2/70 px-3.5 py-1.5 text-[13px] font-medium text-fg-muted shadow-xs backdrop-blur">
            <Sparkles className="size-3.5 text-primary" />
            One click · Zero uploads · Free forever
          </div>
          <h1 className="text-display font-bold tracking-heading">
            Every PDF tool.{" "}
            <span className="text-gradient">
              None of your files leave this device.
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-body text-fg-muted sm:text-base">
            Drop a file and SwiftPDF figures out the rest — merge, split,
            compress, convert and more, right inside your browser.
          </p>
        </motion.div>

        {/* dropzone */}
        <motion.div
          initial={reduce ? undefined : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={reduce ? { duration: 0 } : { duration: 0.45, delay: 0.08, ease: "easeOut" }}
          className="relative mx-auto mt-10 max-w-3xl"
        >
          <Dropzone
            accept="application/pdf,image/jpeg,image/png,.docx"
            onFiles={onFiles}
            title="Drop PDF or image files here"
            subtitle={
              <>
                or <span className="font-semibold text-primary">click to browse</span> · paste
                with <kbd className="rounded border border-border bg-surface-3 px-1.5 py-0.5 font-mono text-[10px]">Ctrl+V</kbd>
              </>
            }
            hint="Files stay on this device · No account · Works offline"
          />

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
                    className="flex size-5 shrink-0 items-center justify-center rounded-full text-fg-muted transition-colors hover:bg-destructive/10 hover:text-destructive"
                    aria-label={`Remove ${f.name}`}
                  >
                    <X className="size-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* smart suggestion */}
          {suggestion && primary && (
            <motion.div
              initial={reduce ? undefined : { opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 22 }}
              className="mt-6"
            >
              <div className="flex flex-col items-center gap-4 rounded-card border border-border bg-surface-2 p-5 shadow-md sm:flex-row">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-card bg-gradient-brand shadow-glow">
                  <primary.icon className="size-5 text-white" />
                </div>
                <div className="min-w-0 flex-1 text-center sm:text-left">
                  <p className="text-sm font-semibold">
                    <Sparkles className="mr-1 inline size-3.5 text-primary" />
                    {suggestion.reason}
                  </p>
                  <p className="mt-0.5 text-[13px] text-fg-muted">{primary.description}</p>
                </div>
                <div className="flex flex-col items-center gap-2 sm:flex-row">
                  <Button
                    onClick={() => {
                      if (primary.zeroOption) {
                        executeRun(
                          primary.id,
                          files.map((f) => ({ id: f.id, file: f.file })),
                          {}
                        );
                      } else {
                        openTool(suggestion.primary);
                      }
                    }}
                    size="lg"
                  >
                    {primary.zeroOption ? `Run ${primary.name}` : primary.name}
                    <ArrowRight />
                  </Button>
                  {suggestion.alternatives.length > 0 && (
                    <div className="flex flex-wrap justify-center gap-1.5">
                      {suggestion.alternatives.slice(0, 3).map((alt) => {
                        const t = toolById(alt);
                        if (!t) return null;
                        return (
                          <button
                            key={alt}
                            onClick={() => openTool(alt)}
                            className="rounded-control border border-border px-3 py-2 text-[13px] font-medium text-fg-muted transition-colors hover:border-border-strong hover:text-foreground"
                          >
                            {t.name}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* trust strip */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={reduce ? { duration: 0 } : { delay: 0.25, duration: 0.5 }}
          className="mx-auto mt-14 grid max-w-4xl grid-cols-1 gap-3 sm:grid-cols-3"
        >
          {[
            {
              icon: Zap,
              title: "Instant speed",
              desc: "No upload round-trip. Processing starts the moment you click.",
            },
            {
              icon: HardDrive,
              title: "Uses your device, not a quota",
              desc: "Handles the files your device can manage — no artificial caps.",
            },
            {
              icon: ShieldCheck,
              title: "Private by design",
              desc: "Contracts, invoices, IDs — they stay on your machine.",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="flex items-start gap-3 rounded-card border border-border bg-surface-2/60 p-5 text-left shadow-xs backdrop-blur"
            >
              <f.icon className="mt-0.5 size-4.5 shrink-0 text-primary" />
              <div>
                <p className="text-[13px] font-bold">{f.title}</p>
                <p className="mt-1 text-[13px] leading-snug text-fg-muted">{f.desc}</p>
              </div>
            </div>
          ))}
        </motion.div>

        {/* illustration */}
        <div className="mt-12 flex justify-center">
          <PrivacyIllustration className="h-auto w-full max-w-md opacity-90" />
        </div>
      </div>
    </section>
  );
}
