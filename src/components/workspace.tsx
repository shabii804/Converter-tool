"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useStore, type StoreFile } from "@/lib/store";
import { toolById } from "@/lib/tools";
import { firstPagePreview } from "@/lib/pdf-engine";
import { executeRun } from "@/lib/pipeline";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageThumbs } from "./page-thumbs";
import { formatBytes } from "@/lib/format";
import { toast } from "sonner";
import {
  ArrowLeft,
  Play,
  Plus,
  X,
  FileText,
  Loader2,
  Eye,
} from "lucide-react";

/* ---------- per-tool option state ---------- */

interface Options {
  // split
  splitMode: "ranges" | "fixed" | "extract";
  ranges: string;
  everyN: number;
  splitSelected: Set<number>;
  // compress
  level: "low" | "medium" | "high";
  // rotate
  angle: 90 | 180 | 270;
  // pdf-to-jpg
  jpgScale: 1 | 2 | 3;
  // jpg-to-pdf
  pageSize: "fit" | "a4" | "letter";
  margin: number;
  orientation: "auto" | "portrait" | "landscape";
  // word-to-pdf
  docPageSize: "a4" | "letter";
  // watermark
  wmText: string;
  wmSize: number;
  wmColor: string;
  wmOpacity: number;
  wmRotation: number;
  wmPosition: "center" | "diagonal" | "tile" | "footer" | "header";
  wmBold: boolean;
  // page numbers
  pnFormat: "n" | "page_n" | "n_of_total";
  pnPosition:
    | "bottom-center"
    | "bottom-right"
    | "bottom-left"
    | "top-center"
    | "top-right"
    | "top-left";
  pnStart: number;
  pnSize: number;
  pnSkipFirst: boolean;
  // crop
  cropTop: number;
  cropRight: number;
  cropBottom: number;
  cropLeft: number;
  // protect / unlock
  password: string;
  confirm: string;
  // organize
  order: number[];
  rotations: Record<number, number>;
  organizeDeleted: Set<number>;
}

const defaultOptions = (): Options => ({
  splitMode: "extract",
  ranges: "1-3, 5",
  everyN: 2,
  splitSelected: new Set(),
  level: "medium",
  angle: 90,
  jpgScale: 2,
  pageSize: "a4",
  margin: 24,
  orientation: "auto",
  docPageSize: "a4",
  wmText: "CONFIDENTIAL",
  wmSize: 48,
  wmColor: "#EF4444",
  wmOpacity: 0.3,
  wmRotation: 45,
  wmPosition: "diagonal",
  wmBold: true,
  pnFormat: "n",
  pnPosition: "bottom-center",
  pnStart: 1,
  pnSize: 11,
  pnSkipFirst: false,
  cropTop: 5,
  cropRight: 5,
  cropBottom: 5,
  cropLeft: 5,
  password: "",
  confirm: "",
  order: [],
  rotations: {},
  organizeDeleted: new Set(),
});

/* ---------- main component ---------- */

