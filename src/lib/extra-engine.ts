/**
 * SwiftPDF Extra Engine — the Tier-1 tool additions (edit, sign, redact,
 * target-size compression, image tools, PDF→PNG, extraction, text→PDF).
 *
 * Same contract as pdf-engine.ts: pure File→Blob, 100% client-side,
 * heavy libraries lazy-loaded. This module does NOT modify pdf-engine.ts;
 * it mirrors its helpers locally.
 */

import type { EngineResult, RunCallbacks } from "./pdf-engine";
import { IDP_PRESETS, IDP_PAPERS, idpSheetGrid } from "./id-photo-presets";

export type { EngineResult, RunCallbacks };

const tick = () => new Promise((r) => setTimeout(r, 0));

/* ---------- lazy loaders (local copies — pdf-engine.ts untouched) ---------- */

async function getPdfjs() {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  return pdfjs;
}

async function getPdfLib() {
  return await import("pdf-lib");
}

async function fileToBytes(file: File): Promise<Uint8Array> {
  const buf = await file.arrayBuffer();
  return new Uint8Array(buf);
}

async function renderPageToCanvas(
  doc: any,
  pageNum: number,
  scale: number
): Promise<HTMLCanvasElement> {
  const page = await doc.getPage(pageNum);
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.floor(viewport.width));
  canvas.height = Math.max(1, Math.floor(viewport.height));
  const ctx = canvas.getContext("2d")!;
  await page.render({ canvasContext: ctx, viewport } as any).promise;
  return canvas;
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality?: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Canvas export failed"))),
      type,
      quality
    );
  });
}

async function openWithPdfjs(bytes: Uint8Array, password?: string) {
  const pdfjs = await getPdfjs();
  return await pdfjs.getDocument({ data: bytes.slice(), password }).promise;
}

/** open with a friendly error for password-protected files */
async function tryOpenWithPdfjs(bytes: Uint8Array, label: string) {
  try {
    return await openWithPdfjs(bytes);
  } catch (err: any) {
    const msg = String(err?.message ?? err);
    if (/password/i.test(msg)) {
      throw new Error(
        `"${label}" is password-protected. Unlock it first, then try again.`
      );
    }
    throw new Error(`"${label}" could not be read as a PDF`);
  }
}

async function loadWithPdfLib(bytes: Uint8Array) {
  const { PDFDocument } = await getPdfLib();
  return PDFDocument.load(bytes, { ignoreEncryption: true });
}

function padNum(n: number, width: number): string {
  return String(n).padStart(width, "0");
}

/** pdf-lib save output → Blob (TS-safe ArrayBuffer view) */
function pdfBlob(bytes: Uint8Array, type = "application/pdf"): Blob {
  return new Blob([bytes.slice().buffer as ArrayBuffer], { type });
}

function baseName(name: string, extraExt?: string): string {
  return name.replace(/\.[a-z0-9]+$/i, "") + (extraExt ?? "");
}

function hexToRgb01(hex: string): [number, number, number] {
  const m = hex.replace("#", "");
  const r = parseInt(m.slice(0, 2), 16) / 255;
  const g = parseInt(m.slice(2, 4), 16) / 255;
  const b = parseInt(m.slice(4, 6), 16) / 255;
  return [r, g, b];
}

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const b64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/* ================================================================
   1) COMPRESS PDF TO TARGET SIZE
   ================================================================ */

export interface CompressTargetOptions {
  targetKB: number;
}

/** raster ladder: [scale, jpegQuality] — tried in order until target met */
const RASTER_LADDER: [number, number][] = [
  [2.0, 0.85],
  [1.6, 0.78],
  [1.3, 0.72],
  [1.1, 0.66],
  [0.9, 0.62],
  [0.75, 0.55],
  [0.6, 0.5],
  [0.5, 0.42],
];

async function runCompressTarget(
  entries: { id: string; file: File }[],
  opts: CompressTargetOptions,
  cb: RunCallbacks
): Promise<EngineResult> {
  const targetKB = Math.max(10, Math.round(opts.targetKB || 0));
  const target = targetKB * 1024;
  const { id, file } = entries[0];
  const bytes = await fileToBytes(file);

  cb.onStatus?.(`Optimizing ${file.name}`);

  // Already under target? Save the file as-is (honest, no fake shrink).
  if (file.size <= target) {
    cb.onFileProgress?.(id, 1);
    cb.onOverall?.(1);
    return {
      files: [
        { name: file.name, blob: file, size: file.size, kind: "PDF" },
      ],
      note: "Already under the target size — saved unchanged",
    };
  }

  // Attempt 0 — lossless structural re-save (keeps text sharp)
  let bestBytes: Uint8Array | null = null;
  let bestSize = Infinity;
  let bestNote = "";
  try {
    const docA = await loadWithPdfLib(bytes);
    const saved = await docA.save({ useObjectStreams: true });
    if (saved.length < bestSize) {
      bestSize = saved.length;
      bestBytes = saved;
      bestNote = "Lossless re-save";
    }
    if (saved.length <= target) {
      const blob = pdfBlob(saved);
      cb.onFileProgress?.(id, 1);
      cb.onOverall?.(1);
      return {
        files: [
          {
            name: `${baseName(file.name)}-${targetKB}kb.pdf`,
            blob,
            size: blob.size,
            kind: "PDF",
          },
        ],
        note: `Lossless re-save reached the target — ${(saved.length / 1024).toFixed(0)} KB`,
      };
    }
  } catch {
    /* fall through to raster */
  }

  // Raster ladder — pages become images (disclosed in UI + result note)
  const doc = await tryOpenWithPdfjs(bytes, file.name);
  const { PDFDocument } = await getPdfLib();
  const n = doc.numPages;

  for (let li = 0; li < RASTER_LADDER.length; li++) {
    const [scale, quality] = RASTER_LADDER[li];
    const out = await PDFDocument.create();
    for (let p = 1; p <= n; p++) {
      const canvas = await renderPageToCanvas(doc, p, scale);
      const jpg = await canvasToBlob(canvas, "image/jpeg", quality);
      const img = await out.embedJpg(new Uint8Array(await jpg.arrayBuffer()));
      const page = out.addPage([img.width, img.height]);
      page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
      cb.onFileProgress?.(
        id,
        (li + p / n) / (RASTER_LADDER.length + 1)
      );
      await tick();
    }
    const saved = await out.save({ useObjectStreams: true });
    if (saved.length < bestSize) {
      bestSize = saved.length;
      bestBytes = saved;
      bestNote = `Raster re-encode at ${scale}× / ${Math.round(quality * 100)}%`;
    }
    cb.onOverall?.((li + 1) / RASTER_LADDER.length);
    if (saved.length <= target) break;
    await tick();
  }

  if (!bestBytes) throw new Error(`"${file.name}" could not be compressed`);

  const blob = pdfBlob(bestBytes);
  const kb = Math.round(bestSize / 1024);
  cb.onFileProgress?.(id, 1);
  cb.onOverall?.(1);
  return {
    files: [
      {
        name: `${baseName(file.name)}-${targetKB}kb.pdf`,
        blob,
        size: blob.size,
        kind: "PDF",
      },
    ],
    note:
      bestSize <= target
        ? `Reached ${kb} KB (target ${targetKB} KB) via ${bestNote}. Pages are images now — text is no longer selectable.`
        : `Closest possible: ${kb} KB — the ${targetKB} KB target is too aggressive for this document. Try a higher target or the regular Compress tool. (${bestNote})`,
  };
}

/* ================================================================
   2) IMAGE TOOLS — compress / resize / convert (shared decode+encode)
   ================================================================ */

/** decode guard — beyond this, canvas ops realistically fail */
const MAX_PIXELS = 80_000_000; // 80 MP

async function decodeImage(file: File): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error(
      `"${file.name}" could not be decoded in this browser (unsupported or corrupt image)`
    );
  }
}

