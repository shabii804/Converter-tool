"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { UploadCloud } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Dropzone — shared drop/paste/click intake used by the hero and workspace.
 * Active state: border + tint + gentle icon float (reduced-motion aware).
 */
export function Dropzone({
  accept,
  multiple = true,
  onFiles,
  title = "Drop files here",
  subtitle = "or click to browse",
  hint,
  compact = false,
  className,
}: {
  accept: string;
  multiple?: boolean;
  onFiles: (files: File[]) => void;
  title?: string;
  subtitle?: string;
  hint?: React.ReactNode;
  compact?: boolean;
  className?: string;
}) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);
  const reduce = useReducedMotion();

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      dragDepth.current = 0;
      setDragging(false);
      const list = Array.from(e.dataTransfer.files || []);
      if (list.length) onFiles(list);
    },
    [onFiles]
  );

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const list = Array.from(e.clipboardData?.files || []);
      if (list.length) onFiles(list);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [onFiles]);

  return (
    <motion.div
      onDrop={onDrop}
      onDragOver={(e) => e.preventDefault()}
      onDragEnter={(e) => {
        e.preventDefault();
        dragDepth.current++;
        setDragging(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        dragDepth.current--;
        if (dragDepth.current <= 0) setDragging(false);
      }}
      className={cn("relative", className)}
    >
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        aria-label={`${title} — ${subtitle}`}
        className={cn(
          "block w-full cursor-pointer rounded-card border-2 border-dashed bg-surface-2/60 text-center outline-none transition-all duration-200",
          "hover:border-border-strong hover:bg-surface-1/70 hover:shadow-sm",
          "focus-visible:ring-2 focus-visible:ring-ring",
          compact ? "p-6" : "p-8 sm:p-12",
          dragging && "border-ring bg-primary/[0.05] shadow-md"
        )}
        style={!dragging ? { borderColor: "var(--border-strong)" } : undefined}
      >
        <motion.div
          animate={
            dragging && !reduce
              ? { y: [0, -6, 0], scale: 1.05 }
              : { y: 0, scale: 1 }
          }
          transition={
            dragging && !reduce
              ? { repeat: Infinity, duration: 1.2, ease: "easeInOut" }
              : { duration: 0.2 }
          }
          className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-card bg-gradient-brand shadow-glow"
        >
          <UploadCloud className="size-6 text-white" />
        </motion.div>
        <p className="text-[15px] font-semibold">
          {dragging ? "Drop them right here" : title}
        </p>
        <p className="mt-1 text-caption text-fg-muted">{subtitle}</p>
        {hint && <div className="mt-3 text-micro text-fg-faint">{hint}</div>}
      </button>
      <input
        ref={inputRef}
        type="file"
        multiple={multiple}
        className="hidden"
        accept={accept}
        onChange={(e) => {
          const list = Array.from(e.target.files || []);
          if (list.length) onFiles(list);
          e.target.value = "";
        }}
      />
    </motion.div>
  );
}
