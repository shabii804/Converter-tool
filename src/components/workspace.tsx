"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useStore, type StoreFile } from "@/lib/store";
import { toolById } from "@/lib/tools";
import { firstPagePreview } from "@/lib/pdf-engine";
import { executeRun } from "@/lib/pipeline";
import { idpMmSize } from "@/lib/id-photo-presets";
import { Button } from "@/components/kit/button";
import { Card } from "@/components/kit/card";
import { FileCard } from "@/components/kit/file-card";
import { Dropzone } from "@/components/kit/dropzone";
import { IconTile } from "@/components/kit/icon-tile";
import { notify } from "@/components/kit/toast";
import { EmptyPagesIllustration } from "@/components/illustrations";
import { PageThumbs } from "./page-thumbs";
import dynamic from "next/dynamic";
import { RelatedTools } from "./related-tools";
import { ShareButton } from "./share-button";
import { formatBytes } from "@/lib/format";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import {
  ArrowLeft,
  Play,
  Eye,
  TriangleAlert,
} from "lucide-react";

/* ---------- per-tool option state ---------- */

export interface Options {
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
  // compress-target
  targetKB: number;
  // image tools
  imgQuality: number;
  /** convert-image output quality — high by default so conversions don't degrade */
  convertQuality: number;
  imgFormat: "jpeg" | "webp";
  imgMaxDim: number;
  resizeMode: "width" | "height" | "percent" | "fit";
  resizeValue: number;
  resizeFormat: "keep" | "jpeg" | "png" | "webp";
  convertFormat: "jpeg" | "png" | "webp";
  // pdf-to-png
  pngScale: 1 | 2 | 3;
  // extract-images
  extractFormat: "png" | "jpeg";
  // extract-text
  pageMarkers: boolean;
  // text-to-pdf
  ttfText: string;
  ttfFont: "helvetica" | "times" | "courier";
  ttfSize: number;
  ttfPageSize: "a4" | "letter";
  ttfMargin: number;
  ttfCustomFont: File | null;
  // annotation editor (edit-pdf / sign-pdf / redact-pdf)
  editorOpts: Record<string, unknown>;
  editorCount: number;
  // flatten
  flattenQuality: "standard" | "high" | "lossless";
  // edit-metadata
  mdTitle: string;
  mdAuthor: string;
  mdSubject: string;
  mdKeywords: string;
  mdCreator: string;
  mdProducer: string;
  mdClearEmpty: boolean;
  // qr-to-pdf
  qrText: string;
  qrEc: "L" | "M" | "Q" | "H";
  qrSize: number;
  qrPageSize: "a4" | "letter";
  qrCaption: string;
  // ocr
  ocrLang: "eng" | "spa" | "fra" | "por" | "hin" | "urd" | "ara";
  ocrPageMarkers: boolean;
  // id-photo
  idPreset: string;
  idZoom: number;
  idOffsetX: number;
  idOffsetY: number;
  idBg: string;
  idSheet: boolean;
  idGuide: boolean;
  idPaper: "10x15" | "4x6" | "a4";
  /** copies on the print sheet; 0 = as many as fit */
  idCopies: number;
  idCutGuides: boolean;
  idUnit: "mm" | "in";
  idCustomW: number;
  idCustomH: number;
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
  targetKB: 200,
  imgQuality: 0.6,
  convertQuality: 0.92,
  imgFormat: "jpeg",
  imgMaxDim: 0,
  resizeMode: "width",
  resizeValue: 1280,
  resizeFormat: "keep",
  convertFormat: "webp",
  pngScale: 2,
  extractFormat: "png",
  pageMarkers: true,
  ttfText: "",
  ttfFont: "helvetica",
  ttfSize: 11,
  ttfPageSize: "a4",
  ttfMargin: 56,
  ttfCustomFont: null,
  editorOpts: {},
  editorCount: 0,
  flattenQuality: "high",
  mdTitle: "",
  mdAuthor: "",
  mdSubject: "",
  mdKeywords: "",
  mdCreator: "",
  mdProducer: "",
  mdClearEmpty: false,
  qrText: "",
  qrEc: "M",
  qrSize: 768,
  qrPageSize: "a4",
  qrCaption: "",
  ocrLang: "eng",
  ocrPageMarkers: true,
  idPreset: "p35x45",
  idZoom: 1,
  idOffsetX: 0,
  idOffsetY: 0,
  idBg: "#ffffff",
  idSheet: true,
  idGuide: true,
  idPaper: "10x15",
  idCopies: 0,
  idCutGuides: true,
  idUnit: "mm",
  idCustomW: 35,
  idCustomH: 45,
});

/** Friendly large-file threshold (honest copy, no fake limits). */
const LARGE_FILE_BYTES = 100 * 1024 * 1024;

/** code-split: the annotation editor (+ its fonts) loads only when a tool needs it */
const AnnotationEditor = dynamic(
  () => import("./annotation-editor").then((m) => m.AnnotationEditor),
  {
    ssr: false,
    loading: () => (
      <div className="h-72 animate-pulse rounded-card bg-surface-2" aria-hidden="true" />
    ),
  }
);

/* code-split: the dedicated one-page ID Photo tool loads only on its route */
const IdPhotoTool = dynamic(
  () => import("./id-photo-tool").then((m) => m.IdPhotoTool),
  {
    loading: () => (
      <div
        className="mx-auto h-96 w-full max-w-[1120px] px-4 pt-6 sm:px-6"
        aria-hidden="true"
      >
        <div className="h-96 animate-pulse rounded-card bg-surface-2" />
      </div>
    ),
  }
);

/* ---------- main component ---------- */