function assertPixels(w: number, h: number, name: string) {
  if (w * h > MAX_PIXELS) {
    throw new Error(
      `"${name}" is ${Math.round((w * h) / 1e6)} MP — too large to process reliably in this browser. Use a smaller image.`
    );
  }
}

type ImgFormat = "jpeg" | "png" | "webp";
type SrcFormat = ImgFormat | "gif" | "bmp";

const FORMAT_EXT: Record<ImgFormat, string> = {
  jpeg: "jpg",
  png: "png",
  webp: "webp",
};

function sourceFormat(file: File): SrcFormat {
  const t = file.type;
  if (t === "image/png") return "png";
  if (t === "image/webp") return "webp";
  if (t === "image/gif") return "gif";
  if (t === "image/bmp") return "bmp";
  return "jpeg"; // jpeg, avif, etc. → safest map
}

function pickTargetDims(
  w: number,
  h: number,
  mode: "width" | "height" | "percent" | "fit",
  value: number
): { w: number; h: number } {
  let nw = w;
  let nh = h;
  if (mode === "width") {
    nw = Math.max(8, Math.round(value));
    nh = Math.max(1, Math.round((h * nw) / w));
  } else if (mode === "height") {
    nh = Math.max(8, Math.round(value));
    nw = Math.max(1, Math.round((w * nh) / h));
  } else if (mode === "percent") {
    const f = Math.min(5, Math.max(0.01, value / 100));
    nw = Math.max(1, Math.round(w * f));
    nh = Math.max(1, Math.round(h * f));
  } else {
    // fit inside value × value box, keep aspect
    const box = Math.max(8, value);
    const f = Math.min(box / w, box / h, 5);
    nw = Math.max(1, Math.round(w * f));
    nh = Math.max(1, Math.round(h * f));
  }
  // canvas hard cap — 16384 px per side
  const cap = 16384;
  if (nw > cap || nh > cap) {
    const f = Math.min(cap / nw, cap / nh);
    nw = Math.round(nw * f);
    nh = Math.round(nh * f);
  }
  return { w: nw, h: nh };
}

function bitmapToCanvas(
  bmp: ImageBitmap | { width: number; height: number },
  draw: (ctx: CanvasRenderingContext2D) => void,
  targetW?: number,
  targetH?: number
): HTMLCanvasElement {
  const w = targetW ?? (bmp as ImageBitmap).width;
  const h = targetH ?? (bmp as ImageBitmap).height;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  draw(ctx);
  return canvas;
}

async function encodeCanvas(
  canvas: HTMLCanvasElement,
  format: ImgFormat,
  quality?: number
): Promise<Blob> {
  const mime =
    format === "png" ? "image/png" : `image/${format}`;
  const blob = await canvasToBlob(canvas, mime, quality);
  if (format === "webp" && blob.type !== "image/webp") {
    throw new Error(
      "This browser cannot encode WebP images — pick JPG or PNG instead"
    );
  }
  return blob;
}

async function runImageTool(
  toolId: "compress-image" | "resize-image" | "convert-image",
  entries: { id: string; file: File }[],
  opts: Record<string, any>,
  cb: RunCallbacks
): Promise<EngineResult> {
  const outFiles: EngineResult["files"] = [];
  const notes: string[] = [];

  for (let i = 0; i < entries.length; i++) {
    const { id, file } = entries[i];
    const bmp = await decodeImage(file);
    assertPixels(bmp.width, bmp.height, file.name);
    const srcFmt = sourceFormat(file);

    let targetW = bmp.width;
    let targetH = bmp.height;
    let format: ImgFormat;
    let quality: number | undefined;
    let flattenWhite = false;
    let suffix = "";
    let resized = false;

    if (toolId === "compress-image") {
      format = opts.format === "webp" ? "webp" : "jpeg";
      quality = Math.min(0.98, Math.max(0.2, Number(opts.quality) || 0.6));
      if (opts.maxDimension > 0) {
        const f = Math.min(
          1,
          opts.maxDimension / Math.max(bmp.width, bmp.height)
        );
        targetW = Math.max(1, Math.round(bmp.width * f));
        targetH = Math.max(1, Math.round(bmp.height * f));
        resized = targetW !== bmp.width;
      }
      flattenWhite = format === "jpeg";
      suffix = "-compressed";
    } else if (toolId === "resize-image") {
      const mode = (["width", "height", "percent", "fit"] as const).includes(
        opts.mode
      )
        ? opts.mode
        : "width";
      const dims = pickTargetDims(bmp.width, bmp.height, mode, Number(opts.value));
      targetW = dims.w;
      targetH = dims.h;
      resized = targetW !== bmp.width || targetH !== bmp.height;
      format =
        opts.format === "keep"
          ? srcFmt === "gif" || srcFmt === "bmp"
            ? "png"
            : srcFmt
          : (opts.format as ImgFormat);
      flattenWhite = format === "jpeg";
      suffix = "-resized";
    } else {
      format = opts.format as ImgFormat;
      quality = format === "png" ? undefined : Number(opts.quality) || 0.9;
      flattenWhite = format === "jpeg";
      suffix = "";
    }

    const canvas = bitmapToCanvas(
      bmp,
      (ctx) => {
        ctx.imageSmoothingQuality = "high";
        if (flattenWhite) {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, targetW, targetH);
        }
        ctx.drawImage(bmp as unknown as CanvasImageSource, 0, 0, targetW, targetH);
      },
      targetW,
      targetH
    );

    let blob: Blob;
    try {
      blob = await encodeCanvas(canvas, format, quality);
    } catch (err) {
      if (String((err as Error).message).includes("WebP") && format === "webp") {
        // honest fallback: never silently switch formats
        throw err;
      }
      throw err;
    }

    const ext = FORMAT_EXT[format];
    const outName =
      toolId === "convert-image"
        ? `${baseName(file.name)}.${ext}`
        : `${baseName(file.name)}${suffix}.${ext}`;

    if (toolId === "convert-image" && srcFmt !== format) {
      if (srcFmt === "gif" || srcFmt === "bmp" || srcFmt === "jpeg") {
        if (srcFmt === "gif") notes.push("Animated GIFs export their first frame");
        if (srcFmt === "bmp") notes.push("BMP sources were re-encoded");
      }
    }
    if (toolId === "compress-image" && srcFmt === "png" && format === "jpeg") {
      notes.push("Transparent areas were filled white for JPG output");
    }
    if (toolId === "resize-image" && (srcFmt === "gif" || srcFmt === "bmp")) {
      notes.push("GIF/BMP sources were saved as PNG");
    }

    outFiles.push({
      name: outName,
      blob,
      size: blob.size,
      kind: format === "jpeg" ? "JPG" : format.toUpperCase(),
    });
    cb.onFileProgress?.(id, 1);
    cb.onOverall?.((i + 1) / entries.length);
    bmp.close?.();
    await tick();

    void resized;
  }

  let note =
    toolId === "compress-image"
      ? `Re-encoded at ${Math.round(Number(opts.quality) * 100)}% quality`
      : toolId === "resize-image"
        ? `Resized to ${Number(opts.value)}${opts.mode === "percent" ? "%" : `px ${opts.mode}`}`
        : `Converted to ${String(opts.format).toUpperCase()}`;
  if (notes.length) note += ` · ${[...new Set(notes)].join(" · ")}`;
  return { files: outFiles, note };
}

/* ================================================================
   3) PDF → PNG
   ================================================================ */

export interface PdfToPngOptions {
  scale: 1 | 2 | 3;
}

const CANVAS_MAX_SIDE = 8192;

