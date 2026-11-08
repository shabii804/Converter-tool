"use client";

import { FileText, X } from "lucide-react";
import { formatBytes } from "@/lib/format";
import { cn } from "@/lib/utils";

/** FileCard — one queued file with name, size and remove action. */
export function FileCard({
  name,
  size,
  onRemove,
  className,
}: {
  name: string;
  size: number;
  onRemove: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "group flex items-center gap-3 rounded-control border border-border bg-background p-3 transition-colors hover:border-border-strong",
        className
      )}
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-surface-3">
        <FileText className="size-4 text-fg-muted" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-semibold">{name}</span>
        <span className="block text-micro text-fg-muted">{formatBytes(size)}</span>
      </span>
      <button
        onClick={onRemove}
        className="flex size-7 shrink-0 items-center justify-center rounded-[10px] text-fg-muted transition-colors hover:bg-destructive/10 hover:text-destructive"
        aria-label={`Remove ${name}`}
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}