export function Workspace() {
  const toolId = useStore((s) => s.toolId)!;
  const tool = toolById(toolId);
  const files = useStore((s) => s.files);
  const addFiles = useStore((s) => s.addFiles);
  const removeFile = useStore((s) => s.removeFile);
  const goHome = useStore((s) => s.goHome);
  const setView = useStore((s) => s.setView);
  const setJobs = useStore((s) => s.setJobs);
  const updateJob = useStore((s) => s.updateJob);
  const setResults = useStore((s) => s.setResults);
  const setStats = useStore((s) => s.setStats);

  const [opts, setOpts] = useState<Options>(defaultOptions);
  const [running, setRunning] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof Options>(key: K, value: Options[K]) =>
    setOpts((o) => ({ ...o, [key]: value }));

  const canRun = useMemo(() => {
    if (!tool) return false;
    if (files.length < tool.minFiles) return false;
    if (tool.id === "watermark" && !opts.wmText.trim()) return false;
    if (tool.id === "protect" && opts.password.length < 4) return false;
    if (tool.id === "protect" && opts.password !== opts.confirm) return false;
    if (tool.id === "unlock" && !opts.password) return false;
    if (tool.id === "split") {
      if (opts.splitMode === "ranges" && !opts.ranges.trim()) return false;
      if (opts.splitMode === "extract" && opts.splitSelected.size === 0)
        return false;
    }
    if (tool.id === "organize" && files.length === 1) {
      // allowed with any kept pages; engine validates
    }
    return true;
  }, [tool, files, opts]);

  const onRun = useCallback(async () => {
    if (!tool || !canRun || running) return;
    setRunning(true);
    const es = entries(files);
    await executeRun(tool.id, es, buildOptions(tool.id, opts));
    setRunning(false);
  }, [canRun, running, files, opts, tool]);

  if (!tool) return null;

  const panel = <OptionsPanel toolId={tool.id} opts={opts} set={set} files={files} />;

  return (
    <section className="mx-auto max-w-6xl px-4 pb-16 pt-6 sm:px-6">
      {/* tool header */}
      <div className="mb-6 flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={goHome}
          className="h-9 w-9 rounded-full"
          aria-label="Back to home"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
          <tool.icon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-lg font-bold tracking-tight sm:text-xl">{tool.name}</h1>
          <p className="text-xs text-muted-foreground sm:text-sm">{tool.description}</p>
        </div>
      </div>

      <div className="flex flex-col gap-5 lg:flex-row lg:gap-6">
        {/* left: files */}
        <div className="w-full shrink-0 lg:w-[340px]">
          <div className="rounded-2xl border bg-card p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold">
                Files
                <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                  {files.length}
                  {tool.maxFiles < 100 ? `/${tool.maxFiles}` : ""}
                </span>
              </p>
              {files.length > 0 && (
                <button
                  onClick={() => files.forEach((f) => removeFile(f.id))}
                  className="text-xs font-medium text-muted-foreground hover:text-destructive"
                >
                  Clear
                </button>
              )}
            </div>

            {files.length === 0 ? (
              <button
                onClick={() => inputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  const list = Array.from(e.dataTransfer.files || []);
                  if (list.length) addFiles(list);
                }}
                className={`flex h-36 w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed text-center transition ${
                  dragOver
                    ? "border-primary bg-primary/[0.06]"
                    : "border-border hover:border-primary/40 hover:bg-primary/[0.03]"
                }`}
              >
                <Plus className="h-6 w-6 text-primary" />
                <span className="text-xs font-medium text-muted-foreground">
                  Drop {tool.input === "image" ? "images" : tool.input === "docx" ? ".docx files" : "PDF files"} or click
                </span>
              </button>
            ) : (
              <div className="max-h-[320px] space-y-2 overflow-y-auto pr-1 [scrollbar-width:thin]">
                {files.map((f) => (
                  <div
                    key={f.id}
                    className="group flex items-center gap-2.5 rounded-xl border bg-background p-2.5"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <FileText className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold">{f.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {formatBytes(f.size)}
                      </p>
                    </div>
                    <button
                      onClick={() => removeFile(f.id)}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                      aria-label={`Remove ${f.name}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                {files.length < tool.maxFiles && (
                  <button
                    onClick={() => inputRef.current?.click()}
                    className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed py-2.5 text-xs font-medium text-muted-foreground transition hover:border-primary/40 hover:text-primary"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add more
                  </button>
                )}
              </div>
            )}
            <input
              ref={inputRef}
              type="file"
              multiple
              accept={tool.accept}
              className="hidden"
              onChange={(e) => {
                const list = Array.from(e.target.files || []);
                if (list.length) {
                  const { rejected } = addFiles(list);
                  if (rejected > 0)
                    toast.warning(
                      `${rejected} file(s) skipped — wrong type for ${tool.name}`
                    );
                }
                e.target.value = "";
              }}
            />
          </div>

          {/* privacy note */}
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/[0.06] px-3 py-2.5">
            <Eye className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <p className="text-[11px] leading-snug text-emerald-800 dark:text-emerald-300">
              Processing happens <b>on this device</b>. Nothing is uploaded.
            </p>
          </div>
        </div>

        {/* right: options */}
        <div className="min-w-0 flex-1">
          <div className="rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
            <p className="mb-4 text-sm font-semibold">Options</p>
            {panel}
          </div>

          <Button
            onClick={onRun}
            disabled={!canRun || running}
            className="mt-4 h-13 w-full rounded-xl text-base font-bold shadow-md shadow-primary/20 transition-all hover:shadow-lg hover:shadow-primary/30 disabled:opacity-40 sm:h-14 sm:text-lg"
            size="lg"
          >
            {running ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Working…
              </>
            ) : (
              <>
                <Play className="mr-2 h-5 w-5 fill-current" />
                {tool.zeroOption ? `Run ${tool.name}` : `Run ${tool.name}`}
              </>
            )}
          </Button>
          {!canRun && files.length > 0 && (
            <p className="mt-2 text-center text-xs text-muted-foreground">
              {hint(toolId, opts, files)}
            </p>
          )}
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="mt-6 hidden justify-center text-[11px] text-muted-foreground/70 sm:flex"
      >
        Works offline · No watermark added by us · Free forever
      </motion.div>
    </section>
  );
}

function entries(files: StoreFile[]) {
  return files.map((f) => ({ id: f.id, file: f.file }));
}

function buildOptions(
  toolId: string,
  opts: Options
): Record<string, unknown> {
  switch (toolId) {
    case "split":
      return {
        mode: opts.splitMode,
        ranges: opts.ranges,
        everyN: opts.everyN,
        selectedPages: [...opts.splitSelected],
      };
    case "compress":
      return { level: opts.level };
    case "rotate":
      return { angle: opts.angle };
    case "pdf-to-jpg":
      return { scale: opts.jpgScale };
    case "jpg-to-pdf":
      return {
        pageSize: opts.pageSize,
        margin: opts.margin,
        orientation: opts.orientation,
      };
    case "word-to-pdf":
      return { pageSize: opts.docPageSize };
    case "watermark":
      return {
        text: opts.wmText,
        fontSize: opts.wmSize,
        color: opts.wmColor,
        opacity: opts.wmOpacity,
        rotation: opts.wmRotation,
        position: opts.wmPosition,
        bold: opts.wmBold,
      };
    case "page-numbers":
      return {
        format: opts.pnFormat,
        position: opts.pnPosition,
        startAt: opts.pnStart,
        fontSize: opts.pnSize,
        skipFirst: opts.pnSkipFirst,
      };
    case "crop":
      return {
        top: opts.cropTop,
        right: opts.cropRight,
        bottom: opts.cropBottom,
        left: opts.cropLeft,
      };
    case "protect":
      return { password: opts.password, confirm: opts.confirm };
    case "unlock":
      return { password: opts.password };
    case "organize":
      return {
        order: opts.order.filter((p) => !opts.organizeDeleted.has(p)),
        rotations: opts.rotations,
      };
    default:
      return {};
  }
}

function hint(toolId: string, opts: Options, files: StoreFile[]): string {
  const tool = toolById(toolId);
  if (!tool) return "";
  if (files.length < tool.minFiles)
    return `Add ${tool.minFiles === 1 ? "a file" : `at least ${tool.minFiles} files`} to continue`;
  if (toolId === "watermark" && !opts.wmText.trim()) return "Enter watermark text";
  if (toolId === "protect" && opts.password.length < 4)
    return "Password needs at least 4 characters";
  if (toolId === "protect" && opts.password !== opts.confirm)
    return "Passwords do not match";
  if (toolId === "split") {
    if (opts.splitMode === "ranges" && !opts.ranges.trim())
      return "Enter page ranges like 1-3, 5";
    if (opts.splitMode === "extract" && opts.splitSelected.size === 0)
      return "Select at least one page below";
  }
  return "";
}

/* ---------- options panel ---------- */

function OptionsPanel({
  toolId,
  opts,
  set,
  files,
}: {
  toolId: string;
  opts: Options;
  set: <K extends keyof Options>(k: K, v: Options[K]) => void;
  files: StoreFile[];
}) {
  switch (toolId) {
    case "merge":
      return (
        <p className="rounded-xl bg-primary/[0.04] p-3 text-xs text-muted-foreground">
          Files merge in the order listed. Add more files any time — one click
          and they become a single PDF.
        </p>
      );

    case "split":
      return (
        <div className="space-y-4">
          <SegButtons
            value={opts.splitMode}
            onChange={(v) => set("splitMode", v as Options["splitMode"])}
            options={[
              { v: "extract", label: "Select pages" },
              { v: "ranges", label: "By ranges" },
              { v: "fixed", label: "Every N pages" },
            ]}
          />
          {opts.splitMode === "ranges" && (
            <div>
              <Label className="mb-1.5 block text-xs font-medium">
                Ranges (comma separated)
              </Label>
              <Input
                value={opts.ranges}
                onChange={(e) => set("ranges", e.target.value)}
                placeholder="1-3, 5, 8-10"
                className="rounded-xl"
              />
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                Each range or page becomes its own PDF file.
              </p>
            </div>
          )}
          {opts.splitMode === "fixed" && (
            <div>
              <Label className="mb-1.5 block text-xs font-medium">
                Split every
              </Label>
              <div className="flex items-center gap-3">
                <Slider
                  min={1}
                  max={20}
                  step={1}
                  value={[opts.everyN]}
                  onValueChange={([v]) => set("everyN", v)}
                  className="flex-1"
                />
                <span className="w-16 text-right text-sm font-semibold">
                  {opts.everyN} page{opts.everyN > 1 ? "s" : ""}
                </span>
              </div>
            </div>
          )}
          {opts.splitMode === "extract" && files[0] && (
            <div>
              <Label className="mb-2 block text-xs font-medium">
                Click pages to include ({opts.splitSelected.size} selected)
              </Label>
              <PageThumbs
                file={files[0].file}
                selected={opts.splitSelected}
                onToggle={(p) => {
                  const next = new Set(opts.splitSelected);
                  if (next.has(p)) next.delete(p);
                  else next.add(p);
                  set("splitSelected", next);
                }}
              />
            </div>
          )}
        </div>
      );

    case "compress":
      return (
        <div className="space-y-2.5">
          {(
            [
              { v: "low", t: "Extreme compression", d: "Smallest size, lower quality" },
              { v: "medium", t: "Recommended compression", d: "Good balance of size and quality" },
              { v: "high", t: "Light compression", d: "Best quality, moderate savings" },
            ] as const
          ).map((o) => (
            <button
              key={o.v}
              onClick={() => set("level", o.v)}
              className={`flex w-full items-center gap-3 rounded-xl border p-3.5 text-left transition ${
                opts.level === o.v
                  ? "border-primary bg-primary/[0.05] shadow-sm"
                  : "hover:border-primary/30"
              }`}
            >
              <span
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
                  opts.level === o.v
                    ? "border-primary bg-primary"
                    : "border-muted-foreground/40"
                }`}
              >
                {opts.level === o.v && (
                  <span className="h-1.5 w-1.5 rounded-full bg-white" />
                )}
              </span>
              <span>
                <span className="block text-sm font-semibold">{o.t}</span>
                <span className="block text-xs text-muted-foreground">{o.d}</span>
              </span>
            </button>
          ))}
          <p className="pt-1 text-[11px] text-muted-foreground">
            SwiftPDF tries both a lossless re-save and smart re-encoding, then
            keeps whichever is smaller.
          </p>
        </div>
      );

    case "organize":
      return (
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Click ✓ to remove a page · drag cards to reorder · ↻ rotates a page
          </p>
          {files[0] && (
            <PageThumbs
              file={files[0].file}
              selected={opts.organizeDeleted}
              onToggle={(p) => {
                const next = new Set(opts.organizeDeleted);
                if (next.has(p)) next.delete(p);
                else next.add(p);
                set("organizeDeleted", next);
              }}
              onReorder={(order) => set("order", order)}
              onRotate={(p) => {
                const next = { ...opts.rotations };
                next[p] = ((next[p] ?? 0) + 90) % 360;
                set("rotations", next);
              }}
              rotations={opts.rotations}
              deletable
              selectable
              reorderable
              rotatable
            />
          )}
        </div>
      );

    case "rotate":
      return (
        <SegButtons
          value={String(opts.angle)}
          onChange={(v) => set("angle", Number(v) as 90 | 180 | 270)}
          options={[
            { v: "90", label: "90°" },
            { v: "180", label: "180°" },
            { v: "270", label: "270°" },
          ]}
        />
      );

    case "pdf-to-jpg":
      return (
        <SegButtons
          value={String(opts.jpgScale)}
          onChange={(v) => set("jpgScale", Number(v) as 1 | 2 | 3)}
          options={[
            { v: "1", label: "Standard · 72 DPI" },
            { v: "2", label: "High · 144 DPI" },
            { v: "3", label: "Max · 216 DPI" },
          ]}
        />
      );

    case "jpg-to-pdf":
      return (
        <div className="space-y-4">
          <TwoCol>
            <div>
              <Label className="mb-1.5 block text-xs font-medium">Page size</Label>
              <Select
                value={opts.pageSize}
                onValueChange={(v) => set("pageSize", v as Options["pageSize"])}
              >
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fit">Fit to image</SelectItem>
                  <SelectItem value="a4">A4</SelectItem>
                  <SelectItem value="letter">US Letter</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5 block text-xs font-medium">Orientation</Label>
              <Select
                value={opts.orientation}
                onValueChange={(v) => set("orientation", v as Options["orientation"])}
                disabled={opts.pageSize === "fit"}
              >
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto</SelectItem>
                  <SelectItem value="portrait">Portrait</SelectItem>
                  <SelectItem value="landscape">Landscape</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </TwoCol>
          <div>
            <Label className="mb-1.5 block text-xs font-medium">Margin</Label>
            <div className="flex items-center gap-3">
              <Slider
                min={0}
                max={72}
                step={4}
                value={[opts.margin]}
                onValueChange={([v]) => set("margin", v)}
                className="flex-1"
              />
              <span className="w-14 text-right text-sm font-semibold">{opts.margin}pt</span>
            </div>
          </div>
        </div>
      );

    case "pdf-to-word":
    case "pdf-to-excel":
      return (
        <p className="rounded-xl bg-primary/[0.04] p-3 text-xs text-muted-foreground">
          Text is extracted into a fully editable file. Scanned PDFs contain
          images only — for those, use PDF to JPG or an OCR tool.
        </p>
      );

    case "pdf-to-ppt":
      return (
        <p className="rounded-xl bg-primary/[0.04] p-3 text-xs text-muted-foreground">
          Each PDF page is rendered at high resolution and placed as a
          full-bleed slide image in a 16:9 PowerPoint file.
        </p>
      );

    case "word-to-pdf":
      return (
        <div>
          <Label className="mb-1.5 block text-xs font-medium">Page size</Label>
          <Select
            value={opts.docPageSize}
            onValueChange={(v) => set("docPageSize", v as Options["docPageSize"])}
          >
            <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="a4">A4</SelectItem>
              <SelectItem value="letter">US Letter</SelectItem>
            </SelectContent>
          </Select>
        </div>
      );

    case "watermark":
      return <WatermarkOptions opts={opts} set={set} files={files} />;

    case "page-numbers":
      return (
        <div className="space-y-4">
          <TwoCol>
            <div>
              <Label className="mb-1.5 block text-xs font-medium">Format</Label>
              <Select
                value={opts.pnFormat}
                onValueChange={(v) => set("pnFormat", v as Options["pnFormat"])}
              >
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="n">1, 2, 3…</SelectItem>
                  <SelectItem value="page_n">Page 1, Page 2…</SelectItem>
                  <SelectItem value="n_of_total">1 / 10</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5 block text-xs font-medium">Position</Label>
              <Select
                value={opts.pnPosition}
                onValueChange={(v) => set("pnPosition", v as Options["pnPosition"])}
              >
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bottom-center">Bottom center</SelectItem>
                  <SelectItem value="bottom-right">Bottom right</SelectItem>
                  <SelectItem value="bottom-left">Bottom left</SelectItem>
                  <SelectItem value="top-center">Top center</SelectItem>
                  <SelectItem value="top-right">Top right</SelectItem>
                  <SelectItem value="top-left">Top left</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </TwoCol>
          <div>
            <Label className="mb-1.5 block text-xs font-medium">
              Start numbering at
            </Label>
            <Input
              type="number"
              min={1}
              value={opts.pnStart}
              onChange={(e) => set("pnStart", Math.max(1, Number(e.target.value) || 1))}
              className="w-28 rounded-xl"
            />
          </div>
          <div>
            <Label className="mb-1.5 block text-xs font-medium">Font size</Label>
            <div className="flex items-center gap-3">
              <Slider
                min={7}
                max={24}
                step={1}
                value={[opts.pnSize]}
                onValueChange={([v]) => set("pnSize", v)}
                className="flex-1"
              />
              <span className="w-14 text-right text-sm font-semibold">{opts.pnSize}pt</span>
            </div>
          </div>
          <div className="flex items-center justify-between rounded-xl border p-3">
            <Label className="text-xs font-medium">Skip first page (cover)</Label>
            <Switch
              checked={opts.pnSkipFirst}
              onCheckedChange={(v) => set("pnSkipFirst", v)}
            />
          </div>
        </div>
      );

    case "crop":
      return <CropOptions opts={opts} set={set} files={files} />;

    case "protect":
      return (
        <div className="space-y-4">
          <div>
            <Label className="mb-1.5 block text-xs font-medium">Password</Label>
            <Input
              type="password"
              value={opts.password}
              onChange={(e) => set("password", e.target.value)}
              placeholder="At least 4 characters"
              className="rounded-xl"
            />
          </div>
          <div>
            <Label className="mb-1.5 block text-xs font-medium">
              Confirm password
            </Label>
            <Input
              type="password"
              value={opts.confirm}
              onChange={(e) => set("confirm", e.target.value)}
              placeholder="Repeat password"
              className="rounded-xl"
            />
            {opts.confirm && opts.password !== opts.confirm && (
              <p className="mt-1.5 text-xs text-destructive">
                Passwords do not match
              </p>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Standard PDF encryption — opens in Adobe, Preview, browsers. We
            cannot recover a lost password.
          </p>
        </div>
      );

    case "unlock":
      return (
        <div>
          <Label className="mb-1.5 block text-xs font-medium">
            Current password
          </Label>
          <Input
            type="password"
            value={opts.password}
            onChange={(e) => set("password", e.target.value)}
            placeholder="The password you already know"
            className="rounded-xl"
          />
          <p className="mt-2 text-[11px] text-muted-foreground">
            This removes the password from the saved copy — use it only on
            files you own.
          </p>
        </div>
      );

    default:
      return null;
  }
}

/* ---------- watermark with live preview ---------- */

function WatermarkOptions({
  opts,
  set,
  files,
}: {
  opts: Options;
  set: <K extends keyof Options>(k: K, v: Options[K]) => void;
  files: StoreFile[];
}) {
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!files[0]) return;
    let alive = true;
    firstPagePreview(files[0].file, 0.9)
      .then((p) => alive && setPreview(p.dataUrl))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [files]);

  return (
    <div className="space-y-4">
      <div>
        <Label className="mb-1.5 block text-xs font-medium">Text</Label>
        <Input
          value={opts.wmText}
          onChange={(e) => set("wmText", e.target.value)}
          placeholder="CONFIDENTIAL, DRAFT, company name…"
          className="rounded-xl"
        />
      </div>

      {preview && (
        <div className="relative mx-auto max-w-sm overflow-hidden rounded-xl border shadow-sm">
          
          <img src={preview} alt="Watermark preview" className="block w-full" />
          <WatermarkOverlay opts={opts} />
        </div>
      )}

      <TwoCol>
        <div>
          <Label className="mb-1.5 block text-xs font-medium">Layout</Label>
          <Select
            value={opts.wmPosition}
            onValueChange={(v) => set("wmPosition", v as Options["wmPosition"])}
          >
            <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="diagonal">Diagonal</SelectItem>
              <SelectItem value="center">Center</SelectItem>
              <SelectItem value="tile">Tiled</SelectItem>
              <SelectItem value="footer">Footer</SelectItem>
              <SelectItem value="header">Header</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="mb-1.5 block text-xs font-medium">Color</Label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={opts.wmColor}
              onChange={(e) => set("wmColor", e.target.value)}
              className="h-10 w-12 cursor-pointer rounded-lg border bg-card p-1"
              aria-label="Watermark color"
            />
            <span className="text-xs font-mono text-muted-foreground">
              {opts.wmColor}
            </span>
          </div>
        </div>
      </TwoCol>

      <div>
        <Label className="mb-1.5 block text-xs font-medium">
          Size · {opts.wmSize}pt
        </Label>
        <Slider
          min={16}
          max={120}
          step={2}
          value={[opts.wmSize]}
          onValueChange={([v]) => set("wmSize", v)}
        />
      </div>
      <div>
        <Label className="mb-1.5 block text-xs font-medium">
          Opacity · {Math.round(opts.wmOpacity * 100)}%
        </Label>
        <Slider
          min={5}
          max={80}
          step={5}
          value={[Math.round(opts.wmOpacity * 100)]}
          onValueChange={([v]) => set("wmOpacity", v / 100)}
        />
      </div>
      <div>
        <Label className="mb-1.5 block text-xs font-medium">
          Rotation · {opts.wmRotation}°
        </Label>
        <Slider
          min={0}
          max={90}
          step={5}
          value={[opts.wmRotation]}
          onValueChange={([v]) => set("wmRotation", v)}
        />
      </div>
      <div className="flex items-center justify-between rounded-xl border p-3">
        <Label className="text-xs font-medium">Bold text</Label>
        <Switch
          checked={opts.wmBold}
          onCheckedChange={(v) => set("wmBold", v)}
        />
      </div>
    </div>
  );
}