async function runPdfToPng(
  entries: { id: string; file: File }[],
  opts: PdfToPngOptions,
  cb: RunCallbacks
): Promise<EngineResult> {
  const outFiles: EngineResult["files"] = [];
  let pageCount = 0;
  let clamped = false;

  for (let i = 0; i < entries.length; i++) {
    const bytes = await fileToBytes(entries[i].file);
    const doc = await tryOpenWithPdfjs(bytes, entries[i].file.name);
    const n = doc.numPages;
    const base = baseName(entries[i].file.name);
    const pad = String(n).length;
    for (let p = 1; p <= n; p++) {
      const page = await doc.getPage(p);
      const v1 = page.getViewport({ scale: 1 });
      const maxSide = Math.max(v1.width, v1.height) * opts.scale;
      let scale: number = opts.scale;
      if (maxSide > CANVAS_MAX_SIDE) {
        scale = Math.max(0.2, (CANVAS_MAX_SIDE / Math.max(v1.width, v1.height)));
        clamped = true;
      }
      const canvas = await renderPageToCanvas(doc, p, scale);
      const blob = await canvasToBlob(canvas, "image/png");
      outFiles.push({
        name: `${base}-p${padNum(p, pad)}.png`,
        blob,
        size: blob.size,
        kind: "PNG",
      });
      pageCount++;
      cb.onStatus?.(`Rendering page ${p}/${n}`);
      cb.onFileProgress?.(entries[i].id, p / n);
      cb.onOverall?.(((i + p / n) / entries.length) * 0.95);
      await tick();
    }
    cb.onFileProgress?.(entries[i].id, 1);
  }
  cb.onOverall?.(1);
  return {
    files: outFiles,
    note: `${pageCount} image(s) rendered${clamped ? " · very large pages were downscaled to fit browser canvas limits" : ""}`,
  };
}

/* ================================================================
   4) EXTRACT IMAGES FROM PDF
   ================================================================ */

export interface ExtractImagesOptions {
  format: "png" | "jpeg";
}

/** pdf.js image object → canvas (handles bitmap and raw data forms) */
function imageObjToCanvas(obj: any): HTMLCanvasElement | null {
  const w = obj?.width;
  const h = obj?.height;
  if (!w || !h) return null;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;

  if (obj.bitmap) {
    ctx.drawImage(obj.bitmap, 0, 0);
    return canvas;
  }
  if (obj.data) {
    const data = obj.data as Uint8ClampedArray;
    const kind = obj.kind; // 1 grayscale 1bpp, 2 RGB, 3 RGBA
    if (kind === 3 || (data.length === w * h * 4 && !obj.kind)) {
      ctx.putImageData(new ImageData(new Uint8ClampedArray(data), w, h), 0, 0);
    } else if (kind === 2 || data.length === w * h * 3) {
      const rgba = new Uint8ClampedArray(w * h * 4);
      for (let i = 0, j = 0; i < w * h; i++) {
        rgba[j++] = data[i * 3];
        rgba[j++] = data[i * 3 + 1];
        rgba[j++] = data[i * 3 + 2];
        rgba[j++] = 255;
      }
      ctx.putImageData(new ImageData(rgba, w, h), 0, 0);
    } else if (kind === 1 || data.length >= w * h) {
      const rgba = new Uint8ClampedArray(w * h * 4);
      for (let i = 0, j = 0; i < w * h; i++) {
        const v = data[i] ? 255 : 0;
        rgba[j++] = v;
        rgba[j++] = v;
        rgba[j++] = v;
        rgba[j++] = 255;
      }
      ctx.putImageData(new ImageData(rgba, w, h), 0, 0);
    } else {
      return null;
    }
    return canvas;
  }
  return null;
}

async function fetchImageObj(page: any, objId: string): Promise<any> {
  const objs = (page as any).objs;
  if (!objs) throw new Error("pdf.js object store unavailable");
  const get = async () =>
    typeof objs.get === "function"
      ? objs.get(objId)
      : await new Promise((res, rej) => objs.get(objId, (o: any) => res(o)));
  try {
    return await get();
  } catch {
    // some builds only resolve after a render pass — render once, retry
    const page2 = page;
    const v = page2.getViewport({ scale: 1 });
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.floor(v.width));
    c.height = Math.max(1, Math.floor(v.height));
    await page2.render({ canvasContext: c.getContext("2d")!, viewport: v } as any).promise;
    return await get();
  }
}

async function runExtractImages(
  entries: { id: string; file: File }[],
  opts: ExtractImagesOptions,
  cb: RunCallbacks
): Promise<EngineResult> {
  const pdfjs = await getPdfjs();
  const OPS = pdfjs.OPS;
  const outFiles: EngineResult["files"] = [];

  for (let i = 0; i < entries.length; i++) {
    const { id, file } = entries[i];
    const bytes = await fileToBytes(file);
    const doc = await tryOpenWithPdfjs(bytes, file.name);
    const n = doc.numPages;
    const base = baseName(file.name);
    const seen = new Set<string>();
    let index = 0;

    for (let p = 1; p <= n; p++) {
      const page = await doc.getPage(p);
      const opList = await page.getOperatorList();
      const ids: string[] = [];
      for (let k = 0; k < opList.fnArray.length; k++) {
        const fn = opList.fnArray[k];
        if (fn === OPS.paintImageXObject || fn === OPS.paintImageXObjectRepeat) {
          const name = opList.argsArray[k]?.[0];
          if (typeof name === "string") ids.push(name);
        }
      }
      for (const objId of ids) {
        if (seen.has(objId)) continue;
        seen.add(objId);
        let obj: any = null;
        try {
          obj = await fetchImageObj(page, objId);
        } catch {
          continue;
        }
        const canvas = imageObjToCanvas(obj);
        if (!canvas) continue;
        let blob: Blob;
        let kind: string;
        if (opts.format === "jpeg") {
          const flat = document.createElement("canvas");
          flat.width = canvas.width;
          flat.height = canvas.height;
          const fctx = flat.getContext("2d")!;
          fctx.fillStyle = "#ffffff";
          fctx.fillRect(0, 0, flat.width, flat.height);
          fctx.drawImage(canvas, 0, 0);
          blob = await canvasToBlob(flat, "image/jpeg", 0.92);
          kind = "JPG";
        } else {
          blob = await canvasToBlob(canvas, "image/png");
          kind = "PNG";
        }
        index++;
        outFiles.push({
          name: `${base}-p${padNum(p, String(n).length)}-${index}.${opts.format === "jpeg" ? "jpg" : "png"}`,
          blob,
          size: blob.size,
          kind,
        });
        cb.onStatus?.(`Extracted ${index} image(s) so far`);
      }
      cb.onFileProgress?.(id, p / n);
      cb.onOverall?.(((i + p / n) / entries.length) * 0.95);
      await tick();
    }
    cb.onFileProgress?.(id, 1);
  }

  cb.onOverall?.(1);
  if (!outFiles.length) {
    throw new Error(
      "No embedded images were found — this PDF looks like pure text or vector content"
    );
  }
  return {
    files: outFiles,
    note: `${outFiles.length} image(s) extracted (re-encoded as ${opts.format === "jpeg" ? "JPG" : "PNG"} — originals may differ in encoding)`,
  };
}

/* ================================================================
   5) EXTRACT TEXT FROM PDF
   ================================================================ */

export interface ExtractTextOptions {
  pageMarkers: boolean;
}