export function Workspace({
  hideHeader,
  initialToolId,
  initialOpts,
}: {
  hideHeader?: boolean;
  /** server-known tool id (deep links / intent pages) — enables full SSR */
  initialToolId?: string;
  /** server-known option presets (intent pages) — merged once, deterministic */
  initialOpts?: Record<string, unknown>;
}) {
  const storeToolId = useStore((s) => s.toolId);
  const toolId = storeToolId ?? initialToolId ?? "";
  const tool = toolById(toolId);
  const files = useStore((s) => s.files);
  const addFiles = useStore((s) => s.addFiles);
  const removeFile = useStore((s) => s.removeFile);
  const goHome = useStore((s) => s.goHome);

  /* initializer runs identically on server + client first render → no CLS */
  const [opts, setOpts] = useState<Options>(() => ({
    ...defaultOptions(),
    ...((initialOpts ?? {}) as Partial<Options>),
  }));
  const [running, setRunning] = useState(false);
  const moreInputRef = useRef<HTMLInputElement>(null);

  /* consume a preset seeded by an intent page once (user-adjustable after) */
  useEffect(() => {
    const preset = useStore.getState().pendingPreset;
    if (preset) {
      setOpts((o) => ({ ...o, ...preset }));
      useStore.setState({ pendingPreset: null });
    }
  }, []);

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
    if (tool.id === "organize" && opts.order.length === 0) return false;
    if (tool.id === "edit-pdf" && opts.editorCount === 0) return false;
    if (tool.id === "sign-pdf" && opts.editorCount === 0) return false;
    if (tool.id === "redact-pdf" && opts.editorCount === 0) return false;
    if (tool.id === "text-to-pdf" && !opts.ttfText.trim()) return false;
    if (tool.id === "qr-to-pdf" && !opts.qrText.trim()) return false;
    if (tool.id === "edit-metadata") {
      const anyField = [
        opts.mdTitle,
        opts.mdAuthor,
        opts.mdSubject,
        opts.mdKeywords,
        opts.mdCreator,
        opts.mdProducer,
      ].some((v) => v.trim());
      if (!anyField && !opts.mdClearEmpty) return false;
    }
    return true;
  }, [tool, files, opts]);

  const onEditorChange = useCallback(
    (engineOpts: Record<string, unknown>, count: number) => {
      setOpts((o) => ({ ...o, editorOpts: engineOpts, editorCount: count }));
    },
    []
  );

  const onRun = useCallback(async () => {
    if (!tool || !canRun || running) return;
    setRunning(true);
    const es = files.map((f) => ({ id: f.id, file: f.file }));
    await executeRun(tool.id, es, buildOptions(tool.id, opts));
    setRunning(false);
  }, [canRun, running, files, opts, tool]);

  if (!tool) return null;

  /* the ID Photo tool gets its own one-page layout (breadcrumb, 60/40
     preview/options split, direct manipulation, on-page downloads) */
  if (tool.id === "id-photo") {
    return (
      <IdPhotoTool
        opts={opts}
        set={set}
        files={files}
        addFiles={addFiles}
        removeFile={removeFile}
      />
    );
  }

  const hasLargeFile = files.some((f) => f.size > LARGE_FILE_BYTES);

  return (
    <section className="mx-auto max-w-6xl px-4 pb-10 pt-8 sm:px-6">
      {/* tool header */}
      {!hideHeader && (
      <div className="mb-8 flex items-center gap-3.5">
        <Button
          variant="ghost"
          size="icon"
          onClick={goHome}
          aria-label="Back to home"
        >
          <ArrowLeft />
        </Button>
        <IconTile icon={tool.icon} category={tool.category} size="lg" />
        <div>
          <h1 className="text-h2 font-bold tracking-heading">{tool.name}</h1>
          <p className="text-caption text-fg-muted sm:text-sm">{tool.description}</p>
        </div>
        <div className="ml-auto hidden sm:block">
          <ShareButton title={tool.name} url={typeof window !== "undefined" ? window.location.href : ""} />
        </div>
      </div>
      )}

      <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
        {/* left: files / info */}
        <div className="w-full shrink-0 lg:w-[360px]">
          {tool.input === "none" && (
            <Card className="p-6">
              <div className="flex flex-col items-center gap-3 py-6 text-center">
                <IconTile icon={tool.icon} category={tool.category} size="lg" />
                {tool.id === "qr-to-pdf" ? (
                  <>
                    <p className="text-sm font-bold">Type a link or text</p>
                    <p className="max-w-64 text-[13px] leading-relaxed text-fg-muted">
                      Use the options panel — your QR code is generated right
                      here on this device. Nothing is uploaded.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-bold">Type or paste your text</p>
                    <p className="max-w-64 text-[13px] leading-relaxed text-fg-muted">
                      Use the options panel — your text becomes a paginated PDF right
                      here on this device. Nothing is uploaded.
                    </p>
                  </>
                )}
              </div>
              <div className="mt-2 flex items-center gap-2.5 rounded-control border border-success/25 bg-success/[0.07] px-3.5 py-3">
                <Eye className="size-4 shrink-0 text-success" />
                <p className="text-[13px] leading-snug text-fg-muted">
                  Processing happens <b className="text-foreground">on this device</b>.
                  Nothing is uploaded.
                </p>
              </div>
            </Card>
          )}
          {tool.input !== "none" && (
          <Card className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-bold">
                Files
                <span className="ml-1.5 text-[13px] font-normal text-fg-faint">
                  {files.length}
                  {tool.maxFiles < 100 ? `/${tool.maxFiles}` : ""}
                </span>
              </p>
              {files.length > 0 && (
                <button
                  onClick={() => files.forEach((f) => removeFile(f.id))}
                  className="text-[13px] font-medium text-fg-muted transition-colors hover:text-destructive"
                >
                  Clear
                </button>
              )}
            </div>

            {files.length === 0 ? (
              <div className="space-y-3">
                <Dropzone
                  compact
                  accept={tool.accept}
                  multiple={tool.maxFiles > 1}
                  onFiles={(list) => {
                    const { rejected } = addFiles(list);
                    if (rejected > 0)
                      notify.warning(
                        `${rejected} file(s) skipped`,
                        `Wrong type for ${tool.name}`
                      );
                  }}
                  title={`Drop ${tool.id === "ocr" ? "PDF or image files" : tool.input === "image" ? "images" : tool.input === "docx" ? ".docx files" : "PDF files"} here`}
                  subtitle="or click to browse"
                />
                <div className="flex justify-center">
                  <EmptyPagesIllustration className="w-24 opacity-80" />
                </div>
              </div>
            ) : (
              <div className="max-h-[360px] space-y-2.5 overflow-y-auto pr-1 [scrollbar-width:thin]">
                {files.map((f) => (
                  <FileCard
                    key={f.id}
                    name={f.name}
                    size={f.size}
                    onRemove={() => removeFile(f.id)}
                  />
                ))}
                {files.length < tool.maxFiles && (
                  <button
                    onClick={() => moreInputRef.current?.click()}
                    className="flex w-full items-center justify-center gap-1.5 rounded-control border border-dashed border-border-strong py-3 text-[13px] font-medium text-fg-muted transition-colors hover:border-ring hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    Add more files
                  </button>
                )}
                <input
                  ref={moreInputRef}
                  type="file"
                  className="hidden"
                  aria-hidden="true"
                  tabIndex={-1}
                  accept={tool.accept || undefined}
                  multiple={tool.maxFiles > 1}
                  onChange={(e) => {
                    const list = Array.from(e.target.files || []);
                    if (list.length) {
                      const { rejected } = addFiles(list);
                      if (rejected > 0)
                        notify.warning(
                          `${rejected} file(s) skipped`,
                          `Wrong type for ${tool.name}`
                        );
                    }
                    e.target.value = "";
                  }}
                />
              </div>
            )}

            {/* honest large-file warning (rule 7) */}
            {hasLargeFile && (
              <div className="mt-4 flex items-start gap-2.5 rounded-control border border-warning/30 bg-warning/10 p-3.5">
                <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" />
                <p className="text-[13px] leading-snug text-fg-muted">
                  <b className="text-foreground">Large file detected.</b>{" "}
                  Everything runs on this device, so this may take a while and
                  use a lot of memory. Keep the tab in the foreground until
                  it finishes.
                </p>
              </div>
            )}

            {/* privacy note */}
            <div className="mt-4 flex items-center gap-2.5 rounded-control border border-success/25 bg-success/[0.07] px-3.5 py-3">
              <Eye className="size-4 shrink-0 text-success" />
              <p className="text-[13px] leading-snug text-fg-muted">
                Processing happens <b className="text-foreground">on this device</b>.
                Nothing is uploaded.
              </p>
            </div>
          </Card>
          )}
        </div>

        {/* right: options */}
        <div className="min-w-0 flex-1">
          <Card className="p-6">
            <p className="mb-5 text-sm font-bold">Options</p>
            <OptionsPanel
              toolId={tool.id}
              opts={opts}
              set={set}
              files={files}
              onEditorChange={onEditorChange}
            />
          </Card>

          {/* run button — sticky on mobile so it is always reachable */}
          <div className="sticky bottom-0 -mx-4 mt-6 border-t border-border-subtle bg-background/90 px-4 py-4 backdrop-blur-lg sm:-mx-6 sm:px-6 lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:px-0 lg:py-0 lg:backdrop-blur-none">
            <Button
              onClick={onRun}
              disabled={!canRun || running}
              loading={running}
              size="xl"
              className="w-full text-base shadow-glow"
            >
              {!running && <Play className="fill-current" />}
              {running ? "Working…" : `Run ${tool.name}`}
            </Button>
            {!canRun && files.length > 0 && (
              <p className="mt-2 text-center text-[13px] text-fg-muted">
                {hint(toolId, opts, files)}
              </p>
            )}
          </div>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="mt-10 hidden justify-center text-micro text-fg-faint lg:flex"
      >
        Works offline · No watermark added by us · Free forever
      </motion.div>

      {/* contextual internal links to related tools */}
      <RelatedTools toolId={tool.id} />
    </section>
  );
}

