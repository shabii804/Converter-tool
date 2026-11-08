"use client";

import { useMemo, useState } from "react";
import JSZip from "jszip";
import { useStore } from "@/lib/store";
import { Button } from "@/components/kit/button";
import { Card } from "@/components/kit/card";
import { ResultCard } from "@/components/kit/result-card";
import { SuccessCheck } from "@/components/kit/success-check";
import { ProgressBar } from "@/components/kit/progress-bar";
import { formatBytes, formatDuration, downloadBlob } from "@/lib/format";
import { notify } from "@/components/kit/toast";
import { RotateCcw, Home, ShieldCheck, Package, Loader2 } from "lucide-react";

export function Done() {
  const results = useStore((s) => s.results);
  const stats = useStore((s) => s.stats);
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
      notify.error("Could not build the ZIP file");
    } finally {
      setZipping(false);
    }
  };

  return (
    <section className="mx-auto flex max-w-3xl flex-col items-center px-4 py-16 sm:px-6 sm:py-24">
      <SuccessCheck size={88} />

      <h1 className="mt-6 text-h1 font-bold tracking-heading">
        Done — processed on your device
      </h1>
      {stats && (
        <p className="mt-2.5 text-sm text-fg-muted">
          {stats.toolName} · {stats.fileCount} file
          {stats.fileCount > 1 ? "s" : ""} · {formatDuration(stats.ms)}
        </p>
      )}

      {/* download CTA */}
      <Button
        onClick={downloadAll}
        size="xl"
        className="mt-8 w-full max-w-sm shadow-glow"
      >
        {single ? (
          <>
            <DownloadIcon />
            Download {results[0].kind}
          </>
        ) : (
          <>
            {zipping ? <Loader2 className="animate-spin" /> : <Package />}
            Download all ({results.length}) as ZIP
          </>
        )}
      </Button>
      {zipping && (
        <div className="mt-4 w-full max-w-sm">
          <ProgressBar value={0.6} ariaLabel="Building ZIP file" />
        </div>
      )}

      {/* stats card */}
      {stats && (
        <Card className="mt-10 w-full p-6">
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
            <Stat label="Input" value={formatBytes(stats.inputBytes)} />
            <Stat
              label="Output"
              value={formatBytes(stats.outputBytes)}
              highlight={saved !== null ? `−${saved}%` : undefined}
            />
            <Stat label="Time" value={formatDuration(stats.ms)} />
            <Stat label="Uploaded" value="0 bytes" accent />
          </div>
          {stats.note && (
            <p className="mt-5 border-t border-border-subtle pt-4 text-[13px] text-fg-muted">
              {stats.note}
            </p>
          )}
        </Card>
      )}

      {/* file list for multiple results */}
      {results.length > 1 && (
        <div className="mt-5 w-full space-y-2.5">
          {results.map((r) => (
            <ResultCard
              key={r.id}
              name={r.name}
              size={r.size}
              kind={r.kind}
              onDownload={() => downloadBlob(r.blob, r.name)}
            />
          ))}
        </div>
      )}

      {/* actions */}
      <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
        <Button variant="secondary" size="lg" onClick={nextRun}>
          <RotateCcw />
          Run another file
        </Button>
        <Button variant="ghost" size="lg" onClick={goHome}>
          <Home />
          Home
        </Button>
      </div>

      <div className="mt-10 flex items-center gap-2 text-micro text-fg-faint">
        <ShieldCheck className="size-3.5 text-success" />
        Your originals were never uploaded — they are still exactly where you left them
      </div>
    </section>
  );
}

function DownloadIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3v12m0 0l-5-5m5 5l5-5M4 21h16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
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
      <p className="text-micro font-medium uppercase tracking-wide text-fg-faint">
        {label}
      </p>
      <p
        className={`mt-1.5 text-base font-bold ${accent ? "text-success" : ""}`}
      >
        {value}
        {highlight && (
          <span className="ml-1.5 rounded-chip bg-success/10 px-1.5 py-0.5 text-[10px] font-bold text-success">
            {highlight}
          </span>
        )}
      </p>
    </div>
  );
}