async function runExtractText(
  entries: { id: string; file: File }[],
  opts: ExtractTextOptions,
  cb: RunCallbacks
): Promise<EngineResult> {
  const outFiles: EngineResult["files"] = [];

  for (let i = 0; i < entries.length; i++) {
    const { id, file } = entries[i];
    const bytes = await fileToBytes(file);
    const doc = await tryOpenWithPdfjs(bytes, file.name);
    const n = doc.numPages;
    const chunks: string[] = [];

    for (let p = 1; p <= n; p++) {
      const page = await doc.getPage(p);
      const tc = await page.getTextContent();
      const lines: { y: number; items: { x: number; str: string; size: number }[] }[] = [];
      for (const item of tc.items as any[]) {
        if (!item.str || !item.str.trim()) continue;
        const x = item.transform[4];
        const y = item.transform[5];
        const size = Math.hypot(item.transform[0], item.transform[1]) || 12;
        let line = lines.find((l) => Math.abs(l.y - y) < size * 0.6);
        if (!line) {
          line = { y, items: [] };
          lines.push(line);
        }
        line.items.push({ x, str: item.str, size });
      }
      lines.sort((a, b) => b.y - a.y);
      const parts: string[] = [];
      for (const line of lines) {
        line.items.sort((a, b) => a.x - b.x);
        let text = "";
        let prevEnd: number | null = null;
        for (const it of line.items) {
          if (prevEnd !== null) {
            const gap = it.x - prevEnd;
            if (gap > 1.5) text += gap > 12 ? "  " : " ";
          }
          text += it.str;
          prevEnd = it.x + it.str.length * it.size * 0.5;
        }
        if (text.trim()) parts.push(text);
      }
      if (opts.pageMarkers && p > 1) chunks.push(`\n\n----- Page ${p} -----\n`);
      chunks.push(parts.join("\n"));
      cb.onStatus?.(`Extracting page ${p}/${n}`);
      cb.onFileProgress?.(id, p / n);
      cb.onOverall?.(((i + p / n) / entries.length) * 0.92);
      await tick();
    }

    const text = chunks.join("\n");
    if (!text.trim()) {
      throw new Error(
        `"${file.name}" has no text layer — it looks scanned. OCR is on our roadmap; for now use PDF to JPG.`
      );
    }
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    outFiles.push({
      name: `${baseName(file.name)}.txt`,
      blob,
      size: blob.size,
      kind: "TXT",
    });
    cb.onFileProgress?.(id, 1);
  }
  cb.onOverall?.(1);
  return { files: outFiles, note: "Text layer extracted in reading order" };
}

/* ================================================================
   6) TEXT → PDF
   ================================================================ */

export interface TextToPdfOptions {
  text: string;
  fontFamily: "helvetica" | "times" | "courier";
  fontSize: number;
  pageSize: "a4" | "letter";
  margin: number;
  /** optional user-supplied TTF/OTF for non-Latin scripts */
  customFont?: File | null;
}

const WINANSI_EXTRA =
  "\u20AC\u201A\u0192\u201E\u2026\u2020\u2021\u02C6\u2030\u0160\u2039\u0152\u017D\u2018\u2019\u201C\u201D\u2022\u2013\u2014\u02DC\u2122\u0161\u203A\u0153\u017E\u0178\u00A0";

function isWinAnsiSafe(text: string): boolean {
  for (const ch of text) {
    const c = ch.codePointAt(0)!;
    if (c === 9 || c === 10 || c === 13) continue;
    if (c >= 0x20 && c <= 0x7e) continue;
    if (c >= 0xa0 && c <= 0xff) continue;
    if (WINANSI_EXTRA.includes(ch)) continue;
    return false;
  }
  return true;
}

async function runTextToPdf(
  _entries: { id: string; file: File }[],
  opts: TextToPdfOptions,
  cb: RunCallbacks
): Promise<EngineResult> {
  const { PDFDocument, StandardFonts, rgb } = await getPdfLib();
  if (!opts.text || !opts.text.trim()) {
    throw new Error("Enter or paste some text first");
  }

  const doc = await PDFDocument.create();
  let font: any;
  let fontLabel: string = opts.fontFamily;

  if (opts.customFont) {
    const fontkit = await import("@pdf-lib/fontkit");
    doc.registerFontkit(fontkit.default ?? (fontkit as any));
    const bytes = new Uint8Array(await opts.customFont.arrayBuffer());
    try {
      font = await doc.embedFont(bytes, { subset: true });
      fontLabel = `custom (${opts.customFont.name})`;
    } catch {
      throw new Error(
        `"${opts.customFont.name}" could not be embedded — make sure it is a valid .ttf or .otf font file`
      );
    }
  } else {
    if (!isWinAnsiSafe(opts.text)) {
      throw new Error(
        "Standard PDF fonts support basic Latin only. Your text contains characters they cannot encode — upload a .ttf/.otf font below and we will embed it."
      );
    }
    const map = {
      helvetica: StandardFonts.Helvetica,
      times: StandardFonts.TimesRoman,
      courier: StandardFonts.Courier,
    } as const;
    font = await doc.embedFont(map[opts.fontFamily] ?? StandardFonts.Helvetica);
  }

  const W = opts.pageSize === "letter" ? 612 : 595.28;
  const H = opts.pageSize === "letter" ? 792 : 841.89;
  const M = Math.max(18, Math.min(120, opts.margin || 56));
  const contentW = W - M * 2;
  const size = Math.max(6, Math.min(42, opts.fontSize || 11));
  const lineH = size * 1.5;

  // normalize: CRLF → LF, tabs → spaces, drop exotic control chars
  const clean = opts.text
    .replace(/\r\n?/g, "\n")
    .replace(/\t/g, "    ")
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");

  const paragraphs = clean.split("\n");
  const lines: string[] = [];
  for (const para of paragraphs) {
    if (!para.trim()) {
      lines.push("");
      continue;
    }
    let current = "";
    for (const word of para.split(/ +/)) {
      const attempt = current ? `${current} ${word}` : word;
      let w = 0;
      try {
        w = font.widthOfTextAtSize(attempt, size);
      } catch {
        w = attempt.length * size * 0.55;
      }
      if (w <= contentW || !current) {
        current = attempt;
        // hard-break pathological unbroken tokens (loop until it fits)
        while (!current.includes(" ")) {
          let wCur = 0;
          try {
            wCur = font.widthOfTextAtSize(current, size);
          } catch {
            wCur = current.length * size * 0.55;
          }
          if (wCur <= contentW) break;
          let fit = "";
          for (const ch of current) {
            if (font.widthOfTextAtSize(fit + ch, size) > contentW) break;
            fit += ch;
          }
          if (!fit || fit === current) break;
          lines.push(fit);
          current = current.slice(fit.length);
        }
      } else {
        lines.push(current);
        current = word;
      }
    }
    if (current) lines.push(current);
  }

  const outLines = lines.length ? lines : [""];
  let page = doc.addPage([W, H]);
  let y = H - M;
  for (let i = 0; i < outLines.length; i++) {
    if (y - size < M) {
      page = doc.addPage([W, H]);
      y = H - M;
    }
    const line = outLines[i];
    if (line) {
      try {
        page.drawText(line, {
          x: M,
          y: y - size,
          size,
          font,
          color: rgb(0.09, 0.11, 0.16),
        });
      } catch (err) {
        throw new Error(
          "A character could not be encoded with the selected font. Try uploading a .ttf/.otf font that covers your text."
        );
      }
    }
    y -= lineH;
    if (i % 40 === 0) {
      cb.onOverall?.(0.15 + 0.8 * (i / outLines.length));
      await tick();
    }
  }
  cb.onOverall?.(1);

  const blob = pdfBlob(await doc.save());
  return {
    files: [
      { name: "text.pdf", blob, size: blob.size, kind: "PDF" },
    ],
    note: `${doc.getPageCount()} page(s) · font: ${fontLabel} · ${size}pt`,
  };
}

/* ================================================================
   7) ANNOTATIONS — Edit PDF / Sign PDF (shared applier)
   ================================================================ */

export interface AnnotItem {
  /** 0-based page index */
  page: number;
  type: "text" | "highlight" | "rect" | "ellipse" | "line" | "draw" | "image";
  /** all coords are PDF user-space (origin bottom-left, y up) */
  text?: string;
  font?: "helvetica" | "helvetica-bold" | "times" | "times-bold" | "courier" | "courier-bold";
  size?: number;
  color?: string;
  opacity?: number;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  /** freehand polyline points in PDF user space */
  points?: { x: number; y: number }[];
  thickness?: number;
  fill?: string | null;
  dataUrl?: string;
  rotate?: number;
}

const STD_FONT_MAP = {
  helvetica: "Helvetica",
  "helvetica-bold": "HelveticaBold",
  times: "TimesRoman",
  "times-bold": "TimesRomanBold",
  courier: "Courier",
  "courier-bold": "CourierBold",
} as const;