function WatermarkOverlay({ opts }: { opts: Options }) {
  const style: React.CSSProperties = {
    color: opts.wmColor,
    opacity: opts.wmOpacity,
    fontSize: `${Math.max(8, opts.wmSize / 4)}px`,
    fontWeight: opts.wmBold ? 800 : 400,
    transform: `rotate(${opts.wmPosition === "header" || opts.wmPosition === "footer" || opts.wmPosition === "center" ? 0 : opts.wmRotation}deg)`,
    letterSpacing: "0.02em",
    whiteSpace: "nowrap",
    pointerEvents: "none",
  };
  if (opts.wmPosition === "tile") {
    return (
      <div className="absolute inset-0 overflow-hidden">
        {[15, 45, 75].map((t) => (
          <span
            key={t}
            style={{ ...style, position: "absolute", left: `${t - 20}%`, top: `${t}%` }}
          >
            {opts.wmText}
          </span>
        ))}
      </div>
    );
  }
  if (opts.wmPosition === "footer")
    return (
      <span style={{ ...style, position: "absolute", left: "50%", bottom: "6%", transform: "translateX(-50%)" }}>
        {opts.wmText}
      </span>
    );
  if (opts.wmPosition === "header")
    return (
      <span style={{ ...style, position: "absolute", left: "50%", top: "6%", transform: "translateX(-50%)" }}>
        {opts.wmText}
      </span>
    );
  if (opts.wmPosition === "center")
    return (
      <span style={{ ...style, position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)" }}>
        {opts.wmText}
      </span>
    );
  return (
    <span
      style={{ ...style, position: "absolute", left: "18%", top: "46%" }}
    >
      {opts.wmText}
    </span>
  );
}

/* ---------- crop with live preview ---------- */

function CropOptions({
  opts,
  set,
  files,
}: {
  opts: Options;
  set: <K extends keyof Options>(k: K, v: Options[K]) => void;
  files: StoreFile[];
}) {
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!files[0]) return;
    let alive = true;
    firstPagePreview(files[0].file, 0.9)
      .then((p) => alive && setPreview(p.dataUrl))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [files]);

  const side = (
    key: "cropTop" | "cropRight" | "cropBottom" | "cropLeft",
    label: string
  ) => (
    <div>
      <Label className="mb-1.5 block text-xs font-medium">
        {label} · {opts[key]}%
      </Label>
      <Slider
        min={0}
        max={40}
        step={1}
        value={[opts[key]]}
        onValueChange={([v]) => set(key, v)}
      />
    </div>
  );

  return (
    <div className="space-y-4">
      {preview && (
        <div className="relative mx-auto max-w-sm overflow-hidden rounded-xl border shadow-sm">
          
          <img src={preview} alt="Crop preview" className="block w-full" />
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background: "rgba(15,23,42,0.55)",
              clipPath: `polygon(0 0, 100% 0, 100% 100%, 0 100%, 0 0, ${opts.cropLeft}% ${opts.cropTop}%, ${opts.cropLeft}% ${100 - opts.cropBottom}%, ${100 - opts.cropRight}% ${100 - opts.cropBottom}%, ${100 - opts.cropRight}% ${opts.cropTop}%, ${opts.cropLeft}% ${opts.cropTop}%)`,
            }}
          />
          <div
            className="pointer-events-none absolute border-2 border-dashed border-primary"
            style={{
              left: `${opts.cropLeft}%`,
              top: `${opts.cropTop}%`,
              right: `${opts.cropRight}%`,
              bottom: `${opts.cropBottom}%`,
            }}
          />
        </div>
      )}
      <TwoCol>
        {side("cropTop", "Top")}
        {side("cropRight", "Right")}
        {side("cropBottom", "Bottom")}
        {side("cropLeft", "Left")}
      </TwoCol>
    </div>
  );
}

/* ---------- small building blocks ---------- */

function SegButtons({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { v: string; label: string }[];
}) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
      {options.map((o) => (
        <button
          key={o.v}
          onClick={() => onChange(o.v)}
          className={`rounded-xl border px-3 py-2.5 text-xs font-semibold transition ${
            value === o.v
              ? "border-primary bg-primary text-primary-foreground shadow-sm"
              : "bg-background hover:border-primary/40"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function TwoCol({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>;
}
