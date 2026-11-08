"use client";

import { cn } from "@/lib/utils";

/**
 * Tabs — accessible segmented control for filtering.
 * role=tablist/tab with aria-selected; keyboard focus ring from tokens.
 */
export function Tabs({
  items,
  value,
  onChange,
  className,
  ariaLabel = "Tabs",
}: {
  items: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn("flex flex-wrap gap-1.5", className)}
    >
      {items.map((it) => {
        const active = value === it.id;
        return (
          <button
            key={it.id}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(it.id)}
            className={cn(
              "rounded-chip px-3.5 py-1.5 text-[13px] font-semibold transition-all duration-150",
              active
                ? "bg-foreground text-background shadow-xs"
                : "border border-border bg-surface-2 text-fg-muted hover:border-border-strong hover:text-foreground"
            )}
          >
            {it.label}
          </button>
        );
      })}
    </div>
  );
}
