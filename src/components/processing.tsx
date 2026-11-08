"use client";

import { useStore } from "@/lib/store";
import { toolById } from "@/lib/tools";
import { ProgressRing } from "./progress-ring";
import { ShieldCheck } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

const PHASES = [
  "Reading your files locally…",
  "Processing on this device…",
  "Almost there — still zero bytes uploaded…",
];

export function Processing() {
  const toolId = useStore((s) => s.toolId);
  const tool = toolById(toolId);
  const jobs = useStore((s) => s.jobs);
  const files = useStore((s) => s.files);

  const values = Object.values(jobs);
  const overall =
    values.length > 0
      ? values.reduce((a, j) => a + (j.progress || 0), 0) / values.length
      : 0.05;

  return (
    <section className="mx-auto flex max-w-6xl flex-col items-center px-4 py-14 sm:px-6 sm:py-20">
      <div className="relative">
        <ProgressRing value={overall} size={132} stroke={10}>
          <span className="text-2xl font-bold">{Math.round(overall * 100)}%</span>
        </ProgressRing>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
          className="absolute -right-4 -top-4 flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md"
        >
          {tool && <tool.icon className="h-5 w-5" />}
        </motion.div>
      </div>

      <AnimatePresence mode="wait">
        <motion.p
          key={PHASES[Math.min(2, Math.floor(overall * 3))]}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          className="mt-6 text-sm font-medium text-muted-foreground"
        >
          {PHASES[Math.min(2, Math.floor(overall * 3))]}
        </motion.p>
      </AnimatePresence>

      {/* per-file rings */}
      {values.length > 1 && (
        <div className="mt-10 grid w-full max-w-lg grid-cols-2 gap-4 sm:grid-cols-3">
          {files.map((f) => {
            const job = jobs[f.id];
            const p = job?.progress ?? 0;
            return (
              <div
                key={f.id}
                className="flex flex-col items-center gap-2 rounded-xl border bg-card p-3"
              >
                <ProgressRing value={p} size={52} stroke={5}>
                  <span className="text-[11px] font-bold">
                    {Math.round(p * 100)}
                  </span>
                </ProgressRing>
                <p className="w-full truncate text-center text-[11px] font-medium text-muted-foreground">
                  {f.name}
                </p>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-10 flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/[0.06] px-4 py-2">
        <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
        <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
          Uploaded so far: 0 bytes — as always
        </span>
      </div>
    </section>
  );
}
