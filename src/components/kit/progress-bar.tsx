"use client";

import { cn } from "@/lib/utils";

/** ProgressBar — linear, determinate; 4px track, animated fill. */
export function ProgressBar({
  value, // 0..1
  className,
  ariaLabel,
}: {
  value: number;
  className?: string;
  ariaLabel?: string;
}) {
  const clamped = Math.max(0, Math.min(1, value));
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(clamped * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={ariaLabel}
      className={cn("h-1.5 w-full overflow-hidden rounded-chip bg-surface-3", className)}
    >
      <div
        className="h-full rounded-chip bg-gradient-brand transition-[width] duration-300 ease-out"
        style={{ width: `${clamped * 100}%` }}
      />
    </div>
  );
}