async function runApplyAnnotations(
  entries: { id: string; file: File }[],
  opts: { items: AnnotItem[] },
  cb: RunCallbacks,
  mode: "edit" | "sign"
): Promise<EngineResult> {
  const { PDFDocument, StandardFonts, degrees, rgb } = await getPdfLib();
  const items = (opts.items ?? []) as AnnotItem[];
  if (!items.length) {
    throw new Error(
      mode === "sign"
        ? "Place a signature on the page first"
        : "Add at least one annotation first"
    );
  }

  const { id, file } = entries[0];
  const bytes = await fileToBytes(file);
  const doc = await loadWithPdfLib(bytes);
  const pageCount = doc.getPageCount();
  if (items.some((it) => it.page < 0 || it.page >= pageCount)) {
    throw new Error("An annotation points to a page that does not exist");
  }

  const fontCache = new Map<string, any>();
  const getFont = async (key?: string) => {
    const name = STD_FONT_MAP[(key ?? "helvetica") as keyof typeof STD_FONT_MAP] ?? "Helvetica";
    if (!fontCache.has(name)) {
      fontCache.set(name, await doc.embedFont((StandardFonts as any)[name]));
    }
    return fontCache.get(name);
  };

  let idx = 0;
  for (const item of items) {
    const page = doc.getPage(item.page);
    const [r, g, b] = hexToRgb01(item.color || "#000000");
    const fillRgb = item.fill ? hexToRgb01(item.fill) : null;

    switch (item.type) {
      case "text": {
        const font = await getFont(item.font);
        page.drawText(item.text ?? "", {
          x: item.x,
          y: item.y,
          size: item.size ?? 14,
          font,
          color: rgb(r, g, b),
          opacity: item.opacity ?? 1,
          lineHeight: (item.size ?? 14) * 1.35,
          rotate: degrees(item.rotate ?? 0),
        });
        break;
      }
      case "highlight": {
        page.drawRectangle({
          x: item.x,
          y: item.y,
          width: item.w,
          height: item.h,
          color: rgb(r, g, b),
          opacity: item.opacity ?? 0.35,
        });
        break;
      }
      case "rect": {
        page.drawRectangle({
          x: item.x,
          y: item.y,
          width: item.w,
          height: item.h,
          color: fillRgb ? rgb(...fillRgb) : undefined,
          borderColor: rgb(r, g, b),
          borderWidth: item.thickness ?? 2,
          opacity: item.opacity ?? 1,
          borderOpacity: item.opacity ?? 1,
        });
        break;
      }
      case "ellipse": {
        page.drawEllipse({
          x: (item.x ?? 0) + (item.w ?? 0) / 2,
          y: (item.y ?? 0) + (item.h ?? 0) / 2,
          xScale: (item.w ?? 0) / 2,
          yScale: (item.h ?? 0) / 2,
          color: fillRgb ? rgb(...fillRgb) : undefined,
          borderColor: rgb(r, g, b),
          borderWidth: item.thickness ?? 2,
          opacity: item.opacity ?? 1,
          borderOpacity: item.opacity ?? 1,
        });
        break;
      }
      case "line": {
        page.drawLine({
          start: { x: item.x1 as number, y: item.y1 as number },
          end: { x: item.x2 as number, y: item.y2 as number },
          thickness: item.thickness ?? 2,
          color: rgb(r, g, b),
          opacity: item.opacity ?? 1,
        });
        break;
      }
      case "draw": {
        const pts = item.points ?? [];
        for (let k = 1; k < pts.length; k++) {
          page.drawLine({
            start: { x: pts[k - 1].x, y: pts[k - 1].y },
            end: { x: pts[k].x, y: pts[k].y },
            thickness: item.thickness ?? 2,
            color: rgb(r, g, b),
            opacity: item.opacity ?? 1,
            lineCap: 1,
          });
        }
        break;
      }
      case "image": {
        if (!item.dataUrl) break;
        const bytes2 = dataUrlToBytes(item.dataUrl);
        const img = item.dataUrl.startsWith("data:image/png")
          ? await doc.embedPng(bytes2)
          : await doc.embedJpg(bytes2);
        page.drawImage(img, {
          x: item.x,
          y: item.y,
          width: item.w,
          height: item.h,
          rotate: degrees(item.rotate ?? 0),
          opacity: item.opacity ?? 1,
        });
        break;
      }
    }
    idx++;
    cb.onOverall?.(idx / items.length);
    if (idx % 3 === 0) await tick();
  }
  cb.onOverall?.(1);

  const blob = pdfBlob(await doc.save({ useObjectStreams: true }));
  return {
    files: [
      {
        name: `${baseName(file.name)}-${mode === "sign" ? "signed" : "edited"}.pdf`,
        blob,
        size: blob.size,
        kind: "PDF",
      },
    ],
    note:
      mode === "sign"
        ? `Signature placed on ${new Set(items.map((i) => i.page)).size} page(s)`
        : `${items.length} annotation(s) applied`,
  };
}

/* ================================================================
   8) REDACT PDF — permanent removal
   ================================================================ */

