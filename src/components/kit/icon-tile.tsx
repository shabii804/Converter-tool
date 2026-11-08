"use client";

import { type LucideIcon } from "lucide-react";
import { type ToolCategory } from "@/lib/tools";
import { categoryMeta } from "./category";
import { cn } from "@/lib/utils";

/**
 * IconTile — a tool/category icon inside a soft, tinted gradient tile.
 * One consistent Lucide icon per tool; tint + accent come from tokens.
 */
export function IconTile({
  icon: Icon,
  category,
  size = "md",
  className,
}: {
  icon: LucideIcon;
  category: ToolCategory;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const meta = categoryMeta(category);
  const dims = { sm: "size-9 rounded-[10px]", md: "size-11 rounded-[12px]", lg: "size-12 rounded-control" }[size];
  const icn = { sm: "size-[18px]", md: "size-5", lg: "size-[22px]" }[size];
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 items-center justify-center shadow-xs transition-transform duration-200",
        dims,
        className
      )}
      style={{
        background: `linear-gradient(140deg, var(${meta.tintVar}), var(${meta.tintVar}))`,
        border: `1px solid color-mix(in oklab, var(${meta.accentVar}) 18%, transparent)`,
      }}
    >
      <Icon
        className={icn}
        style={{ color: `var(${meta.accentVar})` }}
      />
    </span>
  );
}
