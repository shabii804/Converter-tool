"use client";

import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { Star } from "lucide-react";
import { type ToolDef } from "@/lib/tools";
import { useLocaleHref } from "@/lib/i18n-hooks";
import { categoryMeta } from "./category";
import { IconTile } from "./icon-tile";
import { cn } from "@/lib/utils";

const MotionLink = motion.create(Link);

/**
 * ToolCard — one consistent card per tool. Renders as a real crawlable
 * <a> to /<locale>/tool/[id]; clicking also syncs the in-app state so
 * dropped files carry over.
 * Hover lift -2px (disabled under prefers-reduced-motion).
 * Favorite toggle sits as a sibling button (never nested inside the card
 * — valid HTML, keyboard accessible).
 */
export function ToolCard({
  tool,
  index = 0,
  onOpen,
  favorite = false,
  onToggleFavorite,
  favAddLabel = "Add to favorites",
  favRemoveLabel = "Remove from favorites",
}: {
  tool: ToolDef;
  index?: number;
  onOpen: (id: string) => void;
  favorite?: boolean;
  onToggleFavorite?: () => void;
  favAddLabel?: string;
  favRemoveLabel?: string;
}) {
  const reduce = useReducedMotion();
  const meta = categoryMeta(tool.category);
  const localeHref = useLocaleHref();

  return (
    <div className="group relative">
      <MotionLink
        href={localeHref(`/tool/${tool.id}`)}
        onClick={() => onOpen(tool.id)}
        initial={reduce ? undefined : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={
          reduce ? { duration: 0 } : { duration: 0.28, delay: Math.min(index * 0.025, 0.25), ease: "easeOut" }
        }
        whileHover={reduce ? undefined : { y: -2 }}
        className={cn(
          "relative flex min-h-[120px] w-full flex-col items-start gap-3 rounded-card border border-border bg-surface-2 p-5 pr-14 text-left shadow-xs outline-none",
          "transition-[box-shadow,border-color] duration-200 hover:border-border-strong hover:shadow-md",
          "focus-visible:ring-2 focus-visible:ring-ring"
        )}
        aria-label={`${tool.name} — ${tool.tagline}`}
      >
        <div className="flex w-full items-start justify-between gap-2">
          <IconTile icon={tool.icon} category={tool.category} size="md" />
          {tool.badge && (
            <span
              className="mt-0.5 rounded-chip px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
              style={{
                color: `var(${meta.accentVar})`,
                background: `var(${meta.tintVar})`,
              }}
            >
              {tool.badge}
            </span>
          )}
        </div>
        <span>
          <span className="block text-sm font-bold leading-tight">{tool.name}</span>
          <span className="mt-1 block text-[13px] leading-snug text-fg-muted">{tool.tagline}</span>
        </span>
      </MotionLink>

      {onToggleFavorite && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite();
          }}
          aria-pressed={favorite}
          aria-label={favorite ? favRemoveLabel : favAddLabel}
          className="absolute right-1.5 top-1.5 z-10 flex size-11 items-center justify-center rounded-chip text-fg-faint outline-none transition-colors hover:bg-surface-3 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring sm:size-10"
        >
          <Star
            className={cn("size-4 transition-colors", favorite && "fill-primary text-primary")}
            aria-hidden="true"
          />
        </button>
      )}
    </div>
  );
}