export interface RedactBox {
  /** 0-based page index */
  page: number;
  /** PDF user space, min-corner + size */
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface RedactOptions {
  boxes: RedactBox[];
  /** affected = flatten only pages that carry boxes; all = flatten every page */
  scope: "affected" | "all";
}

async function runRedact(
  entries: { id: string; file: File }[],
  opts: RedactOptions,
  cb: RunCallbacks
): Promise<EngineResult> {
  const { PDFDocument } = await getPdfLib();
  const boxes = (opts.boxes ?? []) as RedactBox[];
  if (!boxes.length) throw new Error("Draw at least one redaction box");

  const { id, file } = entries[0];
  const bytes = await fileToBytes(file);
  const doc = await tryOpenWithPdfjs(bytes, file.name);
  const src = await loadWithPdfLib(bytes);
  const n = doc.numPages;
  const affected = new Set<number>(boxes.map((b) => b.page));
  const flattenAll = opts.scope === "all";

  const out = await PDFDocument.create();
  const flattened: number[] = [];

  for (let p = 1; p <= n; p++) {
    const page = await doc.getPage(p);
    const v1 = page.getViewport({ scale: 1 });
    const needsFlatten = flattenAll || affected.has(p - 1);

    if (needsFlatten) {
      const maxDim = Math.max(v1.width, v1.height);
      const scale = Math.min(2.2, 4096 / maxDim);
      const canvas = await renderPageToCanvas(doc, p, scale);
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#000000";
      for (const box of boxes) {
        if (box.page !== p - 1) continue;
        // clamp to page bounds
        const x0 = Math.max(0, box.x);
        const y0 = Math.max(0, box.y);
        const x1 = Math.min(v1.width, box.x + box.w);
        const y1 = Math.min(v1.height, box.y + box.h);
        if (x1 <= x0 || y1 <= y0) continue;
        const [ax, ay] = v1.convertToViewportPoint(x0, y1);
        const [bx, by] = v1.convertToViewportPoint(x1, y0);
        ctx.fillRect(
          Math.min(ax, bx) * scale,
          Math.min(ay, by) * scale,
          Math.abs(bx - ax) * scale,
          Math.abs(by - ay) * scale
        );
      }
      const jpg = await canvasToBlob(canvas, "image/jpeg", 0.92);
      const img = await out.embedJpg(new Uint8Array(await jpg.arrayBuffer()));
      const newPage = out.addPage([v1.width, v1.height]);
      newPage.drawImage(img, {
        x: 0,
        y: 0,
        width: v1.width,
        height: v1.height,
      });
      flattened.push(p);
    } else {
      const [copied] = await out.copyPages(src, [p - 1]);
      out.addPage(copied);
    }
    cb.onFileProgress?.(id, p / n);
    cb.onOverall?.((p / n) * 0.97);
    await tick();
  }
  cb.onOverall?.(1);

  const blob = pdfBlob(await out.save({ useObjectStreams: true }));
  return {
    files: [
      {
        name: `${baseName(file.name)}-redacted.pdf`,
        blob,
        size: blob.size,
        kind: "PDF",
      },
    ],
    note: `Redaction is permanent — text under the boxes is gone. ${flattened.length} page(s) flattened to image, the rest untouched.`,
  };
}

/* ================================================================
   8) FLATTEN PDF — rasterize pages into one permanent layer
   ================================================================ */

export interface FlattenOptions {
  quality: "standard" | "high" | "lossless";
}

const FLATTEN_MODES = {
  standard: { scale: 1.5, type: "image/jpeg", quality: 0.85, label: "1.5× · JPG 85%" },
  high: { scale: 2.0, type: "image/jpeg", quality: 0.92, label: "2× · JPG 92%" },
  lossless: { scale: 2.0, type: "image/png", quality: undefined as number | undefined, label: "2× · PNG lossless" },
} as const;

async function runFlatten(
  entries: { id: string; file: File }[],
  opts: FlattenOptions,
  cb: RunCallbacks
): Promise<EngineResult> {
  const mode = FLATTEN_MODES[opts.quality] ?? FLATTEN_MODES.high;
  const outFiles: EngineResult["files"] = [];
  let pages = 0;

  for (let i = 0; i < entries.length; i++) {
    const { id, file } = entries[i];
    const bytes = await fileToBytes(file);
    const doc = await tryOpenWithPdfjs(bytes, file.name);
    const n = doc.numPages;
    const { PDFDocument } = await getPdfLib();
    const out = await PDFDocument.create();

    for (let p = 1; p <= n; p++) {
      const page = await doc.getPage(p);
      const v1 = page.getViewport({ scale: 1 });
      const canvas = await renderPageToCanvas(doc, p, mode.scale);
      const blob = await canvasToBlob(canvas, mode.type, mode.quality);
      const imgBytes = new Uint8Array(await blob.arrayBuffer());
      const img =
        mode.type === "image/png"
          ? await out.embedPng(imgBytes)
          : await out.embedJpg(imgBytes);
      const outPage = out.addPage([v1.width, v1.height]);
      outPage.drawImage(img, { x: 0, y: 0, width: v1.width, height: v1.height });
      pages++;
      cb.onStatus?.(`Flattening page ${p}/${n}`);
      cb.onFileProgress?.(id, p / n);
      cb.onOverall?.(((i + p / n) / entries.length) * 0.95);
      await tick();
    }

    const saved = await out.save({ useObjectStreams: true });
    const blob = pdfBlob(saved);
    outFiles.push({
      name: `${baseName(file.name)}-flattened.pdf`,
      blob,
      size: blob.size,
      kind: "PDF",
    });
    cb.onFileProgress?.(id, 1);
  }
  cb.onOverall?.(1);
  return {
    files: outFiles,
    note: `${pages} page(s) rasterized (${mode.label}) — text is no longer selectable and annotations are baked in`,
  };
}

/* ================================================================
   9) EDIT PDF METADATA — read + rewrite the document info dictionary
   ================================================================ */

export interface PdfInfoMeta {
  title: string;
  author: string;
  subject: string;
  keywords: string;
  creator: string;
  producer: string;
}

/** UI-facing read helper (same pattern as firstPagePreview in pdf-engine) */
export async function readPdfMetadata(file: File): Promise<PdfInfoMeta> {
  const empty: PdfInfoMeta = {
    title: "",
    author: "",
    subject: "",
    keywords: "",
    creator: "",
    producer: "",
  };
  try {
    const { PDFDocument } = await getPdfLib();
    const doc = await PDFDocument.load(await file.arrayBuffer(), {
      ignoreEncryption: true,
    });
    const kw = doc.getKeywords();
    return {
      title: doc.getTitle() ?? "",
      author: doc.getAuthor() ?? "",
      subject: doc.getSubject() ?? "",
      keywords: Array.isArray(kw) ? kw.join(", ") : (kw ?? ""),
      creator: doc.getCreator() ?? "",
      producer: doc.getProducer() ?? "",
    };
  } catch {
    return empty;
  }
}

export interface MetadataEditOptions extends PdfInfoMeta {
  /** also write "" into every field the user left empty */
  clearEmpty: boolean;
}

async function runEditMetadata(
  entries: { id: string; file: File }[],
  opts: MetadataEditOptions,
  cb: RunCallbacks
): Promise<EngineResult> {
  const outFiles: EngineResult["files"] = [];
  const touchedAll: string[] = [];

  const applyField = (
    value: string,
    clearEmpty: boolean,
    setter: (v: string) => void
  ): boolean => {
    const v = value.trim();
    if (v) {
      setter(v);
      return true;
    }
    if (clearEmpty) {
      setter("");
      return true;
    }
    return false;
  };

  for (let i = 0; i < entries.length; i++) {
    const { id, file } = entries[i];
    const bytes = await fileToBytes(file);
    const { PDFDocument } = await getPdfLib();
    const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });

    const touched: string[] = [];
    if (applyField(opts.title, opts.clearEmpty, (v) => doc.setTitle(v)))
      touched.push("title");
    if (applyField(opts.author, opts.clearEmpty, (v) => doc.setAuthor(v)))
      touched.push("author");
    if (applyField(opts.subject, opts.clearEmpty, (v) => doc.setSubject(v)))
      touched.push("subject");
    if (
      applyField(opts.keywords, opts.clearEmpty, (v) =>
        doc.setKeywords(
          v ? v.split(",").map((k) => k.trim()).filter(Boolean) : []
        )
      )
    )
      touched.push("keywords");
    if (applyField(opts.creator, opts.clearEmpty, (v) => doc.setCreator(v)))
      touched.push("creator");
    if (applyField(opts.producer, opts.clearEmpty, (v) => doc.setProducer(v)))
      touched.push("producer");

    const saved = await doc.save({ useObjectStreams: true });
    const blob = pdfBlob(saved);
    outFiles.push({
      name: `${baseName(file.name)}-metadata.pdf`,
      blob,
      size: blob.size,
      kind: "PDF",
    });
    touchedAll.push(...touched);
    cb.onFileProgress?.(id, (i + 1) / entries.length);
    cb.onOverall?.((i + 1) / entries.length);
  }
  cb.onOverall?.(1);

  const uniq = [...new Set(touchedAll)];
  return {
    files: outFiles,
    note: uniq.length
      ? `Updated: ${uniq.join(", ")}${opts.clearEmpty ? " · fields left empty were cleared" : ""}`
      : "Nothing was changed — every field was left as-is",
  };
}

/* ================================================================
   10) QR CODE → PDF
   ================================================================ */

export interface QrToPdfOptions {
  text: string;
  ec: "L" | "M" | "Q" | "H";
  /** PNG render resolution in px (crispness when printed) */
  pixelSize: number;
  pageSize: "a4" | "letter";
  caption: string;
}

