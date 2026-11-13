"use client";

/**
 * IdPhotoTool — dedicated one-page UI for the ID Photo tool.
 *
 * Layout (brief): desktop ≥1024px two columns — left ~60% upload/crop
 * preview, right ~40% options card with a sticky primary action; mobile
 * single column in order: title → dropzone/preview → presets →
 * adjustments → print sheet → sticky bottom action bar.
 *
 * Direct manipulation: drag to pan, wheel/pinch to zoom, arrow keys to
 * nudge, zoom slider with a visible % + Reset. No face detection — the
 * face guide is a manual placement aid and says so.
 *
 * Output: two honest download actions (photo JPEG at 300 DPI, print-sheet
 * PDF) run entirely on-device; a live status region reports the file size.
 * Heavy engine code stays in lib/extra-engine.ts, lazy-imported here.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Check,
  CircleAlert,
  Info,
  Printer,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/kit/button";
import { Card } from "@/components/kit/card";
import { Dropzone } from "@/components/kit/dropzone";
import { FileCard } from "@/components/kit/file-card";
import { ShareButton } from "./share-button";
import { RelatedTools } from "./related-tools";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLocaleHref } from "@/lib/i18n-hooks";
import { formatBytes } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  IDP_CUSTOM_KEY,
  IDP_PAPERS,
  IDP_PRESETS,
  idpMmSize,
  idpPx,
  idpSheetGrid,
  type IdpPaper,
} from "@/lib/id-photo-presets";
import type { Options } from "./workspace";

type EngineMod = typeof import("@/lib/extra-engine");

const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v));

/** background swatches — white, the two standard ID-photo blues/grays, custom */
const BG_SWATCHES = [
  { c: "#ffffff", name: "White" },
  { c: "#d7e6f5", name: "Light blue" },
  { c: "#e8eaee", name: "Light gray" },
];

const PAPER_OPTIONS: IdpPaper[] = ["10x15", "4x6", "a4"];
const COPIES_OPTIONS = [0, 1, 2, 3, 4, 6, 8, 9, 12];

