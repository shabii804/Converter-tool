"use client";

import Link from "next/link";
import { Star, ChevronUp, ChevronDown } from "lucide-react";
import { type ToolDef } from "@/lib/tools";
import { useLocaleHref } from "@/lib/i18n-hooks";
import { categoryMeta } from "./category";
import { IconTile } from "./icon-tile";
import { cn } from "@/lib/utils";

/**
 * ToolCard — one consistent card per tool. Renders as a real crawlable
 * <a> to /<locale>/tool/[id]; clicking also syncs the in-app state so
 * dropped files carry over.
 * Entrance animation is pure CSS (compositor-friendly, no JS driver) and
 * disabled under prefers-reduced-motion.
 * Favorite toggle sits as a sibling button (valid HTML, keyboard accessible).
 * Customize mode makes the card draggable (desktop) and adds ↑/↓ buttons
 * (touch + keyboard) so the user can arrange tools their own way.
 */
export function ToolCard({
  tool,
  index = 0,
  onOpen,
  favorite = false,
  onToggleFavorite,
  favAddLabel = "Add to favorites",
  favRemoveLabel = "Remove from favorites",
  customizing = false,
  isDragging = false,
  onDragStart,
  onDragEnterCard,
  onDragEnd,
  onMove,
  moveUpLabel = "Move up",
  moveDownLabel = "Move down",
}: {
  tool: ToolDef;
  index?: number;
  onOpen: (id: string) => void;
  favorite?: boolean;
  onToggleFavorite?: () => void;
  favAddLabel?: string;
  favRemoveLabel?: string;
  customizing?: boolean;
  isDragging?: boolean;
  onDragStart?: () => void;
  onDragEnterCard?: () => void;
  onDragEnd?: () => void;
  onMove?: (dir: -1 | 1) => void;
  moveUpLabel?: string;
  moveDownLabel?: string;
}) {
  const meta = categoryMeta(tool.category);
  const localeHref = useLocaleHref();

  return (
    <div
      className={cn(
        "group relative tool-card-enter",
        customizing && "rounded-card transition-colors",
        customizing && !isDragging && "cursor-grab active:cursor-grabbing",
        isDragging && "opacity-35"
      )}
      style={{ "--enter-delay": `${Math.min(index * 25, 250)}ms` } as React.CSSProperties}
      draggable={customizing || undefined}
      onDragStart={customizing ? onDragStart : undefined}
      onDragEnter={customizing ? onDragEnterCard : undefined}
      onDragEnd={customizing ? onDragEnd : undefined}
    >
      <Link
        href={localeHref(`/tool/${tool.id}`)}
        onClick={() => onOpen(tool.id)}
        draggable={false}
        className={cn(
          "relative flex min-h-[120px] w-full flex-col items-start gap-2 rounded-card border bg-surface-2 p-3 text-left shadow-xs outline-none sm:gap-3 sm:p-5 sm:pr-14",
          customizing
            ? "border-dashed border-border-strong"
            : "border-border",
          "transition-[box-shadow,border-color,translate] duration-200 hover:border-border-strong hover:shadow-md hover:-translate-y-0.5",
          "focus-visible:ring-2 focus-visible:ring-ring"
        )}
        aria-label={`${tool.name} — ${tool.tagline}`}
      >
        <div className="flex w-full items-start justify-between gap-2">
          <IconTile icon={tool.icon} category={tool.category} size="md" />
          {tool.badge && (
            <span
              className="mt-0.5 rounded-chip px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide max-sm:hidden sm:inline-block"
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
          <span className="block text-[13px] font-bold leading-tight sm:text-sm">{tool.name}</span>
          <span className="mt-1 block text-[11px] leading-snug text-fg-muted line-clamp-2 sm:text-[13px]">{tool.tagline}</span>
        </span>
      </Link>

      {onToggleFavorite && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite();
          }}
          aria-pressed={favorite}
          aria-label={favorite ? favRemoveLabel : favAddLabel}
          className="absolute right-1.5 top-1.5 z-10 flex size-9 items-center justify-center rounded-chip text-fg-faint outline-none transition-colors hover:bg-surface-3 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring sm:size-10"
        >
          <Star
            className={cn("size-4 transition-colors", favorite && "fill-primary text-primary")}
            aria-hidden="true"
          />
        </button>
      )}

      {customizing && onMove && (
        <div className="absolute bottom-1.5 right-1.5 z-10 flex flex-col gap-0.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMove(-1);
            }}
            aria-label={`${moveUpLabel}: ${tool.name}`}
            className="flex size-6 items-center justify-center rounded-chip border border-border bg-surface-1 text-fg-muted outline-none transition-colors hover:bg-surface-3 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ChevronUp className="size-3.5" aria-hidden="true" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMove(1);
            }}
            aria-label={`${moveDownLabel}: ${tool.name}`}
            className="flex size-6 items-center justify-center rounded-chip border border-border bg-surface-1 text-fg-muted outline-none transition-colors hover:bg-surface-3 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ChevronDown className="size-3.5" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}