/* ---------- option mapping (UI state → engine options) ---------- */

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
      // engine contract: order = kept pages (1-based) in their new order.
      // if the user never dragged, fall back to natural ascending order.
      return {
        order:
          opts.order.length > 0
            ? opts.order.filter((p) => !opts.organizeDeleted.has(p))
            : [],
        rotations: opts.rotations,
      };
    case "compress-target":
      return { targetKB: opts.targetKB };
    case "compress-image":
      return {
        format: opts.imgFormat,
        quality: opts.imgQuality,
        maxDimension: opts.imgMaxDim,
      };
    case "resize-image":
      return {
        mode: opts.resizeMode,
        value: opts.resizeValue,
        format: opts.resizeFormat,
      };
    case "convert-image":
      return {
        format: opts.convertFormat,
        quality: opts.convertQuality,
      };
    case "pdf-to-png":
      return { scale: opts.pngScale };
    case "extract-images":
      return { format: opts.extractFormat };
    case "extract-text":
      return { pageMarkers: opts.pageMarkers };
    case "text-to-pdf":
      return {
        text: opts.ttfText,
        fontFamily: opts.ttfFont,
        fontSize: opts.ttfSize,
        pageSize: opts.ttfPageSize,
        margin: opts.ttfMargin,
        customFont: opts.ttfCustomFont,
      };
    case "edit-pdf":
    case "sign-pdf":
    case "redact-pdf":
      return opts.editorOpts;
    case "flatten":
      return { quality: opts.flattenQuality };
    case "edit-metadata":
      return {
        title: opts.mdTitle,
        author: opts.mdAuthor,
        subject: opts.mdSubject,
        keywords: opts.mdKeywords,
        creator: opts.mdCreator,
        producer: opts.mdProducer,
        clearEmpty: opts.mdClearEmpty,
      };
    case "qr-to-pdf":
      return {
        text: opts.qrText,
        ec: opts.qrEc,
        pixelSize: opts.qrSize,
        pageSize: opts.qrPageSize,
        caption: opts.qrCaption,
      };
    case "ocr":
      return { lang: opts.ocrLang, pageMarkers: opts.ocrPageMarkers };
    case "id-photo": {
      const mm = idpMmSize(
        opts.idPreset,
        opts.idCustomW,
        opts.idCustomH,
        opts.idUnit
      );
      return {
        preset: opts.idPreset,
        w: mm.w,
        h: mm.h,
        zoom: opts.idZoom,
        offsetX: opts.idOffsetX,
        offsetY: opts.idOffsetY,
        bg: opts.idBg,
        sheet: opts.idSheet,
        paper: opts.idPaper,
        copies: opts.idCopies,
        cutGuides: opts.idCutGuides,
      };
    }
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
  if (toolId === "organize" && opts.order.length === 0)
    return "Loading page previews — Run unlocks when they are ready";
  if (toolId === "edit-pdf" && opts.editorCount === 0)
    return "Add at least one annotation — text, highlight, shape, drawing or image";
  if (toolId === "sign-pdf" && opts.editorCount === 0)
    return "Create a signature and place it on the page";
  if (toolId === "redact-pdf" && opts.editorCount === 0)
    return "Draw at least one redaction box over the text you want removed";
  if (toolId === "text-to-pdf" && !opts.ttfText.trim())
    return "Type or paste some text first";
  if (toolId === "qr-to-pdf" && !opts.qrText.trim())
    return "Type the link or text the QR code should contain";
  if (toolId === "edit-metadata") {
    const anyField = [
      opts.mdTitle,
      opts.mdAuthor,
      opts.mdSubject,
      opts.mdKeywords,
      opts.mdCreator,
      opts.mdProducer,
    ].some((v) => v.trim());
    if (!anyField && !opts.mdClearEmpty)
      return "Type a new value in any field — or switch on “Clear fields I leave empty”";
  }
  return "";
}