async function runQrToPdf(
  _entries: { id: string; file: File }[],
  opts: QrToPdfOptions,
  cb: RunCallbacks
): Promise<EngineResult> {
  const content = opts.text?.trim() ?? "";
  if (!content)
    throw new Error("Type the link or text the QR code should contain");

  const QRCode = (await import("qrcode")).default;
  const size = Math.max(256, Math.min(2048, opts.pixelSize || 768));
  const ec = opts.ec ?? "M";
  let dataUrl: string;
  try {
    dataUrl = await QRCode.toDataURL(content, {
      errorCorrectionLevel: ec,
      width: size,
      margin: 2,
      color: { dark: "#000000ff", light: "#ffffffff" },
    });
  } catch {
    throw new Error(
      "This content is too long to fit in a QR code — shorten it or lower the error correction level"
    );
  }

  const { PDFDocument, StandardFonts, rgb } = await getPdfLib();
  const doc = await PDFDocument.create();
  const W = opts.pageSize === "letter" ? 612 : 595.28;
  const H = opts.pageSize === "letter" ? 792 : 841.89;
  const page = doc.addPage([W, H]);

  const img = await doc.embedPng(dataUrlToBytes(dataUrl));

  const caption = (opts.caption ?? "").trim();
  if (caption && !isWinAnsiSafe(caption)) {
    throw new Error(
      "The caption contains characters the standard PDF fonts can't encode — please stick to basic Latin for the caption"
    );
  }

  const draw = Math.min(W, H) * 0.55;
  const capH = caption ? 40 : 0;
  const top = (H + draw + capH) / 2;
  page.drawImage(img, {
    x: (W - draw) / 2,
    y: top - draw,
    width: draw,
    height: draw,
  });

  if (caption) {
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const cSize = 12;
    const text = caption.length > 80 ? caption.slice(0, 77) + "..." : caption;
    const tw = font.widthOfTextAtSize(text, cSize);
    page.drawText(text, {
      x: (W - tw) / 2,
      y: top - draw - 26,
      size: cSize,
      font,
      color: rgb(0.09, 0.11, 0.16),
    });
  }

  const blob = pdfBlob(await doc.save({ useObjectStreams: true }));
  cb.onOverall?.(1);
  return {
    files: [{ name: "qr-code.pdf", blob, size: blob.size, kind: "PDF" }],
    note: `QR rendered at ${size}px · error correction ${ec}`,
  };
}

/* ================================================================
   11) OCR — on-device text recognition (Tesseract.js, lazy-loaded)
   ================================================================ */

export interface OcrOptions {
  lang: "eng" | "spa" | "fra" | "por" | "hin" | "urd" | "ara";
  pageMarkers: boolean;
}

const OCR_LANGS = ["eng", "spa", "fra", "por", "hin", "urd", "ara"] as const;
const OCR_LANG_NAMES: Record<(typeof OCR_LANGS)[number], string> = {
  eng: "English",
  spa: "Spanish",
  fra: "French",
  por: "Portuguese",
  hin: "Hindi",
  urd: "Urdu",
  ara: "Arabic",
};

async function runOcr(
  entries: { id: string; file: File }[],
  opts: OcrOptions,
  cb: RunCallbacks
): Promise<EngineResult> {
  const lang = (OCR_LANGS as readonly string[]).includes(opts.lang)
    ? opts.lang
    : "eng";

  cb.onStatus?.(
    "Loading the OCR engine — the first run downloads the language pack once, after that it is cached"
  );

  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker(lang, 1, {
    workerPath:
      "https://cdn.jsdelivr.net/npm/tesseract.js@v7.0.0/dist/worker.min.js",
    corePath: "https://cdn.jsdelivr.net/npm/tesseract.js-core@7.0.0",
    langPath: "https://tessdata.projectnaptha.com/4.0.0_fast",
    logger: () => {},
  });

  try {
    const outFiles: EngineResult["files"] = [];
    const perFilePages: number[] = [];

    for (let i = 0; i < entries.length; i++) {
      const { id, file } = entries[i];
      const isPdf =
        file.type === "application/pdf" || /\.pdf$/i.test(file.name);
      const chunks: string[] = [];
      let pageCount = 0;

      if (isPdf) {
        const bytes = await fileToBytes(file);
        const doc = await tryOpenWithPdfjs(bytes, file.name);
        const n = doc.numPages;
        for (let p = 1; p <= n; p++) {
          const canvas = await renderPageToCanvas(doc, p, 2);
          cb.onStatus?.(`Recognizing page ${p}/${n} of ${file.name}`);
          const { data } = await worker.recognize(canvas);
          if (opts.pageMarkers && p > 1)
            chunks.push(`\n\n----- Page ${p} -----\n`);
          chunks.push(data.text ?? "");
          pageCount++;
          cb.onFileProgress?.(id, p / n);
          cb.onOverall?.(((i + p / n) / entries.length) * 0.95);
          await tick();
        }
      } else {
        const bmp = await decodeImage(file);
        assertPixels(bmp.width, bmp.height, file.name);
        const canvas = bitmapToCanvas(bmp, (ctx) => ctx.drawImage(bmp, 0, 0));
        cb.onStatus?.(`Recognizing ${file.name}`);
        const { data } = await worker.recognize(canvas);
        chunks.push(data.text ?? "");
        pageCount = 1;
        bmp.close?.();
        cb.onFileProgress?.(id, 1);
        cb.onOverall?.(((i + 1) / entries.length) * 0.95);
      }

      const text = chunks.join("");
      if (!text.trim()) {
        throw new Error(
          `No text could be recognized in "${file.name}" — try a sharper scan, or a different text language`
        );
      }
      const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
      outFiles.push({
        name: `${baseName(file.name)}-ocr.txt`,
        blob,
        size: blob.size,
        kind: "TXT",
      });
      perFilePages.push(pageCount);
      cb.onFileProgress?.(id, 1);
      await tick();
    }
    cb.onOverall?.(1);

    const totalPages = perFilePages.reduce((a, b) => a + b, 0);
    return {
      files: outFiles,
      note: `${totalPages} page(s) recognized in ${OCR_LANG_NAMES[lang as keyof typeof OCR_LANG_NAMES]} · OCR ran entirely on your device — the language pack downloads once from the Tesseract CDN, then stays browser-cached`,
    };
  } finally {
    await worker.terminate();
  }
}

/* ================================================================
   12) ID PHOTO — crop to standard sizes at 300 DPI + print sheet
   ================================================================ */

export interface IdPhotoOptions {
  /** preset key from id-photo-presets (used when explicit w/h are absent) */
  preset?: string;
  /** exact photo size in mm (UI computes it from presets or custom inputs) */
  w?: number;
  h?: number;
  /** 1 = cover fit, >1 zooms in */
  zoom: number;
  /** -1..1 pan within the crop, fraction of the overflow */
  offsetX: number;
  offsetY: number;
  /** background painted behind transparent areas (hex) */
  bg: string;
  /** also emit a print sheet with as many copies as fit */
  sheet: boolean;
  /** print sheet paper size (10×15 cm by default) */
  paper?: IdPaperKey;
  /** copies to place on the sheet; 0 = as many as fit */
  copies?: number;
  /** dashed cut guides around each copy (default on) */
  cutGuides?: boolean;
}

type IdPaperKey = keyof typeof IDP_PAPERS;

const ID_PRINT_DPI = 300;
const mmToPx = (mm: number) => Math.round((mm / 25.4) * ID_PRINT_DPI);
const mmToPt = (mm: number) => (mm * 72) / 25.4;

/** shared crop math — also used by the live preview in the workspace */
export function idPhotoCropRect(
  srcW: number,
  srcH: number,
  cropW: number,
  cropH: number,
  zoom: number,
  offsetX: number,
  offsetY: number
) {
  const s = Math.max(cropW / srcW, cropH / srcH) * Math.max(1, zoom);
  const dw = srcW * s;
  const dh = srcH * s;
  const maxX = Math.max(0, (dw - cropW) / 2);
  const maxY = Math.max(0, (dh - cropH) / 2);
  const clamp = (v: number, m: number) => Math.min(m, Math.max(-m, v));
  const dx = clamp((cropW - dw) / 2 + offsetX * maxX, maxX);
  const dy = clamp((cropH - dh) / 2 + offsetY * maxY, maxY);
  return { scale: s, dx, dy, dw, dh };
}

/** render the cropped photo at exactly wmm×hmm / 300 DPI as JPEG */
export async function idPhotoPhotoBlob(
  file: File,
  wmm: number,
  hmm: number,
  zoom: number,
  offsetX: number,
  offsetY: number,
  bg: string
): Promise<Blob> {
  const bmp = await decodeImage(file);
  assertPixels(bmp.width, bmp.height, file.name);
  const cw = mmToPx(wmm);
  const ch = mmToPx(hmm);
  const { dx, dy, dw, dh } = idPhotoCropRect(
    bmp.width,
    bmp.height,
    cw,
    ch,
    zoom || 1,
    offsetX || 0,
    offsetY || 0
  );
  const canvas = document.createElement("canvas");
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = bg || "#ffffff";
  ctx.fillRect(0, 0, cw, ch);
  ctx.drawImage(bmp, dx, dy, dw, dh);
  const jpg = await canvasToBlob(canvas, "image/jpeg", 0.95);
  bmp.close?.();
  return jpg;
}

