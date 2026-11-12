"use client";

import { type CSSProperties } from "react";
import { type LucideIcon } from "lucide-react";
import { type ToolCategory } from "@/lib/tools";
import { categoryMeta } from "./category";
import { cn } from "@/lib/utils";

/**
 * Shared glossy gradient surface for category-tinted icon tiles.
 * Built purely from the category accent token, so light/dark themes
 * both adapt automatically (accent vars are theme-scoped).
 * Layers: soft top sheen → diagonal accent gradient → glass edge →
 * a coloured ambient shadow that matches the icon.
 */
export function iconTileSurface(meta: { accentVar: string }): CSSProperties {
  const a = `var(${meta.accentVar})`;
  return {
    background: [
      `radial-gradient(120% 90% at 22% 0%, color-mix(in oklab, white 30%, transparent), transparent 55%)`,
      `linear-gradient(145deg, color-mix(in oklab, ${a} 26%, transparent), color-mix(in oklab, ${a} 10%, transparent) 50%, color-mix(in oklab, ${a} 24%, transparent))`,
    ].join(", "),
    border: `1px solid color-mix(in oklab, ${a} 30%, transparent)`,
    boxShadow: [
      `inset 0 1px 0 color-mix(in oklab, white 38%, transparent)`,
      `0 3px 10px -2px color-mix(in oklab, ${a} 55%, transparent)`,
    ].join(", "),
  };
}

/**
 * IconTile — a tool/category icon inside a glossy gradient tile.
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
  const stroke = { sm: 2.2, md: 2.1, lg: 2 }[size];
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 items-center justify-center transition-transform duration-200",
        dims,
        className
      )}
      style={iconTileSurface(meta)}
    >
      <Icon
        className={icn}
        strokeWidth={stroke}
        style={{ color: `var(${meta.accentVar})` }}
      />
    </span>
  );
}