/* ---------- options panel ---------- */

function OptionsPanel({
  toolId,
  opts,
  set,
  files,
  onEditorChange,
}: {
  toolId: string;
  opts: Options;
  set: <K extends keyof Options>(k: K, v: Options[K]) => void;
  files: StoreFile[];
  onEditorChange: (engineOpts: Record<string, unknown>, count: number) => void;
}) {
  switch (toolId) {
    case "merge":
      return (
        <p className="rounded-control bg-surface-1 p-4 text-[13px] leading-relaxed text-fg-muted">
          Files merge in the order listed. Add more files any time — one click
          and they become a single PDF.
        </p>
      );

    case "split":
      return (
        <div className="space-y-5">
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
              <Label className="mb-2 block text-[13px] font-medium">
                Ranges (comma separated)
              </Label>
              <Input
                value={opts.ranges}
                onChange={(e) => set("ranges", e.target.value)}
                placeholder="1-3, 5, 8-10"
              />
              <p className="mt-2 text-micro text-fg-faint">
                Each range or page becomes its own PDF file.
              </p>
            </div>
          )}
          {opts.splitMode === "fixed" && (
            <div>
              <Label className="mb-2 block text-[13px] font-medium">Split every</Label>
              <div className="flex items-center gap-4">
                <Slider
                  min={1}
                  max={20}
                  step={1}
                  value={[opts.everyN]}
                  onValueChange={([v]) => set("everyN", v)}
                  className="flex-1"
                />
                <span className="w-20 text-right text-sm font-bold">
                  {opts.everyN} page{opts.everyN > 1 ? "s" : ""}
                </span>
              </div>
            </div>
          )}
          {opts.splitMode === "extract" && files[0] && (
            <div>
              <Label className="mb-3 block text-[13px] font-medium">
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
        <div className="space-y-3">
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
              className={`flex w-full items-center gap-3.5 rounded-control border p-4 text-left transition-all ${
                opts.level === o.v
                  ? "border-ring bg-primary/[0.04] shadow-sm"
                  : "border-border hover:border-border-strong"
              }`}
            >
              <span
                className={`flex size-4.5 shrink-0 items-center justify-center rounded-full border-2 ${
                  opts.level === o.v
                    ? "border-primary bg-primary"
                    : "border-border-strong"
                }`}
              >
                {opts.level === o.v && (
                  <span className="size-1.5 rounded-full bg-white" />
                )}
              </span>
              <span>
                <span className="block text-sm font-semibold">{o.t}</span>
                <span className="block text-[13px] text-fg-muted">{o.d}</span>
              </span>
            </button>
          ))}
          <p className="pt-1 text-[13px] leading-relaxed text-fg-faint">
            SwiftPDF tries both a lossless re-save and smart re-encoding, then
            keeps whichever is smaller.
          </p>
        </div>
      );

    case "organize":
      return (
        <div className="space-y-5">
          <p className="text-[13px] text-fg-muted">
            Click a page to mark it for deletion · drag cards to reorder · ↻ rotates a page
          </p>
          {files[0] && (
            <PageThumbs
              file={files[0].file}
              selected={opts.organizeDeleted}
              selectionMeans="delete"
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
          {files[0] && (
            <p className="text-micro leading-relaxed text-fg-faint">
              Deleted pages are removed from the output. Everything else stays
              in the order shown above.
            </p>
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
        <div className="space-y-5">
          <TwoCol>
            <div>
              <Label className="mb-2 block text-[13px] font-medium">Page size</Label>
              <Select
                value={opts.pageSize}
                onValueChange={(v) => set("pageSize", v as Options["pageSize"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fit">Fit to image</SelectItem>
                  <SelectItem value="a4">A4</SelectItem>
                  <SelectItem value="letter">US Letter</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-2 block text-[13px] font-medium">Orientation</Label>
              <Select
                value={opts.orientation}
                onValueChange={(v) => set("orientation", v as Options["orientation"])}
                disabled={opts.pageSize === "fit"}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto</SelectItem>
                  <SelectItem value="portrait">Portrait</SelectItem>
                  <SelectItem value="landscape">Landscape</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </TwoCol>
          <div>
            <Label className="mb-2 block text-[13px] font-medium">Margin</Label>
            <div className="flex items-center gap-4">
              <Slider
                min={0}
                max={72}
                step={4}
                value={[opts.margin]}
                onValueChange={([v]) => set("margin", v)}
                className="flex-1"
              />
              <span className="w-16 text-right text-sm font-bold">{opts.margin}pt</span>
            </div>
          </div>
        </div>
      );

    case "pdf-to-word":
    case "pdf-to-excel":
      return (
        <p className="rounded-control bg-surface-1 p-4 text-[13px] leading-relaxed text-fg-muted">
          Text is extracted into a fully editable file. Scanned PDFs contain
          images only — for those, use the OCR Text Recognition tool.
        </p>
      );

    case "pdf-to-ppt":
      return (
        <p className="rounded-control bg-surface-1 p-4 text-[13px] leading-relaxed text-fg-muted">
          Each PDF page is rendered at high resolution and placed as a
          full-bleed slide image in a 16:9 PowerPoint file.
        </p>
      );

    case "word-to-pdf":
      return (
        <div>
          <Label className="mb-2 block text-[13px] font-medium">Page size</Label>
          <Select
            value={opts.docPageSize}
            onValueChange={(v) => set("docPageSize", v as Options["docPageSize"])}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
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
        <div className="space-y-5">
          <TwoCol>
            <div>
              <Label className="mb-2 block text-[13px] font-medium">Format</Label>
              <Select
                value={opts.pnFormat}
                onValueChange={(v) => set("pnFormat", v as Options["pnFormat"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="n">1, 2, 3…</SelectItem>
                  <SelectItem value="page_n">Page 1, Page 2…</SelectItem>
                  <SelectItem value="n_of_total">1 / 10</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-2 block text-[13px] font-medium">Position</Label>
              <Select
                value={opts.pnPosition}
                onValueChange={(v) => set("pnPosition", v as Options["pnPosition"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
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
            <Label className="mb-2 block text-[13px] font-medium">
              Start numbering at
            </Label>
            <Input
              type="number"
              min={1}
              value={opts.pnStart}
              onChange={(e) => set("pnStart", Math.max(1, Number(e.target.value) || 1))}
              className="w-28"
            />
          </div>
          <div>
            <Label className="mb-2 block text-[13px] font-medium">Font size</Label>
            <div className="flex items-center gap-4">
              <Slider
                min={7}
                max={24}
                step={1}
                value={[opts.pnSize]}
                onValueChange={([v]) => set("pnSize", v)}
                className="flex-1"
              />
              <span className="w-16 text-right text-sm font-bold">{opts.pnSize}pt</span>
            </div>
          </div>
          <div className="flex items-center justify-between rounded-control border border-border p-4">
            <Label className="text-[13px] font-medium">Skip first page (cover)</Label>
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
        <div className="space-y-5">
          <div>
            <Label htmlFor="protect-password" className="mb-2 block text-[13px] font-medium">Password</Label>
            <Input
              id="protect-password"
              type="password"
              value={opts.password}
              onChange={(e) => set("password", e.target.value)}
              placeholder="At least 4 characters"
            />
          </div>
          <div>
            <Label htmlFor="protect-confirm" className="mb-2 block text-[13px] font-medium">
              Confirm password
            </Label>
            <Input
              id="protect-confirm"
              type="password"
              value={opts.confirm}
              onChange={(e) => set("confirm", e.target.value)}
              placeholder="Repeat password"
            />
            {opts.confirm && opts.password !== opts.confirm && (
              <p className="mt-2 text-[13px] text-destructive">
                Passwords do not match
              </p>
            )}
          </div>
          <p className="text-[13px] leading-relaxed text-fg-faint">
            Standard PDF encryption — opens in Adobe, Preview, browsers. We
            cannot recover a lost password.
          </p>
        </div>
      );

    case "unlock":
      return (
        <div>
          <Label className="mb-2 block text-[13px] font-medium">
            Current password
          </Label>
          <Input
            type="password"
            value={opts.password}
            onChange={(e) => set("password", e.target.value)}
            placeholder="The password you already know"
          />
          <p className="mt-2.5 text-[13px] leading-relaxed text-fg-faint">
            This removes the password from the saved copy — use it only on
            files you own.
          </p>
        </div>
      );

    case "compress-target":
      return (
        <div className="space-y-3">
          {(
            [
              { v: 100, t: "100 KB" },
              { v: 200, t: "200 KB" },
              { v: 500, t: "500 KB" },
              { v: 1024, t: "1 MB" },
            ] as const
          ).map((o) => (
            <button
              key={o.v}
              onClick={() => set("targetKB", o.v)}
              className={`flex w-full items-center justify-between rounded-control border p-4 text-left transition-all ${
                opts.targetKB === o.v
                  ? "border-ring bg-primary/[0.04] shadow-sm"
                  : "border-border hover:border-border-strong"
              }`}
            >
              <span className="text-sm font-semibold">{o.t}</span>
              {opts.targetKB === o.v && (
                <span className="flex size-4.5 items-center justify-center rounded-full border-2 border-primary bg-primary">
                  <span className="size-1.5 rounded-full bg-white" />
                </span>
              )}
            </button>
          ))}
          <div className="flex items-center gap-3 rounded-control border border-border p-4">
            <Label className="shrink-0 text-[13px] font-medium">Custom</Label>
            <Input
              type="number"
              min={10}
              max={100000}
              value={opts.targetKB}
              onChange={(e) => set("targetKB", Math.max(10, Number(e.target.value) || 10))}
              className="w-32"
              aria-label="Custom target size in KB"
            />
            <span className="text-[13px] text-fg-muted">KB</span>
          </div>
          <p className="text-[13px] leading-relaxed text-fg-faint">
            A lossless re-save is tried first. To hit an exact size, pages are
            then re-encoded as images — text stops being selectable. For a
            text-preserving shrink, use the regular Compress tool.
          </p>
        </div>
      );

    case "compress-image":
      return (
        <div className="space-y-5">
          <div>
            <Label className="mb-2 block text-[13px] font-medium">
              Quality · {Math.round(opts.imgQuality * 100)}%
            </Label>
            <Slider
              min={20}
              max={95}
              step={5}
              value={[Math.round(opts.imgQuality * 100)]}
              onValueChange={([v]) => set("imgQuality", v / 100)}
            />
          </div>
          <TwoCol>
            <div>
              <Label className="mb-2 block text-[13px] font-medium">Output format</Label>
              <SegButtons
                value={opts.imgFormat}
                onChange={(v) => set("imgFormat", v as Options["imgFormat"])}
                options={[
                  { v: "jpeg", label: "JPG" },
                  { v: "webp", label: "WebP" },
                ]}
              />
            </div>
            <div>
              <Label className="mb-2 block text-[13px] font-medium">Max dimension</Label>
              <Select
                value={String(opts.imgMaxDim)}
                onValueChange={(v) => set("imgMaxDim", Number(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Keep original size</SelectItem>
                  <SelectItem value="3840">Downscale to 4K (3840px)</SelectItem>
                  <SelectItem value="2048">Downscale to 2048px</SelectItem>
                  <SelectItem value="1080">Downscale to 1080px</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </TwoCol>
          <p className="text-[13px] leading-relaxed text-fg-faint">
            JPG output fills transparent areas with white. WebP keeps
            transparency and usually compresses further.
          </p>
        </div>
      );

    case "resize-image":
      return (
        <div className="space-y-5">
          <SegButtons
            value={opts.resizeMode}
            onChange={(v) => set("resizeMode", v as Options["resizeMode"])}
            options={[
              { v: "width", label: "Width" },
              { v: "height", label: "Height" },
              { v: "percent", label: "Percent" },
              { v: "fit", label: "Fit in box" },
            ]}
          />
          <div>
            <Label className="mb-2 block text-[13px] font-medium">
              {opts.resizeMode === "percent" ? "Scale" : "Size in pixels"}
            </Label>
            <div className="flex items-center gap-3">
              <Input
                type="number"
                min={opts.resizeMode === "percent" ? 1 : 8}
                max={opts.resizeMode === "percent" ? 500 : 20000}
                value={opts.resizeValue}
                onChange={(e) =>
                  set("resizeValue", Math.max(1, Number(e.target.value) || 1))
                }
                className="w-32"
              />
              <span className="text-[13px] text-fg-muted">
                {opts.resizeMode === "percent"
                  ? "% of original"
                  : opts.resizeMode === "fit"
                    ? "px box (largest side)"
                    : "px"}
              </span>
            </div>
          </div>
          <div>
            <Label className="mb-2 block text-[13px] font-medium">Output format</Label>
            <Select
              value={opts.resizeFormat}
              onValueChange={(v) => set("resizeFormat", v as Options["resizeFormat"])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="keep">Keep original</SelectItem>
                <SelectItem value="jpeg">JPG</SelectItem>
                <SelectItem value="png">PNG</SelectItem>
                <SelectItem value="webp">WebP</SelectItem>
              </SelectContent>
            </Select>
            <p className="mt-2 text-[13px] leading-relaxed text-fg-faint">
              GIF and BMP inputs are saved as PNG; aspect ratio is always kept.
            </p>
          </div>
        </div>
      );

    case "convert-image":
      return (
        <div className="space-y-5">
          <SegButtons
            value={opts.convertFormat}
            onChange={(v) => set("convertFormat", v as Options["convertFormat"])}
            options={[
              { v: "jpeg", label: "JPG" },
              { v: "png", label: "PNG" },
              { v: "webp", label: "WebP" },
            ]}
          />
          {opts.convertFormat !== "png" && (
            <div>
              <Label className="mb-2 block text-[13px] font-medium">
                Quality · {Math.round(opts.convertQuality * 100)}%
              </Label>
              <Slider
                min={20}
                max={95}
                step={5}
                value={[Math.round(opts.convertQuality * 100)]}
                onValueChange={([v]) => set("convertQuality", v / 100)}
              />
            </div>
          )}
          <p className="text-[13px] leading-relaxed text-fg-faint">
            JPG fills transparent areas with white. Animated GIFs export their
            first frame.
          </p>
        </div>
      );

    case "pdf-to-png":
      return (
        <div className="space-y-3">
          <SegButtons
            value={String(opts.pngScale)}
            onChange={(v) => set("pngScale", Number(v) as 1 | 2 | 3)}
            options={[
              { v: "1", label: "Standard · 72 DPI" },
              { v: "2", label: "High · 144 DPI" },
              { v: "3", label: "Max · 216 DPI" },
            ]}
          />
          <p className="text-[13px] leading-relaxed text-fg-faint">
            Lossless PNG per page. Very large pages are downscaled to stay
            within browser canvas limits.
          </p>
        </div>
      );

    case "extract-images":
      return (
        <div className="space-y-3">
          <SegButtons
            value={opts.extractFormat}
            onChange={(v) => set("extractFormat", v as Options["extractFormat"])}
            options={[
              { v: "png", label: "PNG · keeps transparency" },
              { v: "jpeg", label: "JPG · smaller files" },
            ]}
          />
          <p className="text-[13px] leading-relaxed text-fg-faint">
            Embedded images are pulled out and re-encoded. Purely
            text/vector PDFs have no images to extract — we will tell you.
          </p>
        </div>
      );

    case "extract-text":
      return (
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-control border border-border p-4">
            <Label className="text-[13px] font-medium">
              Add page markers (----- Page 2 -----)
            </Label>
            <Switch
              checked={opts.pageMarkers}
              onCheckedChange={(v) => set("pageMarkers", v)}
            />
          </div>
          <p className="text-[13px] leading-relaxed text-fg-faint">
            Extracts the PDF&apos;s text layer in reading order. Scanned pages
            have no text layer — we will say so instead of returning an empty
            file. OCR is on our roadmap.
          </p>
        </div>
      );

    case "text-to-pdf":
      return (
        <div className="space-y-5">
          <div>
            <Label className="mb-2 block text-[13px] font-medium">Your text</Label>
            <textarea
              value={opts.ttfText}
              onChange={(e) => set("ttfText", e.target.value)}
              rows={10}
              placeholder="Paste or type anything — it becomes a paginated PDF…"
              className="w-full resize-y rounded-control border border-border bg-background p-3 text-sm leading-relaxed outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Text to convert"
            />
            <p className="mt-1.5 text-micro text-fg-faint">
              {opts.ttfText.length.toLocaleString()} characters
            </p>
          </div>
          <TwoCol>
            <div>
              <Label className="mb-2 block text-[13px] font-medium">Font</Label>
              <Select
                value={opts.ttfFont}
                onValueChange={(v) => set("ttfFont", v as Options["ttfFont"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="helvetica">Helvetica</SelectItem>
                  <SelectItem value="times">Times</SelectItem>
                  <SelectItem value="courier">Courier</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-2 block text-[13px] font-medium">Page size</Label>
              <Select
                value={opts.ttfPageSize}
                onValueChange={(v) => set("ttfPageSize", v as Options["ttfPageSize"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="a4">A4</SelectItem>
                  <SelectItem value="letter">US Letter</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </TwoCol>
          <div>
            <Label className="mb-2 block text-[13px] font-medium">
              Font size · {opts.ttfSize}pt
            </Label>
            <Slider
              min={8}
              max={28}
              step={1}
              value={[opts.ttfSize]}
              onValueChange={([v]) => set("ttfSize", v)}
            />
          </div>
          <div>
            <Label className="mb-2 block text-[13px] font-medium">
              Margin · {opts.ttfMargin}pt
            </Label>
            <Slider
              min={24}
              max={96}
              step={8}
              value={[opts.ttfMargin]}
              onValueChange={([v]) => set("ttfMargin", v)}
            />
          </div>
          <div>
            <Label className="mb-2 block text-[13px] font-medium">
              Custom font for non-Latin text (.ttf / .otf)
            </Label>
            <input
              type="file"
              accept=".ttf,.otf,font/ttf,font/otf"
              onChange={(e) => set("ttfCustomFont", e.target.files?.[0] ?? null)}
              aria-label="Upload a custom font"
              className="block w-full text-[13px] text-fg-muted file:mr-3 file:min-h-11 file:rounded-control file:border file:border-border file:bg-background file:px-4 file:text-[13px] file:font-semibold file:text-foreground"
            />
            {opts.ttfCustomFont && (
              <p className="mt-1.5 text-micro text-fg-faint">
                Using {opts.ttfCustomFont.name} — it will be embedded (and
                subset) into the PDF.
              </p>
            )}
            <p className="mt-2 text-[13px] leading-relaxed text-fg-faint">
              Standard PDF fonts cover basic Latin. For Chinese, Arabic,
              Cyrillic and other scripts, upload a font file — it never leaves
              this device either.
            </p>
          </div>
        </div>
      );

    case "edit-pdf":
      return files[0] ? (
        <AnnotationEditor file={files[0].file} mode="edit" onChange={onEditorChange} />
      ) : (
        <p className="rounded-control bg-surface-1 p-4 text-[13px] text-fg-muted">
          Add a PDF on the left, then edit it here — text, whiteout, highlights,
          shapes, freehand drawings and images.
        </p>
      );

    case "sign-pdf":
      return files[0] ? (
        <AnnotationEditor file={files[0].file} mode="sign" onChange={onEditorChange} />
      ) : (
        <p className="rounded-control bg-surface-1 p-4 text-[13px] text-fg-muted">
          Add a PDF on the left, then draw, type or upload a signature and
          place it anywhere.
        </p>
      );

    case "redact-pdf":
      return files[0] ? (
        <AnnotationEditor file={files[0].file} mode="redact" onChange={onEditorChange} />
      ) : (
        <p className="rounded-control bg-surface-1 p-4 text-[13px] text-fg-muted">
          Add a PDF on the left, then draw black boxes over the text you want
          permanently removed.
        </p>
      );

    case "flatten":
      return (
        <div className="space-y-5">
          <SegButtons
            value={opts.flattenQuality}
            onChange={(v) => set("flattenQuality", v as Options["flattenQuality"])}
            options={[
              { v: "standard", label: "Standard · smaller file" },
              { v: "high", label: "High · recommended" },
              { v: "lossless", label: "Lossless PNG · largest" },
            ]}
          />
          <p className="text-[13px] leading-relaxed text-fg-faint">
            Flattening re-renders each page as an image. Text can no longer be
            selected or searched, form fields stop being editable and anything
            layered on top is baked in permanently. File size grows — the High
            setting is a good balance.
          </p>
        </div>
      );

    case "edit-metadata":
      return <MetadataOptions opts={opts} set={set} files={files} />;

    case "qr-to-pdf":
      return <QrOptions opts={opts} set={set} />;

    case "ocr":
      return (
        <div className="space-y-5">
          <div>
            <Label className="mb-2 block text-[13px] font-medium">
              Text language
            </Label>
            <Select
              value={opts.ocrLang}
              onValueChange={(v) => set("ocrLang", v as Options["ocrLang"])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="eng">English</SelectItem>
                <SelectItem value="spa">Spanish · Español</SelectItem>
                <SelectItem value="fra">French · Français</SelectItem>
                <SelectItem value="por">Portuguese · Português</SelectItem>
                <SelectItem value="hin">Hindi · हिन्दी</SelectItem>
                <SelectItem value="urd">Urdu · اردو</SelectItem>
                <SelectItem value="ara">Arabic · العربية</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between rounded-control border border-border p-4">
            <div>
              <Label className="text-[13px] font-medium">
                Mark page breaks in the output
              </Label>
              <p className="mt-0.5 text-micro text-fg-faint">
                Adds a “----- Page 2 -----” line between pages
              </p>
            </div>
            <Switch
              checked={opts.ocrPageMarkers}
              onCheckedChange={(v) => set("ocrPageMarkers", v)}
            />
          </div>
          <p className="text-[13px] leading-relaxed text-fg-faint">
            OCR runs on this device with Tesseract.js. The first run downloads
            the engine and language pack from a public CDN (about 2–15 MB per
            language); after that it stays browser-cached and also works
            offline. Recognition is never perfect — proofread important text.
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
    <div className="space-y-5">
      <div>
        <Label className="mb-2 block text-[13px] font-medium">Text</Label>
        <Input
          value={opts.wmText}
          onChange={(e) => set("wmText", e.target.value)}
          placeholder="CONFIDENTIAL, DRAFT, company name…"
        />
      </div>

      {preview && (
        <div className="relative mx-auto max-w-sm overflow-hidden rounded-card border border-border shadow-sm">
          <img src={preview} alt="Watermark preview" className="block w-full bg-white" />
          <WatermarkOverlay opts={opts} />
        </div>
      )}

      <TwoCol>
        <div>
          <Label className="mb-2 block text-[13px] font-medium">Layout</Label>
          <Select
            value={opts.wmPosition}
            onValueChange={(v) => set("wmPosition", v as Options["wmPosition"])}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
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
          <Label className="mb-2 block text-[13px] font-medium">Color</Label>
          <div className="flex items-center gap-2.5">
            <input
              type="color"
              value={opts.wmColor}
              onChange={(e) => set("wmColor", e.target.value)}
              className="h-10 w-12 cursor-pointer rounded-control border border-border bg-card p-1"
              aria-label="Watermark color"
            />
            <span className="font-mono text-[13px] text-fg-muted">{opts.wmColor}</span>
          </div>
        </div>
      </TwoCol>

      <div>
        <Label className="mb-2 block text-[13px] font-medium">
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
        <Label className="mb-2 block text-[13px] font-medium">
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
        <Label className="mb-2 block text-[13px] font-medium">
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
      <div className="flex items-center justify-between rounded-control border border-border p-4">
        <Label className="text-[13px] font-medium">Bold text</Label>
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
      <Label className="mb-2 block text-[13px] font-medium">
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
    <div className="space-y-5">
      {preview && (
        <div className="relative mx-auto max-w-sm overflow-hidden rounded-card border border-border shadow-sm">
          <img src={preview} alt="Crop preview" className="block w-full bg-white" />
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background: "rgba(11,15,26,0.55)",
              clipPath: `polygon(0 0, 100% 0, 100% 100%, 0 100%, 0 0, ${opts.cropLeft}% ${opts.cropTop}%, ${opts.cropLeft}% ${100 - opts.cropBottom}%, ${100 - opts.cropRight}% ${100 - opts.cropBottom}%, ${100 - opts.cropRight}% ${opts.cropTop}%, ${opts.cropLeft}% ${opts.cropTop}%)`,
            }}
          />
          <div
            className="pointer-events-none absolute border-2 border-dashed border-ring"
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
      <p className="text-[13px] leading-relaxed text-fg-faint">
        Crop sets the visible page box — it does not delete the cropped
        content from the file. Use Protect afterwards if that matters for you.
      </p>
    </div>
  );
}

/* ---------- metadata editor (reads current info on file add) ---------- */

function MetadataOptions({
  opts,
  set,
  files,
}: {
  opts: Options;
  set: <K extends keyof Options>(k: K, v: Options[K]) => void;
  files: StoreFile[];
}) {
  const [reading, setReading] = useState(false);
  const lastFile = useRef<string>("");

  useEffect(() => {
    const f = files[0]?.file;
    if (!f) {
      lastFile.current = "";
      return;
    }
    const key = `${f.name}:${f.size}`;
    if (key === lastFile.current) return;
    lastFile.current = key;
    let alive = true;
    setReading(true);
    import("@/lib/extra-engine")
      .then((m) => m.readPdfMetadata(f))
      .then((info) => {
        if (!alive) return;
        set("mdTitle", info.title);
        set("mdAuthor", info.author);
        set("mdSubject", info.subject);
        set("mdKeywords", info.keywords);
        set("mdCreator", info.creator);
        set("mdProducer", info.producer);
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setReading(false);
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files]);

  const field = (
    key: "mdTitle" | "mdAuthor" | "mdSubject" | "mdKeywords" | "mdCreator" | "mdProducer",
    label: string,
    placeholder: string
  ) => (
    <div>
      <Label className="mb-2 block text-[13px] font-medium">{label}</Label>
      <Input
        value={opts[key]}
        onChange={(e) => set(key, e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );

  return (
    <div className="space-y-5">
      <p className="rounded-control bg-surface-1 p-4 text-[13px] leading-relaxed text-fg-muted">
        {reading
          ? "Reading this file's current document info…"
          : "Fields start from this file's current info. Edit freely — values apply to every file added, and empty fields are left untouched unless you enable clearing below."}
      </p>
      <TwoCol>
        {field("mdTitle", "Title", "Document title")}
        {field("mdAuthor", "Author", "Author name")}
        {field("mdSubject", "Subject", "What the document is about")}
        {field("mdKeywords", "Keywords", "comma, separated, keywords")}
        {field("mdCreator", "Creator", "Application that authored it")}
        {field("mdProducer", "Producer", "Application that wrote the PDF")}
      </TwoCol>
      <div className="flex items-center justify-between gap-4 rounded-control border border-border p-4">
        <div>
          <Label className="text-[13px] font-medium">
            Clear fields I leave empty
          </Label>
          <p className="mt-0.5 text-micro text-fg-faint">
            Writes an empty value into every untouched field
          </p>
        </div>
        <Switch
          checked={opts.mdClearEmpty}
          onCheckedChange={(v) => set("mdClearEmpty", v)}
        />
      </div>
    </div>
  );
}

/* ---------- QR code generator with live preview ---------- */

function QrOptions({
  opts,
  set,
}: {
  opts: Options;
  set: <K extends keyof Options>(k: K, v: Options[K]) => void;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const [tooLong, setTooLong] = useState(false);

  useEffect(() => {
    const text = opts.qrText.trim();
    if (!text) {
      setPreview(null);
      setTooLong(false);
      return;
    }
    let alive = true;
    import("qrcode")
      .then((m) =>
        m.default.toDataURL(text, {
          errorCorrectionLevel: opts.qrEc,
          width: 256,
          margin: 2,
        })
      )
      .then((url) => {
        if (!alive) return;
        setPreview(url);
        setTooLong(false);
      })
      .catch(() => {
        if (alive) {
          setPreview(null);
          setTooLong(true);
        }
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opts.qrText, opts.qrEc]);

  return (
    <div className="space-y-5">
      <div>
        <Label className="mb-2 block text-[13px] font-medium">
          Content — link, text, anything
        </Label>
        <Textarea
          rows={3}
          value={opts.qrText}
          onChange={(e) => set("qrText", e.target.value)}
          placeholder="https://example.com"
        />
      </div>

      {tooLong && (
        <p className="rounded-control border border-warning/30 bg-warning/10 p-3.5 text-[13px] text-fg-muted">
          This content is too long to fit in a QR code at the selected error
          correction level — shorten it or pick a lower level.
        </p>
      )}

      {preview && (
        <div className="flex justify-center">
          <div className="rounded-card border border-border bg-white p-3 shadow-sm">
            <img src={preview} alt="QR code preview" className="block size-40" />
          </div>
        </div>
      )}

      <TwoCol>
        <div>
          <Label className="mb-2 block text-[13px] font-medium">
            Error correction
          </Label>
          <Select
            value={opts.qrEc}
            onValueChange={(v) => set("qrEc", v as Options["qrEc"])}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="L">Low · holds the most content</SelectItem>
              <SelectItem value="M">Medium · recommended</SelectItem>
              <SelectItem value="Q">Quartile · damage-tolerant</SelectItem>
              <SelectItem value="H">High · best for print</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="mb-2 block text-[13px] font-medium">Page size</Label>
          <Select
            value={opts.qrPageSize}
            onValueChange={(v) => set("qrPageSize", v as Options["qrPageSize"])}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="a4">A4</SelectItem>
              <SelectItem value="letter">US Letter</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </TwoCol>

      <div>
        <Label className="mb-2 block text-[13px] font-medium">
          Render sharpness · {opts.qrSize}px
        </Label>
        <SegButtons
          value={String(opts.qrSize)}
          onChange={(v) => set("qrSize", Number(v))}
          options={[
            { v: "512", label: "512px · screen" },
            { v: "768", label: "768px · print" },
            { v: "1536", label: "1536px · max" },
          ]}
        />
      </div>

      <div>
        <Label className="mb-2 block text-[13px] font-medium">
          Caption (optional)
        </Label>
        <Input
          value={opts.qrCaption}
          onChange={(e) => set("qrCaption", e.target.value)}
          placeholder="Printed under the code — e.g. a label"
        />
      </div>
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
          className={`rounded-control border px-3.5 py-2.5 text-[13px] font-semibold transition-all ${
            value === o.v
              ? "border-ring bg-gradient-brand text-white shadow-glow"
              : "border-border bg-background hover:border-border-strong"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function TwoCol({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">{children}</div>;
}
