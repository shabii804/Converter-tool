"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import JSZip from "jszip";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { formatBytes, formatDuration, downloadBlob } from "@/lib/format";
import { toast } from "sonner";
import {
  Download,
  Package,
  RotateCcw,
  Home,
  ShieldCheck,
  CheckCircle2,
  Loader2,
} from "lucide-react";

export function Done() {
  const results = useStore((s) => s.results);
  const stats = useStore((s) => s.stats);
  const toolId = useStore((s) => s.toolId);
  const nextRun = useStore((s) => s.nextRun);
  const goHome = useStore((s) => s.goHome);
  const [zipping, setZipping] = useState(false);

  const single = results.length === 1;
  const saved = useMemo(() => {
    if (!stats) return null;
    if (stats.outputBytes === 0 || stats.inputBytes === 0) return null;
    const pct = Math.round((1 - stats.outputBytes / stats.inputBytes) * 100);
    return pct > 0 ? pct : null;
  }, [stats]);

  const downloadAll = async () => {
    if (single) {
      downloadBlob(results[0].blob, results[0].name);
      return;
    }
    setZipping(true);
    try {
      const zip = new JSZip();
      for (const r of results) zip.file(r.name, r.blob);
      const blob = await zip.generateAsync({ type: "blob" });
      downloadBlob(blob, "swiftpdf-results.zip");
    } catch {
      toast.error("Could not build the ZIP file");
    } finally {
      setZipping(false);
    }
  };

  return (
    <section className="mx-auto flex max-w-3xl flex-col items-center px-4 py-12 sm:px-6 sm:py-16">
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 220, damping: 16 }}
        className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/15"
      >
        <CheckCircle2 className="h-10 w-10 text-emerald-500" />
      </motion.div>

      <h1 className="mt-5 text-2xl font-bold tracking-tight sm:text-3xl">
        Done — processed on your device
      </h1>
      {stats && (
        <p className="mt-2 text-sm text-muted-foreground">
          {stats.toolName} · {stats.fileCount} file
          {stats.fileCount > 1 ? "s" : ""} · {formatDuration(stats.ms)}
        </p>
      )}

      {/* download CTA */}
      <Button
        onClick={downloadAll}
        className="mt-7 h-14 w-full max-w-sm rounded-2xl text-lg font-bold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30"
        size="lg"
      >
        {single ? (
          <>
            <Download className="mr-2 h-5 w-5 fill-current" />
            Download {results[0].kind}
          </>
        ) : (
          <>
            {zipping ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <Package className="mr-2 h-5 w-5" />
            )}
            Download all ({results.length}) as ZIP
          </>
        )}
      </Button>

      {/* stats card */}
      {stats && (
        <div className="mt-8 w-full rounded-2xl border bg-card p-5 shadow-sm">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Stat label="Input" value={formatBytes(stats.inputBytes)} />
            <Stat
              label="Output"
              value={formatBytes(stats.outputBytes)}
              highlight={
                saved !== null
                  ? `−${saved}%`
                  : undefined
              }
            />
            <Stat label="Time" value={formatDuration(stats.ms)} />
            <Stat label="Uploaded" value="0 bytes" accent />
          </div>
          {stats.note && (
            <p className="mt-4 border-t pt-3 text-xs text-muted-foreground">
              {stats.note}
            </p>
          )}
        </div>
      )}

      {/* file list for multiple results */}
      {results.length > 1 && (
        <div className="mt-4 w-full rounded-2xl border bg-card p-3 shadow-sm">
          <div className="max-h-64 space-y-1 overflow-y-auto">
            {results.map((r) => (
              <button
                key={r.id}
                onClick={() => downloadBlob(r.blob, r.name)}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition hover:bg-muted"
              >
                <Download className="h-4 w-4 shrink-0 text-primary" />
                <span className="min-w-0 flex-1 truncate text-xs font-medium">
                  {r.name}
                </span>
                <span className="shrink-0 text-[11px] text-muted-foreground">
                  {formatBytes(r.size)}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* actions */}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Button
          variant="outline"
          onClick={nextRun}
          className="h-11 rounded-xl px-5 font-semibold"
        >
          <RotateCcw className="mr-2 h-4 w-4" />
          Run another file
        </Button>
        <Button
          variant="ghost"
          onClick={goHome}
          className="h-11 rounded-xl px-5 font-semibold"
        >
          <Home className="mr-2 h-4 w-4" />
          Home
        </Button>
      </div>

      <div className="mt-8 flex items-center gap-2 text-[11px] text-muted-foreground">
        <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
        Your originals were never uploaded — they are still exactly where you left them
      </div>
    </section>
  );
}

function Stat({
  label,
  value,
  highlight,
  accent,
}: {
  label: string;
  value: string;
  highlight?: string;
  accent?: boolean;
}) {
  return (
    <div className="text-center sm:text-left">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p
        className={`mt-1 text-sm font-bold sm:text-base ${
          accent ? "text-emerald-600 dark:text-emerald-400" : ""
        }`}
      >
        {value}
        {highlight && (
          <span className="ml-1.5 rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
            {highlight}
          </span>
        )}
      </p>
    </div>
  );
}
