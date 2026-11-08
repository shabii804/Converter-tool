"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { TOOLS, CATEGORIES, type ToolCategory } from "@/lib/tools";
import { useStore } from "@/lib/store";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight } from "lucide-react";

export function ToolGrid() {
  const [cat, setCat] = useState<ToolCategory | "all">("all");
  const openTool = useStore((s) => s.openTool);
  const tools = TOOLS.filter((t) => cat === "all" || t.category === cat);

  return (
    <section className="mx-auto max-w-6xl px-4 pb-14 pt-10 sm:px-6 sm:pt-12">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-bold tracking-tight sm:text-xl">
          All tools
          <span className="ml-2 text-sm font-normal text-muted-foreground">
            {TOOLS.length} built-in · more coming
          </span>
        </h2>
        <div
          className="flex flex-wrap gap-1.5"
          role="tablist"
          aria-label="Tool categories"
        >
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              role="tab"
              aria-selected={cat === c.id}
              onClick={() => setCat(c.id)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                cat === c.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4">
        {tools.map((t, i) => (
          <motion.button
            key={t.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: Math.min(i * 0.03, 0.3) }}
            whileHover={{ y: -3 }}
            onClick={() => openTool(t.id)}
            className="group relative flex flex-col items-start rounded-2xl border bg-card p-4 text-left shadow-sm outline-none transition-all hover:border-primary/40 hover:shadow-lg hover:shadow-primary/[0.08] focus-visible:ring-2 focus-visible:ring-primary/50 sm:p-5"
            aria-label={`${t.name} — ${t.tagline}`}
          >
            {t.badge && (
              <Badge className="absolute right-3 top-3 rounded-full bg-primary/10 px-2 py-0 text-[10px] font-bold text-primary hover:bg-primary/10">
                {t.badge}
              </Badge>
            )}
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 transition-colors group-hover:bg-primary sm:h-11 sm:w-11">
              <t.icon className="h-5 w-5 text-primary transition-colors group-hover:text-primary-foreground sm:h-[22px] sm:w-[22px]" />
            </div>
            <p className="text-sm font-semibold leading-tight">{t.name}</p>
            <p className="mt-1 text-[11px] leading-snug text-muted-foreground sm:text-xs">
              {t.tagline}
            </p>
            <ArrowUpRight className="absolute bottom-4 right-4 h-4 w-4 text-muted-foreground/0 transition-all group-hover:text-primary" />
          </motion.button>
        ))}
      </div>
    </section>
  );
}
