"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "@/lib/store";
import { toolById } from "@/lib/tools";
import { executeRun } from "@/lib/pipeline";
import { Button } from "@/components/ui/button";
import {
  UploadCloud,
  Sparkles,
  ArrowRight,
  ClipboardPaste,
  ShieldCheck,
  Zap,
  Infinity as InfinityIcon,
} from "lucide-react";

export function Hero() {
  const addFiles = useStore((s) => s.addFiles);
  const files = useStore((s) => s.files);
  const suggestion = useStore((s) => s.suggestion);
  const removeFile = useStore((s) => s.removeFile);
  const openTool = useStore((s) => s.openTool);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      dragDepth.current = 0;
      setDragging(false);
      const list = Array.from(e.dataTransfer.files || []);
      if (list.length) addFiles(list);
    },
    [addFiles]
  );

  const onDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    dragDepth.current++;
    setDragging(true);
  };
  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    dragDepth.current--;
    if (dragDepth.current <= 0) setDragging(false);
  };

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const list = Array.from(e.clipboardData?.files || []);
      if (list.length) {
        e.preventDefault();
        addFiles(list);
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [addFiles]);

  const primary = suggestion ? toolById(suggestion.primary) : null;

  return (
    <section className="relative overflow-hidden">
      {/* soft background glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -top-32 h-80 bg-[radial-gradient(60%_60%_at_50%_0%,rgba(37,99,235,0.10),transparent)] dark:bg-[radial-gradient(60%_60%_at_50%_0%,rgba(96,165,250,0.14),transparent)]"
      />
      <div className="relative mx-auto max-w-6xl px-4 pb-2 pt-12 sm:px-6 sm:pt-16">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mx-auto max-w-3xl text-center"
        >
          <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            One click · Zero uploads · Free forever
          </div>
          <h1 className="text-3xl font-bold leading-[1.15] tracking-tight sm:text-5xl">
            Every PDF tool.
            <br />
            <span className="bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
              None of your files leave this device.
            </span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm text-muted-foreground sm:text-base">
            Drop a file and SwiftPDF figures out the rest — merge, split,
            compress, convert and more, right inside your browser.
          </p>
        </motion.div>

        {/* dropzone */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.08 }}
          onDrop={onDrop}
          onDragOver={(e) => e.preventDefault()}
          onDragEnter={onDragEnter}
          onDragLeave={onDragLeave}
          className="relative mx-auto mt-8 sm:mt-10"
        >
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            aria-label="Choose files"
            className={`block w-full cursor-pointer rounded-3xl border-2 border-dashed bg-card/60 p-8 text-center shadow-sm outline-none transition-all duration-200 hover:border-primary/50 hover:bg-primary/[0.03] hover:shadow-md focus-visible:ring-2 focus-visible:ring-primary/50 sm:p-12 ${
              dragging
                ? "scale-[1.01] border-primary bg-primary/[0.06] shadow-lg"
                : "border-border"
            }`}
          >
            <motion.div
              animate={
                dragging
                  ? { y: [0, -8, 0], scale: 1.06 }
                  : { y: 0, scale: 1 }
              }
              transition={
                dragging
                  ? { repeat: Infinity, duration: 1.1, ease: "easeInOut" }
                  : { duration: 0.2 }
              }
              className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 sm:h-[72px] sm:w-[72px]"
            >
              <UploadCloud className="h-8 w-8 text-primary sm:h-9 sm:w-9" />
            </motion.div>
            <p className="text-base font-semibold sm:text-lg">
              {dragging ? "Drop them right here" : "Drop PDF or image files here"}
            </p>
            <p className="mt-1.5 text-xs text-muted-foreground sm:text-sm">
              or <span className="font-semibold text-primary">click to browse</span>
              {" "}· paste with{" "}
              <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px]">
                Ctrl+V
              </kbd>
            </p>
            <p className="mt-3 text-[11px] text-muted-foreground/80">
              No size limits · No account · Files never touch a server
            </p>
          </button>
          <input
            ref={inputRef}
            type="file"
            multiple
            className="hidden"
            accept="application/pdf,image/jpeg,image/png,.docx"
            onChange={(e) => {
              const list = Array.from(e.target.files || []);
              if (list.length) addFiles(list);
              e.target.value = "";
            }}
          />
        </motion.div>

        {/* selected files chips */}
        <AnimatePresence>
          {files.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mx-auto mt-4 max-w-3xl overflow-hidden"
            >
              <div className="flex flex-wrap justify-center gap-2">
                {files.map((f) => (
                  <span
                    key={f.id}
                    className="group inline-flex max-w-[240px] items-center gap-1.5 rounded-full border bg-card py-1.5 pl-3 pr-1.5 text-xs shadow-sm"
                  >
                    <span className="truncate font-medium">{f.name}</span>
                    <button
                      onClick={() => removeFile(f.id)}
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                      aria-label={`Remove ${f.name}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* smart suggestion */}
        <AnimatePresence>
          {suggestion && primary && (
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ type: "spring", stiffness: 260, damping: 22 }}
              className="mx-auto mt-5 max-w-3xl"
            >
              <div className="flex flex-col items-center gap-3 rounded-2xl border border-primary/25 bg-primary/[0.04] p-4 shadow-sm sm:flex-row sm:gap-4 sm:p-5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                  <primary.icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1 text-center sm:text-left">
                  <p className="text-sm font-semibold">
                    <Sparkles className="mr-1 inline h-3.5 w-3.5 text-primary" />
                    {suggestion.reason}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {primary.description}
                  </p>
                </div>
                <div className="flex flex-col items-center gap-2 sm:flex-row">
                  <Button
                    onClick={() => {
                      if (primary.zeroOption) {
                        // true one-click: zero-option tools run immediately
                        executeRun(
                          primary.id,
                          files.map((f) => ({ id: f.id, file: f.file })),
                          {}
                        );
                      } else {
                        openTool(suggestion.primary);
                      }
                    }}
                    className="h-11 w-full rounded-xl px-5 text-sm font-semibold shadow-sm sm:w-auto"
                  >
                    {primary.zeroOption ? `Run ${primary.name}` : primary.name}
                    <ArrowRight className="ml-1.5 h-4 w-4" />
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
                            className="rounded-lg border px-3 py-2 text-xs font-medium text-muted-foreground transition hover:border-primary/40 hover:text-primary"
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
        </AnimatePresence>

        {/* trust strip */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25, duration: 0.5 }}
          className="mx-auto mt-8 grid max-w-3xl grid-cols-1 gap-2 text-xs text-muted-foreground sm:mt-10 sm:grid-cols-3 sm:gap-3"
        >
          {[
            {
              icon: Zap,
              title: "Instant speed",
              desc: "No upload round-trip. Processing starts the moment you click.",
            },
            {
              icon: InfinityIcon,
              title: "No size limits",
              desc: "Your device does the work — free of quotas and caps.",
            },
            {
              icon: ShieldCheck,
              title: "Private by design",
              desc: "Contracts, invoices, IDs — they stay on your machine.",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="flex items-start gap-2.5 rounded-xl border bg-card/50 p-3 text-left"
            >
              <f.icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div>
                <p className="text-xs font-semibold text-foreground">{f.title}</p>
                <p className="mt-0.5 text-[11px] leading-snug">{f.desc}</p>
              </div>
            </div>
          ))}
        </motion.div>

        <div className="mt-8 hidden items-center justify-center gap-1.5 text-[11px] text-muted-foreground/70 sm:flex">
          <ClipboardPaste className="h-3 w-3" />
          Tip: take a screenshot, press Ctrl+V anywhere, and turn it into a PDF
        </div>
      </div>
    </section>
  );
}
