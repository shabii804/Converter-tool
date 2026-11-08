"use client";

import { Download } from "lucide-react";
import { formatBytes } from "@/lib/format";
import { Card } from "./card";
import { cn } from "@/lib/utils";

/** ResultCard — one processed output with per-file download. */
export function ResultCard({
  name,
  size,
  kind,
  onDownload,
  className,
}: {
  name: string;
  size: number;
  kind: string;
  onDownload: () => void;
  className?: string;
}) {
  return (
    <Card interactive className={cn("flex items-center gap-3 p-4", className)}>
      <span className="rounded-[10px] bg-cat-security/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-cat-security">
        {kind}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-semibold">{name}</span>
        <span className="block text-micro text-fg-muted">{formatBytes(size)}</span>
      </span>
      <button
        onClick={onDownload}
        className="inline-flex h-9 items-center gap-1.5 rounded-control border border-border-strong/70 px-3 text-[13px] font-semibold transition-colors hover:bg-surface-1"
        aria-label={`Download ${name}`}
      >
        <Download className="size-4" />
        Save
      </button>
    </Card>
  );
}
