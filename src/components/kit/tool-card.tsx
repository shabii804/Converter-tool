"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { type ToolDef } from "@/lib/tools";
import { categoryMeta } from "./category";
import { IconTile } from "./icon-tile";
import { cn } from "@/lib/utils";

/**
 * ToolCard — one consistent card per tool.
 * Hover lift -2px (disabled under prefers-reduced-motion).
 */
export function ToolCard({
  tool,
  index = 0,
  onOpen,
}: {
  tool: ToolDef;
  index?: number;
  onOpen: (id: string) => void;
}) {
  const reduce = useReducedMotion();
  const meta = categoryMeta(tool.category);

  return (
    <motion.button
      initial={reduce ? undefined : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={
        reduce ? { duration: 0 } : { duration: 0.28, delay: Math.min(index * 0.025, 0.25), ease: "easeOut" }
      }
      whileHover={reduce ? undefined : { y: -2 }}
      onClick={() => onOpen(tool.id)}
      className={cn(
        "group relative flex flex-col items-start gap-3 rounded-card border border-border bg-surface-2 p-5 text-left shadow-xs outline-none",
        "transition-[box-shadow,border-color] duration-200 hover:border-border-strong hover:shadow-md",
        "focus-visible:ring-2 focus-visible:ring-ring"
      )}
      aria-label={`${tool.name} — ${tool.tagline}`}
    >
      <div className="flex w-full items-start justify-between gap-2">
        <IconTile icon={tool.icon} category={tool.category} size="md" />
        <span className="flex items-center gap-1.5">
          {tool.badge && (
            <span
              className="rounded-chip px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
              style={{
                color: `var(${meta.accentVar})`,
                background: `var(${meta.tintVar})`,
              }}
            >
              {tool.badge}
            </span>
          )}
          <ArrowUpRight
            className="size-4 -translate-x-1 opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-60"
            style={{ color: `var(${meta.accentVar})` }}
          />
        </span>
      </div>
      <span>
        <span className="block text-sm font-bold leading-tight">{tool.name}</span>
        <span className="mt-1 block text-[13px] leading-snug text-fg-muted">{tool.tagline}</span>
      </span>
    </motion.button>
  );
}
