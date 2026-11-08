"use client";

import { useEffect, useRef, useState } from "react";
import { makeThumbnails } from "@/lib/pdf-engine";
import { Skeleton } from "@/components/ui/skeleton";
import { RotateCw, GripVertical, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PageThumb {
  dataUrl: string;
  page: number;
}

export function PageThumbs({
  file,
  selected,
  onToggle,
  onReorder,
  onRotate,
  rotations,
  deletable,
  selectable = true,
  reorderable = false,
  rotatable = false,
  /** what a page's membership in `selected` means:
   *  "keep" (default): in set = kept ✓, off set = removed
   *  "delete": in set = marked for deletion ✗, off set = kept ✓ */
  selectionMeans = "keep",
}: {
  file: File;
  selected?: Set<number>;
  onToggle?: (page: number) => void;
  onReorder?: (order: number[]) => void;
  onRotate?: (page: number) => void;
  rotations?: Record<number, number>;
  deletable?: boolean;
  selectable?: boolean;
  reorderable?: boolean;
  rotatable?: boolean;
  selectionMeans?: "keep" | "delete";
}) {
  const [thumbs, setThumbs] = useState<
    (PageThumb & { width: number; height: number })[] | null
  >(null);
  const [order, setOrder] = useState<number[] | null>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadedFor, setLoadedFor] = useState<File | null>(null);
  const reorderInitRef = useRef<File | null>(null);

  useEffect(() => {
    let alive = true;
    makeThumbnails(file, { targetWidth: 190 })
      .then((t) => {
        if (!alive) return;
        setThumbs(t.map((x) => ({ dataUrl: x.dataUrl, page: x.page, width: x.width, height: x.height })));
        setOrder(t.map((x) => x.page));
        setLoadedFor(file);
        // FIX (organize): publish the initial natural order once, so runs
        // work even if the user only deletes/rotates without dragging.
        if (onReorder && reorderInitRef.current !== file) {
          reorderInitRef.current = file;
          onReorder(t.map((x) => x.page));
        }
      })
      .catch(() => {
        if (!alive) return;
        setError("Could not render preview for this file");
        setLoadedFor(file);
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);

  const showSkeleton = loadedFor !== file;
  const showError = loadedFor === file ? error : null;

  if (showError)
    return (
      <p className="rounded-control border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        {showError}
      </p>
    );

  if (showSkeleton || !thumbs)
    return (
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="aspect-[3/4] rounded-control" />
        ))}
      </div>
    );

  const display = order ?? thumbs.map((t) => t.page);
  const byPage = new Map(thumbs.map((t) => [t.page, t]));

  const move = (from: number, to: number) => {
    if (!order) return;
    const next = [...order];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    setOrder(next);
    onReorder?.(next);
  };

  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
      {display.map((page, idx) => {
        const thumb = byPage.get(page);
        if (!thumb) return null;
        const rot = rotations?.[page] ?? 0;
        const inSet = selected?.has(page) ?? false;
        const isSel = selectionMeans === "delete" ? !inSet : inSet;
        // FIX (letterboxing): keep each page's real aspect ratio; swap it
        // when the page is rotated ±90°, so portrait pages stop getting
        // forced into a landscape box.
        const ratio =
          rot % 180 === 90
            ? `${thumb.height} / ${thumb.width}`
            : `${thumb.width} / ${thumb.height}`;
        return (
          <div
            key={page}
            draggable={reorderable}
            onDragStart={() => setDragIdx(idx)}
            onDragEnd={() => setDragIdx(null)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (dragIdx !== null && dragIdx !== idx) move(dragIdx, idx);
              setDragIdx(null);
            }}
            className={cn(
              "group relative rounded-control transition-all",
              reorderable && "cursor-grab active:cursor-grabbing",
              dragIdx === idx && "opacity-40",
              deletable && !isSel && "opacity-35"
            )}
          >
            <div
              className="relative overflow-hidden rounded-control border border-border bg-white shadow-xs transition-all group-hover:border-ring group-hover:shadow-md dark:bg-white"
              style={{ aspectRatio: ratio }}
            >
              <img
                src={thumb.dataUrl}
                alt={`Page ${page}`}
                className="absolute inset-0 size-full"
                style={{
                  transform: rot ? `rotate(${rot}deg)` : undefined,
                  objectFit: "contain",
                }}
                draggable={false}
              />
              {selectable && (
                <button
                  onClick={() => onToggle?.(page)}
                  aria-label={
                    selectionMeans === "delete"
                      ? isSel
                        ? `Keep page ${page}`
                        : `Mark page ${page} for deletion`
                      : isSel
                        ? `Deselect page ${page}`
                        : `Select page ${page}`
                  }
                  aria-pressed={isSel}
                  className={cn(
                    "absolute left-1.5 top-1.5 flex size-6 items-center justify-center rounded-full border text-[11px] font-bold shadow-sm transition-all",
                    isSel
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-white/90 text-fg-muted hover:border-primary/50"
                  )}
                >
                  {isSel ? "✓" : ""}
                </button>
              )}
              {rotatable && (
                <button
                  onClick={() => onRotate?.(page)}
                  aria-label={`Rotate page ${page}`}
                  className="absolute right-1.5 top-1.5 flex size-6 items-center justify-center rounded-full border border-border bg-white/90 text-fg-muted opacity-0 shadow-sm transition-all hover:text-primary group-hover:opacity-100 focus-visible:opacity-100"
                >
                  <RotateCw className="size-3.5" />
                </button>
              )}
              <span className="absolute bottom-1.5 right-1.5 rounded-md bg-black/55 px-1.5 py-0.5 text-[10px] font-bold text-white">
                {page}
              </span>
              {reorderable && (
                <span className="absolute bottom-1.5 left-1.5 rounded-md bg-black/35 p-0.5 text-white opacity-0 transition group-hover:opacity-100">
                  <GripVertical className="size-3.5" />
                </span>
              )}
              {deletable && !isSel && (
                <span className="absolute inset-x-0 bottom-0 top-0 flex items-center justify-center">
                  <X className="size-5 text-destructive drop-shadow" />
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