/** render a single print-sheet PDF (paper choice, copies, cut guides) */
export async function idPhotoSheetBlob(
  file: File,
  o: {
    wmm: number;
    hmm: number;
    zoom: number;
    offsetX: number;
    offsetY: number;
    bg: string;
    paper?: "10x15" | "4x6" | "a4";
    copies?: number;
    cutGuides?: boolean;
  }
): Promise<Blob> {
  const jpg = await idPhotoPhotoBlob(
    file,
    o.wmm,
    o.hmm,
    o.zoom,
    o.offsetX,
    o.offsetY,
    o.bg
  );
  const paper = IDP_PAPERS[o.paper ?? "10x15"];
  const { PDFDocument, rgb } = await getPdfLib();
  const doc = await PDFDocument.create();
  const img = await doc.embedJpg(new Uint8Array(await jpg.arrayBuffer()));
  const pw = mmToPt(o.wmm);
  const ph = mmToPt(o.hmm);
  const SW = mmToPt(paper.w);
  const SH = mmToPt(paper.h);
  const gap = mmToPt(3);
  const grid = idpSheetGrid(o.wmm, o.hmm, paper.w, paper.h, 3);
  let cols = grid.cols;
  let rows = grid.rows;
  // explicit copies (non-zero) shrink the grid to just what's needed
  if (o.copies && o.copies > 0) {
    cols = Math.min(cols, o.copies);
    rows = Math.min(rows, Math.ceil(o.copies / cols));
  }
  const gridW = cols * pw + (cols - 1) * gap;
  const gridH = rows * ph + (rows - 1) * gap;
  const startX = (SW - gridW) / 2;
  const startY = (SH - gridH) / 2;
  const page = doc.addPage([SW, SH]);
  let placed = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (o.copies && o.copies > 0 && placed >= o.copies) break;
      const x = startX + c * (pw + gap);
      const y = SH - startY - (r + 1) * ph - r * gap;
      page.drawImage(img, { x, y, width: pw, height: ph });
      if (o.cutGuides !== false) {
        page.drawRectangle({
          x: x - 1,
          y: y - 1,
          width: pw + 2,
          height: ph + 2,
          borderWidth: 0.4,
          borderColor: rgb(0.72, 0.73, 0.76),
          borderDashArray: [2, 2],
        });
      }
      placed++;
    }
    if (o.copies && o.copies > 0 && placed >= o.copies) break;
  }
  const saved = await doc.save({ useObjectStreams: true });
  return pdfBlob(saved);
}

async function runIdPhoto(
  entries: { id: string; file: File }[],
  opts: IdPhotoOptions,
  cb: RunCallbacks
): Promise<EngineResult> {
  const p = (() => {
    if (opts.w && opts.h)
      return { w: opts.w, h: opts.h, label: `${opts.w} × ${opts.h} mm` };
    const d =
      IDP_PRESETS.find((x) => x.key === (opts.preset ?? "p35x45")) ??
      IDP_PRESETS[0];
    return { w: d.w, h: d.h, label: `${d.w} × ${d.h} mm` };
  })();
  const outFiles: EngineResult["files"] = [];

  for (let i = 0; i < entries.length; i++) {
    const { id, file } = entries[i];
    const jpg = await idPhotoPhotoBlob(
      file,
      p.w,
      p.h,
      opts.zoom,
      opts.offsetX,
      opts.offsetY,
      opts.bg
    );

    const { PDFDocument } = await getPdfLib();
    const doc = await PDFDocument.create();

    // page 1 — the photo at its exact physical size (prints 1:1)
    const img = await doc.embedJpg(new Uint8Array(await jpg.arrayBuffer()));
    const pw = mmToPt(p.w);
    const ph = mmToPt(p.h);
    doc.addPage([pw, ph]).drawImage(img, {
      x: 0,
      y: 0,
      width: pw,
      height: ph,
    });

    // page 2 (optional) — the configured print sheet
    if (opts.sheet) {
      const sheet = await idPhotoSheetBlob(file, {
        wmm: p.w,
        hmm: p.h,
        zoom: opts.zoom,
        offsetX: opts.offsetX,
        offsetY: opts.offsetY,
        bg: opts.bg,
        paper: opts.paper,
        copies: opts.copies,
        cutGuides: opts.cutGuides,
      });
      const sheetDoc = await PDFDocument.load(
        new Uint8Array(await sheet.arrayBuffer())
      );
      const pages = await doc.copyPages(sheetDoc, [0]);
      doc.addPage(pages[0]);
    }

    const saved = await doc.save({ useObjectStreams: true });
    const blob = pdfBlob(saved);
    outFiles.push({
      name: `${baseName(file.name)}-id-${p.w}x${p.h}mm.pdf`,
      blob,
      size: blob.size,
      kind: "PDF",
    });
    cb.onFileProgress?.(id, (i + 1) / entries.length);
    cb.onOverall?.((i + 1) / entries.length);
    await tick();
  }
  cb.onOverall?.(1);

  const paper = IDP_PAPERS[opts.paper ?? "10x15"];
  return {
    files: outFiles,
    note: `${p.label} photo at 300 DPI · print at 100% scale (“Actual size”) for exact dimensions${opts.sheet ? ` · ${paper.label} sheet with cut guides` : ""}`,
  };
}

/* ================================================================
   DISPATCHER
   ================================================================ */

export const EXTRA_TOOL_IDS = [
  "edit-pdf",
  "sign-pdf",
  "compress-target",
  "compress-image",
  "resize-image",
  "convert-image",
  "pdf-to-png",
  "extract-images",
  "extract-text",
  "text-to-pdf",
  "redact-pdf",
  "flatten",
  "edit-metadata",
  "qr-to-pdf",
  "ocr",
  "id-photo",
] as const;

export type ExtraToolId = (typeof EXTRA_TOOL_IDS)[number];

export function isExtraTool(toolId: string): toolId is ExtraToolId {
  return (EXTRA_TOOL_IDS as readonly string[]).includes(toolId);
}

export async function runExtraTool(
  toolId: string,
  entries: { id: string; file: File }[],
  opts: any,
  cb: RunCallbacks
): Promise<EngineResult> {
  switch (toolId) {
    case "compress-target":
      return runCompressTarget(entries, opts, cb);
    case "compress-image":
      return runImageTool("compress-image", entries, opts, cb);
    case "resize-image":
      return runImageTool("resize-image", entries, opts, cb);
    case "convert-image":
      return runImageTool("convert-image", entries, opts, cb);
    case "pdf-to-png":
      return runPdfToPng(entries, opts, cb);
    case "extract-images":
      return runExtractImages(entries, opts, cb);
    case "extract-text":
      return runExtractText(entries, opts, cb);
    case "text-to-pdf":
      return runTextToPdf(entries, opts, cb);
    case "edit-pdf":
      return runApplyAnnotations(entries, opts, cb, "edit");
    case "sign-pdf":
      return runApplyAnnotations(entries, opts, cb, "sign");
    case "redact-pdf":
      return runRedact(entries, opts, cb);
    case "flatten":
      return runFlatten(entries, opts, cb);
    case "edit-metadata":
      return runEditMetadata(entries, opts, cb);
    case "qr-to-pdf":
      return runQrToPdf(entries, opts, cb);
    case "ocr":
      return runOcr(entries, opts, cb);
    case "id-photo":
      return runIdPhoto(entries, opts, cb);
    default:
      throw new Error("Unknown tool");
  }
}