export function IdPhotoTool({
  opts,
  set,
  files,
  addFiles,
  removeFile,
}: {
  opts: Options;
  set: <K extends keyof Options>(k: K, v: Options[K]) => void;
  files: { id: string; file: File; name: string; size: number }[];
  addFiles: (files: File[]) => { added: number; rejected: number };
  removeFile: (id: string) => void;
}) {
  const localeHref = useLocaleHref();

  /* ---------- lazy engine (crop math + download builders) ---------- */
  const [eng, setEng] = useState<EngineMod | null>(null);
  useEffect(() => {
    let alive = true;
    import("@/lib/extra-engine").then((m) => {
      if (alive) setEng(m);
    });
    return () => {
      alive = false;
    };
  }, []);

  /* ---------- image loading ---------- */
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [imgState, setImgState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [imgTick, setImgTick] = useState(0);

  useEffect(() => {
    const f = files[0]?.file;
    if (!f || !/^image\//.test(f.type)) {
      imgRef.current = null;
      setImgState("idle");
      setImgTick((t) => t + 1);
      return;
    }
    setImgState("loading");
    const url = URL.createObjectURL(f);
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      setImgState("ready");
      setImgTick((t) => t + 1);
    };
    img.onerror = () => setImgState("error");
    img.src = url;
    return () => URL.revokeObjectURL(url);
  }, [files]);

  const hasImg = imgState === "ready";

  /* ---------- resolved size ---------- */
  const dims = useMemo(
    () => idpMmSize(opts.idPreset, opts.idCustomW, opts.idCustomH, opts.idUnit),
    [opts.idPreset, opts.idCustomW, opts.idCustomH, opts.idUnit]
  );
  const pxW = idpPx(dims.w);
  const pxH = idpPx(dims.h);
  const paper = IDP_PAPERS[opts.idPaper];

  /* ---------- live preview canvas ---------- */
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img || !eng) return;
    const W = 480;
    const cw = W;
    const ch = Math.round((W * dims.h) / dims.w);
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = opts.idBg || "#ffffff";
    ctx.fillRect(0, 0, cw, ch);
    const r = eng.idPhotoCropRect(
      img.naturalWidth,
      img.naturalHeight,
      cw,
      ch,
      opts.idZoom,
      opts.idOffsetX,
      opts.idOffsetY
    );
    ctx.drawImage(img, r.dx, r.dy, r.dw, r.dh);
  }, [
    eng,
    imgTick,
    dims.w,
    dims.h,
    opts.idZoom,
    opts.idOffsetX,
    opts.idOffsetY,
    opts.idBg,
  ]);

  /* ---------- direct manipulation: drag / pinch / wheel / keys ---------- */
  const ptrs = useRef(new Map<number, { x: number; y: number }>());
  const panBase = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const pinchBase = useRef<{ dist: number; zoom: number } | null>(null);

  const panDelta = useCallback(
    (dxPx: number, dyPx: number) => {
      const img = imgRef.current;
      const canvas = canvasRef.current;
      if (!img || !eng || !canvas) return null;
      const cw = canvas.width;
      const ch = canvas.height;
      const r = eng.idPhotoCropRect(
        img.naturalWidth,
        img.naturalHeight,
        cw,
        ch,
        opts.idZoom,
        0,
        0
      );
      const maxX = Math.max(0, (r.dw - cw) / 2);
      const maxY = Math.max(0, (r.dh - ch) / 2);
      const scale = (canvas.clientWidth || cw) / cw;
      return {
        dx: maxX > 0 ? dxPx / (2 * maxX * scale) : 0,
        dy: maxY > 0 ? dyPx / (2 * maxY * scale) : 0,
      };
    },
    [eng, opts.idZoom]
  );

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!hasImg) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptrs.current.size === 1) {
      panBase.current = {
        x: e.clientX,
        y: e.clientY,
        ox: opts.idOffsetX,
        oy: opts.idOffsetY,
      };
    } else if (ptrs.current.size === 2) {
      panBase.current = null;
      const [a, b] = [...ptrs.current.values()];
      pinchBase.current = {
        dist: Math.hypot(a.x - b.x, a.y - b.y) || 1,
        zoom: opts.idZoom,
      };
    }
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!ptrs.current.has(e.pointerId)) return;
    ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptrs.current.size === 2 && pinchBase.current) {
      const [a, b] = [...ptrs.current.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      set("idZoom", clamp(pinchBase.current.zoom * (d / pinchBase.current.dist), 1, 3));
      return;
    }
    if (panBase.current) {
      const dx = e.clientX - panBase.current.x;
      const dy = e.clientY - panBase.current.y;
      const f = panDelta(dx, dy);
      if (f) {
        set("idOffsetX", clamp(panBase.current.ox + f.dx, -1, 1));
        set("idOffsetY", clamp(panBase.current.oy + f.dy, -1, 1));
      }
    }
  };

  const endPointer = (e: React.PointerEvent<HTMLDivElement>) => {
    ptrs.current.delete(e.pointerId);
    if (ptrs.current.size < 2) pinchBase.current = null;
    if (ptrs.current.size === 0) panBase.current = null;
  };

  /* wheel zoom — non-passive so the page doesn't scroll while zooming */
  useEffect(() => {
    const el = stageRef.current;
    if (!el || !hasImg) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const z = clamp(opts.idZoom * Math.exp(-e.deltaY * 0.0015), 1, 3);
      set("idZoom", Math.round(z * 100) / 100);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [hasImg, opts.idZoom, set]);

  const onStageKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!hasImg) return;
    const step = e.shiftKey ? 0.1 : 0.02;
    switch (e.key) {
      case "ArrowLeft":
        set("idOffsetX", clamp(opts.idOffsetX - step, -1, 1));
        break;
      case "ArrowRight":
        set("idOffsetX", clamp(opts.idOffsetX + step, -1, 1));
        break;
      case "ArrowUp":
        set("idOffsetY", clamp(opts.idOffsetY - step, -1, 1));
        break;
      case "ArrowDown":
        set("idOffsetY", clamp(opts.idOffsetY + step, -1, 1));
        break;
      case "+":
      case "=":
        set("idZoom", clamp(Math.round((opts.idZoom + 0.05) * 100) / 100, 1, 3));
        break;
      case "-":
      case "_":
        set("idZoom", clamp(Math.round((opts.idZoom - 0.05) * 100) / 100, 1, 3));
        break;
      default:
        return;
    }
    e.preventDefault();
  };

  const resetAdjustments = () => {
    set("idZoom", 1);
    set("idOffsetX", 0);
    set("idOffsetY", 0);
  };

  /* ---------- print-sheet mini preview (pure mm math) ---------- */
  const grid = idpSheetGrid(dims.w, dims.h, paper.w, paper.h, 3);
  const wantCopies = opts.idCopies > 0 ? opts.idCopies : 0;
  const maxCopies = grid.cols * grid.rows;
  const shownCopies = wantCopies > 0 ? Math.min(wantCopies, maxCopies) : maxCopies;
  const shownRows =
    wantCopies > 0 ? Math.ceil(shownCopies / grid.cols) : grid.rows;

  /* ---------- downloads + honest status ---------- */
  const [busy, setBusy] = useState<"photo" | "sheet" | null>(null);
  const [status, setStatus] = useState<
    { ok: boolean; msg: string } | null
  >(null);

  useEffect(() => {
    if (!status) return;
    const t = setTimeout(() => setStatus(null), 8000);
    return () => clearTimeout(t);
  }, [status]);

  const triggerDownload = (blob: Blob, name: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  };

  const baseName = (n: string) => n.replace(/\.[^.]+$/, "");

  const downloadPhoto = async () => {
    const f = files[0]?.file;
    if (!f || !hasImg || busy) return;
    setBusy("photo");
    setStatus(null);
    try {
      const m = eng ?? (await import("@/lib/extra-engine"));
      const blob = await m.idPhotoPhotoBlob(
        f,
        dims.w,
        dims.h,
        opts.idZoom,
        opts.idOffsetX,
        opts.idOffsetY,
        opts.idBg
      );
      triggerDownload(
        blob,
        `${baseName(files[0].name)}-id-${dims.w}x${dims.h}mm-300dpi.jpg`
      );
      setStatus({
        ok: true,
        msg: `Photo downloaded — ${pxW} × ${pxH} px · ${formatBytes(blob.size)} · nothing was uploaded.`,
      });
    } catch (err) {
      setStatus({
        ok: false,
        msg:
          err instanceof Error
            ? `Could not render the photo: ${err.message}`
            : "Could not render the photo.",
      });
    } finally {
      setBusy(null);
    }
  };

  const downloadSheet = async () => {
    const f = files[0]?.file;
    if (!f || !hasImg || busy) return;
    setBusy("sheet");
    setStatus(null);
    try {
      const m = eng ?? (await import("@/lib/extra-engine"));
      const blob = await m.idPhotoSheetBlob(f, {
        wmm: dims.w,
        hmm: dims.h,
        zoom: opts.idZoom,
        offsetX: opts.idOffsetX,
        offsetY: opts.idOffsetY,
        bg: opts.idBg,
        paper: opts.idPaper,
        copies: opts.idCopies,
        cutGuides: opts.idCutGuides,
      });
      triggerDownload(
        blob,
        `${baseName(files[0].name)}-sheet-${opts.idPaper}.pdf`
      );
      setStatus({
        ok: true,
        msg: `Print sheet downloaded — ${shownCopies} ${shownCopies === 1 ? "copy" : "copies"} on ${paper.label} · ${formatBytes(blob.size)} · print at 100% scale.`,
      });
    } catch (err) {
      setStatus({
        ok: false,
        msg:
          err instanceof Error
            ? `Could not build the sheet: ${err.message}`
            : "Could not build the sheet.",
      });
    } finally {
      setBusy(null);
    }
  };

  /* ---------- replace photo ---------- */
  const replaceRef = useRef<HTMLInputElement>(null);

  /* ---------- shared class names ---------- */
  const tileCls = (selected: boolean) =>
    cn(
      "min-h-11 rounded-[12px] border px-3 py-2 text-left outline-none transition-all",
      "focus-visible:ring-2 focus-visible:ring-ring",
      selected
        ? "border-primary/60 bg-primary/10 shadow-xs"
        : "border-border bg-background hover:border-border-strong hover:bg-surface-1"
    );

  const swatchCls = (selected: boolean) =>
    cn(
      "size-11 rounded-full border transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring",
      selected
        ? "border-primary ring-2 ring-primary/40"
        : "border-border hover:border-border-strong"
    );

  return (
    <section
      className="idp mx-auto w-full max-w-[1120px] px-4 pb-10 pt-6 sm:px-6"
      aria-labelledby="idp-title"
    >
      {/* breadcrumb — Tools › ID Photo */}
      <nav aria-label="Breadcrumb" className="mb-4">
        <ol className="flex items-center gap-1 text-[13px] text-fg-muted">
          <li>
            <Link
              href={localeHref("/")}
              className="inline-flex min-h-11 items-center pr-2 text-fg-muted transition-colors hover:text-foreground hover:underline hover:underline-offset-4 focus-visible:ring-2 focus-visible:ring-ring rounded"
            >
              Tools
            </Link>
          </li>
          <li aria-hidden="true" className="text-fg-faint">
            /
          </li>
          <li
            aria-current="page"
            className="inline-flex min-h-11 items-center font-semibold text-foreground"
          >
            ID Photo
          </li>
        </ol>
      </nav>

      {/* page header — one left edge: breadcrumb, title, intro, cards */}
      <div className="mb-8 flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <h1 id="idp-title" className="idp-h1 tracking-heading">
            ID Photo
          </h1>
          <p className="idp-body mt-3 max-w-[65ch] text-fg-muted">
            Crop a photo to standard ID sizes at 300 DPI and lay out a print
            sheet — ready to print at home. You align the crop yourself;
            there is no face detection and nothing leaves this device.
          </p>
        </div>
        <div className="hidden shrink-0 sm:block">
          <ShareButton
            title="ID Photo"
            url={typeof window !== "undefined" ? window.location.href : ""}
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        {/* ---------- left: upload / crop preview (~60%) ---------- */}
        <Card className="p-[var(--idp-card-pad)]">
          {!hasImg ? (
            <div className="space-y-4">
              <Dropzone
                accept="image/*"
                multiple={false}
                onFiles={(list) => {
                  if (list.length) addFiles(list.slice(0, 1));
                }}
                title="Drop a photo or click to browse"
                subtitle="JPG, PNG, WebP — one image"
                hint={
                  <span className="tabular-nums">
                    Output at 300 DPI · nothing leaves your device
                  </span>
                }
              />
              {imgState === "error" && (
                <p className="idp-help rounded-[12px] border border-warning/30 bg-warning/10 p-3.5 text-fg-muted">
                  This image could not be previewed — it may be an unsupported
                  format. Try a JPG, PNG or WebP.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <p className="idp-label text-fg-muted">Crop preview</p>

              {/* interactive stage */}
              <div className="relative mx-auto w-full max-w-[440px]">
                <div
                  ref={stageRef}
                  tabIndex={0}
                  role="img"
                  aria-label={`Crop preview, ${dims.w} × ${dims.h} mm. Drag the photo or use the arrow keys to reposition it, scroll or pinch to zoom between 100% and 300%.`}
                  onPointerDown={onPointerDown}
                  onPointerMove={onPointerMove}
                  onPointerUp={endPointer}
                  onPointerCancel={endPointer}
                  onKeyDown={onStageKeyDown}
                  className="block touch-none select-none overflow-hidden rounded-[12px] border border-border bg-surface-1 outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <canvas
                    ref={canvasRef}
                    className="block h-auto w-full cursor-grab active:cursor-grabbing"
                    aria-hidden="true"
                  />
                  {/* face guide overlay — manual placement aid */}
                  {opts.idGuide && (
                    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
                      <div className="absolute inset-y-0 left-1/2 w-0 -translate-x-1/2 border-l border-dashed border-white/70" />
                      <div className="absolute inset-x-0 top-[9%] h-[60%] border border-dashed border-white/70">
                        <span className="absolute -top-px left-1 rounded-b bg-black/55 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                          head zone
                        </span>
                      </div>
                      <div className="absolute inset-x-0 top-[36%] h-[10%] border-y-2 border-white/90">
                        <span className="absolute -bottom-px right-1 rounded-t bg-black/55 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                          eye line
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* zoom row — visible %, reset */}
              <div className="flex min-h-11 items-center gap-3">
                <label
                  htmlFor="idp-zoom"
                  className="idp-label shrink-0 text-fg-muted"
                >
                  Zoom
                </label>
                <Slider
                  id="idp-zoom"
                  min={1}
                  max={3}
                  step={0.05}
                  value={[opts.idZoom]}
                  onValueChange={([v]) => set("idZoom", v)}
                  aria-valuetext={`${Math.round(opts.idZoom * 100)}%`}
                  className="flex-1 [&_[data-slot=slider-thumb]]:size-6"
                />
                <span className="w-12 shrink-0 text-right text-sm font-semibold tabular-nums">
                  {Math.round(opts.idZoom * 100)}%
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={resetAdjustments}
                  className="min-h-11 shrink-0"
                >
                  <RotateCcw aria-hidden="true" />
                  Reset
                </Button>
              </div>

              <p className="idp-help text-fg-muted">
                Drag the photo to move it · scroll or pinch to zoom · arrow
                keys nudge (Shift = bigger steps) · <kbd className="rounded border border-border bg-surface-3 px-1 font-mono text-[11px]">+</kbd>/
                <kbd className="rounded border border-border bg-surface-3 px-1 font-mono text-[11px]">−</kbd>{" "}
                zoom
              </p>

              {/* face-guide toggle */}
              <div className="flex min-h-11 items-center justify-between gap-3 rounded-[12px] border border-border px-3.5 py-2">
                <label
                  htmlFor="idp-guide"
                  className="idp-label text-fg-muted cursor-pointer"
                >
                  Face guide overlay
                </label>
                <Switch
                  id="idp-guide"
                  checked={opts.idGuide}
                  onCheckedChange={(v) => set("idGuide", v)}
                  className="h-6 w-11 [&_[data-slot=switch-thumb]]:size-5"
                />
              </div>
              <p className="idp-help -mt-2 text-fg-muted">
                Shows the head-height zone, eye line and centerline. Placement
                is manual — there is no face detection.
              </p>

              {/* file meta + replace/remove */}
              <div className="space-y-2 pt-1">
                {files.map((f) => (
                  <FileCard
                    key={f.id}
                    name={f.name}
                    size={f.size}
                    onRemove={() => removeFile(f.id)}
                  />
                ))}
                <input
                  ref={replaceRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const list = Array.from(e.target.files || []);
                    if (list.length) addFiles(list.slice(0, 1));
                    e.target.value = "";
                  }}
                />
                <button
                  onClick={() => replaceRef.current?.click()}
                  className="min-h-11 w-full rounded-[12px] border border-dashed border-border-strong px-3 text-[13px] font-medium text-fg-muted outline-none transition-colors hover:border-ring hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Replace photo
                </button>
              </div>
            </div>
          )}
        </Card>

        {/* ---------- right: options (~40%) ---------- */}
        <div className="flex min-w-0 flex-col gap-6">
          <Card className="p-[var(--idp-card-pad)]">
            {!hasImg && (
              <p
                className="idp-help mb-4 rounded-[12px] border border-border bg-surface-1 px-3.5 py-3 text-fg-muted"
                role="status"
              >
                Add a photo to unlock these options — everything below stays
                on this device.
              </p>
            )}
            <div
              inert={!hasImg}
              className={cn(
                "space-y-6",
                !hasImg && "pointer-events-none opacity-55 select-none"
              )}
            >
              {/* presets */}
              <fieldset>
                <legend className="idp-label mb-3 text-foreground">
                  Size preset
                </legend>
                <div className="grid grid-cols-2 gap-2">
                  {IDP_PRESETS.map((p) => {
                    const selected = opts.idPreset === p.key;
                    return (
                      <button
                        key={p.key}
                        onClick={() => set("idPreset", p.key)}
                        aria-pressed={selected}
                        className={tileCls(selected)}
                      >
                        <span
                          className={cn(
                            "idp-label block",
                            selected ? "text-primary" : "text-foreground"
                          )}
                        >
                          {p.name}
                        </span>
                        <span className="mt-0.5 block whitespace-nowrap text-[13px] text-fg-muted tabular-nums">
                          {p.w}×{p.h} mm · {idpPx(p.w)}×{idpPx(p.h)} px
                        </span>
                      </button>
                    );
                  })}
                  <button
                    onClick={() => set("idPreset", IDP_CUSTOM_KEY)}
                    aria-pressed={opts.idPreset === IDP_CUSTOM_KEY}
                    className={cn(
                      tileCls(opts.idPreset === IDP_CUSTOM_KEY),
                      "col-span-2"
                    )}
                  >
                    <span
                      className={cn(
                        "idp-label block",
                        opts.idPreset === IDP_CUSTOM_KEY
                          ? "text-primary"
                          : "text-foreground"
                      )}
                    >
                      Custom size
                    </span>
                    <span className="mt-0.5 block text-[13px] text-fg-muted">
                      any width × height, mm or inches
                    </span>
                  </button>
                </div>

                {opts.idPreset === IDP_CUSTOM_KEY && (
                  <div className="mt-3 rounded-[12px] border border-border p-3.5">
                    <div className="flex items-end gap-2.5">
                      <div className="min-w-0 flex-1">
                        <label
                          htmlFor="idp-cw"
                          className="idp-label mb-1.5 block text-fg-muted"
                        >
                          Width
                        </label>
                        <Input
                          id="idp-cw"
                          type="number"
                          min={opts.idUnit === "mm" ? 15 : 0.6}
                          max={opts.idUnit === "mm" ? 210 : 8.3}
                          step={opts.idUnit === "mm" ? 1 : 0.1}
                          value={opts.idCustomW}
                          onChange={(e) =>
                            set("idCustomW", Number(e.target.value) || 0)
                          }
                          className="h-11 tabular-nums"
                          inputMode="decimal"
                        />
                      </div>
                      <span className="pb-3 text-fg-muted">×</span>
                      <div className="min-w-0 flex-1">
                        <label
                          htmlFor="idp-ch"
                          className="idp-label mb-1.5 block text-fg-muted"
                        >
                          Height
                        </label>
                        <Input
                          id="idp-ch"
                          type="number"
                          min={opts.idUnit === "mm" ? 15 : 0.6}
                          max={opts.idUnit === "mm" ? 210 : 8.3}
                          step={opts.idUnit === "mm" ? 1 : 0.1}
                          value={opts.idCustomH}
                          onChange={(e) =>
                            set("idCustomH", Number(e.target.value) || 0)
                          }
                          className="h-11 tabular-nums"
                          inputMode="decimal"
                        />
                      </div>
                      <div
                        role="group"
                        aria-label="Unit"
                        className="flex shrink-0 gap-1 rounded-[10px] border border-border p-1"
                      >
                        {(["mm", "in"] as const).map((u) => (
                          <button
                            key={u}
                            onClick={() => {
                              if (opts.idUnit === u) return;
                              const k = u === "in" ? 1 / 25.4 : 25.4;
                              set("idCustomW", Math.round(opts.idCustomW * k * 100) / 100);
                              set("idCustomH", Math.round(opts.idCustomH * k * 100) / 100);
                              set("idUnit", u);
                            }}
                            aria-pressed={opts.idUnit === u}
                            className={cn(
                              "min-h-9 rounded-[8px] px-2.5 text-[13px] font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                              opts.idUnit === u
                                ? "bg-primary/10 text-primary"
                                : "text-fg-muted hover:text-foreground"
                            )}
                          >
                            {u}
                          </button>
                        ))}
                      </div>
                    </div>
                    <p className="idp-help mt-2.5 text-fg-muted tabular-nums">
                      Output {pxW} × {pxH} px at 300 DPI (15–210 mm allowed)
                    </p>
                  </div>
                )}
              </fieldset>

              {/* background colour */}
              <fieldset>
                <legend className="idp-label mb-3 text-foreground">
                  Background colour
                </legend>
                <div className="flex flex-wrap items-center gap-2.5">
                  {BG_SWATCHES.map((s) => (
                    <button
                      key={s.c}
                      onClick={() => set("idBg", s.c)}
                      aria-pressed={opts.idBg.toLowerCase() === s.c}
                      title={s.name}
                      aria-label={`Background ${s.name}`}
                      className={swatchCls(opts.idBg.toLowerCase() === s.c)}
                      style={{ backgroundColor: s.c }}
                    />
                  ))}
                  <label
                    className="flex min-h-11 cursor-pointer items-center gap-2 rounded-[12px] border border-border px-3 text-[13px] font-medium text-fg-muted outline-none transition-colors hover:border-border-strong focus-within:ring-2 focus-within:ring-ring"
                    title="Custom background colour"
                  >
                    Custom
                    <input
                      type="color"
                      value={opts.idBg}
                      onChange={(e) => set("idBg", e.target.value)}
                      className="size-9 cursor-pointer rounded border border-border bg-transparent p-0"
                      aria-label="Custom background colour"
                    />
                  </label>
                </div>
                <p className="idp-help mt-2.5 text-fg-muted">
                  Painted behind transparent areas (PNG with alpha). Existing
                  backgrounds in JPG photos are kept — background removal
                  isn&apos;t supported on-device.
                </p>
              </fieldset>

              {/* print sheet */}
              <fieldset>
                <legend className="idp-label mb-3 text-foreground">
                  Print sheet
                </legend>
                <div className="flex min-h-11 items-center justify-between gap-3 rounded-[12px] border border-border px-3.5 py-2">
                  <label
                    htmlFor="idp-sheet"
                    className="idp-label cursor-pointer text-fg-muted"
                  >
                    Add print sheet
                  </label>
                  <Switch
                    id="idp-sheet"
                    checked={opts.idSheet}
                    onCheckedChange={(v) => set("idSheet", v)}
                    className="h-6 w-11"
                  />
                </div>

                {opts.idSheet && (
                  <div className="mt-3 space-y-3.5 rounded-[12px] border border-border p-3.5">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <label
                          htmlFor="idp-paper"
                          className="idp-label mb-1.5 block text-fg-muted"
                        >
                          Paper
                        </label>
                        <Select
                          value={opts.idPaper}
                          onValueChange={(v) => set("idPaper", v as IdpPaper)}
                        >
                          <SelectTrigger
                            id="idp-paper"
                            className="h-11 w-full data-[size=default]:h-11"
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PAPER_OPTIONS.map((k) => (
                              <SelectItem key={k} value={k}>
                                {IDP_PAPERS[k].label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label
                          htmlFor="idp-copies"
                          className="idp-label mb-1.5 block text-fg-muted"
                        >
                          Copies
                        </label>
                        <Select
                          value={String(opts.idCopies)}
                          onValueChange={(v) => set("idCopies", Number(v))}
                        >
                          <SelectTrigger
                            id="idp-copies"
                            className="h-11 w-full data-[size=default]:h-11"
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {COPIES_OPTIONS.map((n) => (
                              <SelectItem key={n} value={String(n)}>
                                {n === 0
                                  ? `As many as fit (${maxCopies})`
                                  : `${n} ${n === 1 ? "copy" : "copies"}`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex min-h-11 items-center justify-between gap-3 rounded-[10px] border border-border px-3 py-2">
                      <label
                        htmlFor="idp-guides"
                        className="idp-label cursor-pointer text-fg-muted"
                      >
                        Cut guides
                      </label>
                      <Switch
                        id="idp-guides"
                        checked={opts.idCutGuides}
                        onCheckedChange={(v) => set("idCutGuides", v)}
                        className="h-6 w-11"
                      />
                    </div>

                    {/* live mini-preview of the sheet layout */}
                    <div>
                      <p className="idp-label mb-2 text-fg-muted">
                        Sheet layout
                      </p>
                      <div className="rounded-[10px] border border-border bg-surface-1 p-4">
                        <div
                          className="mx-auto w-full max-w-[200px]"
                          style={{ aspectRatio: `${paper.w} / ${paper.h}` }}
                        >
                          <div className="relative h-full w-full rounded-[4px] border border-border-strong bg-white">
                            {Array.from({ length: shownCopies }).map((_, i) => {
                              const { cols, gap } = grid;
                              const r = Math.floor(i / cols);
                              const c = i % cols;
                              const gw = cols * dims.w + (cols - 1) * gap;
                              const gh =
                                shownRows * dims.h + (shownRows - 1) * gap;
                              const xPct =
                                (((paper.w - gw) / 2 + c * (dims.w + gap)) /
                                  paper.w) *
                                100;
                              const yPct =
                                (((paper.h - gh) / 2 + r * (dims.h + gap)) /
                                  paper.h) *
                                100;
                              const wPct = (dims.w / paper.w) * 100;
                              const hPct = (dims.h / paper.h) * 100;
                              return (
                                <div
                                  key={i}
                                  className={cn(
                                    "absolute",
                                    opts.idCutGuides
                                      ? "border border-dashed border-slate-400"
                                      : "bg-primary/15"
                                  )}
                                  style={{
                                    left: `${xPct}%`,
                                    top: `${yPct}%`,
                                    width: `${wPct}%`,
                                    height: `${hPct}%`,
                                  }}
                                />
                              );
                            })}
                          </div>
                        </div>
                        <p className="idp-help mt-2.5 text-center text-fg-muted tabular-nums">
                          {shownCopies} {shownCopies === 1 ? "copy" : "copies"}{" "}
                          on {paper.label}
                          {opts.idCutGuides ? " · cut guides" : ""}
                          {wantCopies > maxCopies
                            ? ` · capped at ${maxCopies} (paper limit)`
                            : ""}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </fieldset>

              {/* print callout */}
              <div className="flex gap-3 rounded-[12px] border border-border bg-surface-1 px-3.5 py-3">
                <Info className="idp-help mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                <p className="idp-help text-fg-muted">
                  Print at <b className="text-foreground">100% scale</b> —
                  choose “Actual size” in the print dialog so the photo comes
                  out at exactly {dims.w} × {dims.h} mm.
                </p>
              </div>
            </div>
          </Card>

          {/* ---------- actions: sticky bottom bar (mobile) / floating dock (desktop) ---------- */}
          <div className="sticky bottom-0 -mx-4 mt-1 border-t border-border-subtle bg-background/90 px-4 py-4 backdrop-blur-lg sm:-mx-6 sm:px-6 lg:mx-0 lg:mt-0 lg:rounded-[16px] lg:border lg:border-border lg:bg-surface-2/95 lg:px-4 lg:shadow-md lg:backdrop-blur-md">
            <div aria-live="polite">
              {status && (
                <p
                  role="status"
                  className={cn(
                    "idp-help mb-3 flex items-start gap-2 rounded-[12px] border px-3.5 py-3",
                    status.ok
                      ? "border-success/25 bg-success/[0.07] text-fg-muted"
                      : "border-destructive/30 bg-destructive/10 text-fg-muted"
                  )}
                >
                  {status.ok ? (
                    <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
                  ) : (
                    <CircleAlert className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
                  )}
                  {status.msg}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                onClick={downloadPhoto}
                disabled={!hasImg || busy !== null}
                loading={busy === "photo"}
                size="lg"
                className="h-12 min-h-11 flex-1 text-[15px]"
              >
                Download photo
              </Button>
              <Button
                onClick={downloadSheet}
                disabled={!hasImg || busy !== null || !opts.idSheet}
                loading={busy === "sheet"}
                variant="secondary"
                size="lg"
                className="h-12 min-h-11 flex-1 text-[15px]"
                title={
                  opts.idSheet
                    ? undefined
                    : "Turn on the print sheet above to download it"
                }
              >
                <Printer aria-hidden="true" />
                Download print sheet
              </Button>
            </div>
            {!hasImg && (
              <p className="idp-help mt-2 text-center text-fg-muted">
                Add a photo first — downloads stay disabled until then.
              </p>
            )}
          </div>
        </div>
      </div>

      <p className="mt-10 hidden justify-center text-micro text-fg-faint lg:flex">
        Works offline · No watermark added by us · Free forever
      </p>

      <RelatedTools toolId="id-photo" />
    </section>
  );
}
