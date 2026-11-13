"use client";

import { useStore } from "@/lib/store";
import { toolById } from "@/lib/tools";
import { ProgressRing } from "./progress-ring";
import { ShieldCheck } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

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
  const reduce = useReducedMotion();

  const values = Object.values(jobs);
  const overall =
    values.length > 0
      ? values.reduce((a, j) => a + (j.progress || 0), 0) / values.length
      : 0.05;

  return (
    <section className="mx-auto flex max-w-7xl flex-col items-center px-4 py-20 sm:px-6 sm:py-28">
      <div className="relative">
        <ProgressRing value={overall} size={132} stroke={10}>
          <span className="text-2xl font-bold">{Math.round(overall * 100)}%</span>
        </ProgressRing>
        {!reduce && (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 10, ease: "linear" }}
            className="absolute -right-4 -top-4 flex size-11 items-center justify-center rounded-card bg-gradient-brand shadow-glow"
          >
            {tool && <tool.icon className="size-5 text-white" />}
          </motion.div>
        )}
      </div>

      <AnimatePresence mode="wait">
        <motion.p
          key={PHASES[Math.min(2, Math.floor(overall * 3))]}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: reduce ? 0 : 0.18 }}
          className="mt-8 text-sm font-medium text-fg-muted"
        >
          {PHASES[Math.min(2, Math.floor(overall * 3))]}
        </motion.p>
      </AnimatePresence>

      {/* per-file rings */}
      {values.length > 1 && (
        <div className="mt-12 grid w-full max-w-xl grid-cols-2 gap-4 sm:grid-cols-3">
          {files.map((f) => {
            const job = jobs[f.id];
            const p = job?.progress ?? 0;
            return (
              <div
                key={f.id}
                className="flex flex-col items-center gap-3 rounded-card border border-border bg-surface-2 p-4 shadow-xs"
              >
                <ProgressRing value={p} size={52} stroke={5}>
                  <span className="text-[11px] font-bold">
                    {Math.round(p * 100)}
                  </span>
                </ProgressRing>
                <p className="w-full truncate text-center text-[11px] font-medium text-fg-muted">
                  {f.name}
                </p>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-12 flex items-center gap-2 rounded-chip border border-success/25 bg-success/[0.07] px-4 py-2.5">
        <ShieldCheck className="size-4 text-success" />
        <span className="text-[13px] font-semibold text-success">
          Uploaded so far: 0 bytes — as always
        </span>
      </div>
    </section>
  );
}
