/**
 * SwiftPDF Engine — 100% client-side PDF processing.
 * No file ever leaves the device. All heavy libs are lazy-loaded.
 */

export interface RunCallbacks {
  onOverall?: (p: number) => void;
  onFileProgress?: (fileKey: string, p: number) => void;
  onStatus?: (msg: string) => void;
}

export interface EngineResult {
  files: { name: string; blob: Blob; size: number; kind: string }[];
  note?: string;
}

const tick = () => new Promise((r) => setTimeout(r, 0));

/* ---------- lazy loaders ---------- */

async function getPdfjs() {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  return pdfjs;
}

async function getPdfLib() {
  return await import("pdf-lib");
}

async function getCantoo() {
  return await import("@cantoo/pdf-lib");
}

/* ---------- shared helpers ---------- */

async function fileToBytes(file: File): Promise<Uint8Array> {
  const buf = await file.arrayBuffer();
  return new Uint8Array(buf);
}

/** Render one pdf.js page to a canvas */
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

async function loadWithPdfLib(bytes: Uint8Array) {
  const { PDFDocument } = await getPdfLib();
  return PDFDocument.load(bytes, { ignoreEncryption: true });
}

function padNum(n: number, width: number): string {
  return String(n).padStart(width, "0");
}

/* ================================================================
   TOOL IMPLEMENTATIONS
   ================================================================ */

/* ---------------- MERGE ---------------- */

async function runMerge(
  entries: { id: string; file: File }[],
  cb: RunCallbacks
): Promise<EngineResult> {
  const { PDFDocument } = await getPdfLib();
  const out = await PDFDocument.create();
  for (let i = 0; i < entries.length; i++) {
    const bytes = await fileToBytes(entries[i].file);
    let src;
    try {
      src = await loadWithPdfLib(bytes);
    } catch {
      throw new Error(
        `"${entries[i].file.name}" could not be read. If it is password-protected, unlock it first.`
      );
    }
    const pages = await out.copyPages(src, src.getPageIndices());
    for (const p of pages) out.addPage(p);
    cb.onFileProgress?.(entries[i].id, 1);
    cb.onOverall?.((i + 1) / entries.length);
    await tick();
  }
  const blob = new Blob([await out.save()], { type: "application/pdf" });
  return {
    files: [{ name: "merged.pdf", blob, size: blob.size, kind: "PDF" }],
    note: `${entries.length} PDFs combined`,
  };
}

/* ---------------- SPLIT ---------------- */

export interface SplitOptions {
  mode: "ranges" | "fixed" | "extract";
  ranges: string;
  everyN: number;
  selectedPages: number[];
}

function parseRangesStrict(spec: string, total: number): number[][] {
  const groups: number[][] = [];
  const parts = spec
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!parts.length) throw new Error("Enter at least one page range");
  for (const part of parts) {
    const m = part.match(/^(\d+)\s*-\s*(\d+)$/);
    if (m) {
      let a = parseInt(m[1], 10);
      let b = parseInt(m[2], 10);
      if (a > b) [a, b] = [b, a];
      if (a < 1 || b > total)
        throw new Error(`Range "${part}" is outside 1–${total}`);
      const g: number[] = [];
      for (let i = a; i <= b; i++) g.push(i - 1);
      groups.push(g);
    } else if (/^\d+$/.test(part)) {
      const n = parseInt(part, 10);
      if (n < 1 || n > total)
        throw new Error(`Page ${n} is outside 1–${total}`);
      groups.push([n - 1]);
    } else {
      throw new Error(`"${part}" is not a valid page or range`);
    }
  }
  return groups;
}

async function runSplit(
  entries: { id: string; file: File }[],
  opts: SplitOptions,
  cb: RunCallbacks
): Promise<EngineResult> {
  const { PDFDocument } = await getPdfLib();
  const bytes = await fileToBytes(entries[0].file);
  const src = await loadWithPdfLib(bytes);
  const total = src.getPageCount();
  const base = entries[0].file.name.replace(/\.pdf$/i, "");

  let groups: number[][] = [];
  if (opts.mode === "ranges") {
    groups = parseRangesStrict(opts.ranges, total);
  } else if (opts.mode === "fixed") {
    const n = Math.max(1, Math.floor(opts.everyN || 1));
    for (let i = 0; i < total; i += n) {
      const g: number[] = [];
      for (let j = i; j < Math.min(i + n, total); j++) g.push(j);
      groups.push(g);
    }
  } else {
    const sel = [...new Set(opts.selectedPages)].sort((a, b) => a - b);
    if (!sel.length) throw new Error("Select at least one page below");
    groups = [sel.map((p) => p - 1)];
  }

  const outFiles: EngineResult["files"] = [];
  const many = groups.length > 1;
  const pad = String(groups.length).length;

  for (let gi = 0; gi < groups.length; gi++) {
    const out = await PDFDocument.create();
    const pages = await out.copyPages(src, groups[gi]);
    for (const p of pages) out.addPage(p);
    const blob = new Blob([await out.save()], { type: "application/pdf" });
    const label = many
      ? `${base}-part${padNum(gi + 1, pad)}.pdf`
      : `${base}-${groups[gi].length}pages.pdf`;
    outFiles.push({ name: label, blob, size: blob.size, kind: "PDF" });
    cb.onOverall?.((gi + 1) / groups.length);
    await tick();
  }
  return { files: outFiles, note: `${groups.length} file(s) created` };
}

/* ---------------- COMPRESS ---------------- */

export interface CompressOptions {
  level: "low" | "medium" | "high";
}

async function runCompress(
  entries: { id: string; file: File }[],
  opts: CompressOptions,
  cb: RunCallbacks
): Promise<EngineResult> {
  const settings =
    opts.level === "high"
      ? { scale: 2.0, quality: 0.92 }
      : opts.level === "medium"
        ? { scale: 1.5, quality: 0.8 }
        : { scale: 1.1, quality: 0.62 };

  const outFiles: EngineResult["files"] = [];
  let totalIn = 0;
  let totalOut = 0;

  for (let i = 0; i < entries.length; i++) {
    const { id, file } = entries[i];
    totalIn += file.size;
    const bytes = await fileToBytes(file);
    cb.onStatus?.(`Optimizing ${file.name}`);

    // Strategy A — structural re-save (keeps text sharp)
    let aSize = Infinity;
    let aBytes: Uint8Array | null = null;
    try {
      const docA = await loadWithPdfLib(bytes);
      aBytes = await docA.save({ useObjectStreams: true });
      aSize = aBytes.length;
    } catch {
      /* ignore */
    }

    // Strategy B — rasterize pages (great for scans)
    let bSize = Infinity;
    let bBlob: Blob | null = null;
    try {
      const doc = await openWithPdfjs(bytes);
      const { PDFDocument } = await getPdfLib();
      const out = await PDFDocument.create();
      const n = doc.numPages;
      for (let p = 1; p <= n; p++) {
        const canvas = await renderPageToCanvas(doc, p, settings.scale);
        const jpg = await canvasToBlob(canvas, "image/jpeg", settings.quality);
        const img = await out.embedJpg(new Uint8Array(await jpg.arrayBuffer()));
        const page = out.addPage([img.width, img.height]);
        page.drawImage(img, {
          x: 0,
          y: 0,
          width: img.width,
          height: img.height,
        });
        cb.onFileProgress?.(id, (p / n) * 0.9);
        await tick();
      }
      const saved = await out.save({ useObjectStreams: true });
      bBlob = new Blob([saved], { type: "application/pdf" });
      bSize = saved.length;
    } catch {
      /* ignore */
    }

    let outBlob: Blob;
    if (aSize <= bSize && aBytes) {
      outBlob = new Blob([aBytes], { type: "application/pdf" });
    } else if (bBlob) {
      outBlob = bBlob;
    } else if (aBytes) {
      outBlob = new Blob([aBytes], { type: "application/pdf" });
    } else {
      throw new Error(`"${file.name}" could not be compressed`);
    }
    totalOut += outBlob.size;
    outFiles.push({
      name: `${file.name.replace(/\.pdf$/i, "")}-compressed.pdf`,
      blob: outBlob,
      size: outBlob.size,
      kind: "PDF",
    });
    cb.onFileProgress?.(id, 1);
    cb.onOverall?.((i + 1) / entries.length);
  }

  const note =
    totalOut < totalIn
      ? `Saved ${Math.max(1, Math.round((1 - totalOut / totalIn) * 100))}% of size`
      : "Already optimized — kept the smaller re-save";
  return { files: outFiles, note };
}

/* ---------------- ORGANIZE ---------------- */

export interface OrganizeOptions {
  /** page order (1-based original numbers) after user edits */
  order: number[];
  /** extra rotation per original page number */
  rotations: Record<number, number>;
}

async function runOrganize(
  entries: { id: string; file: File }[],
  opts: OrganizeOptions,
  cb: RunCallbacks
): Promise<EngineResult> {
  const { PDFDocument, degrees } = await getPdfLib();
  const bytes = await fileToBytes(entries[0].file);
  const src = await loadWithPdfLib(bytes);
  if (!opts.order.length) throw new Error("Keep at least one page");

  const out = await PDFDocument.create();
  const total = opts.order.length;
  for (let i = 0; i < total; i++) {
    const original1based = opts.order[i];
    const [copied] = await out.copyPages(src, [original1based - 1]);
    const extra = opts.rotations[original1based] ?? 0;
    if (extra) {
      const cur = copied.getRotation().angle;
      copied.setRotation(degrees((cur + extra) % 360));
    }
    out.addPage(copied);
    cb.onOverall?.((i + 1) / total);
    if (i % 4 === 0) await tick();
  }
  const blob = new Blob([await out.save()], { type: "application/pdf" });
  return {
    files: [
      {
        name: `${entries[0].file.name.replace(/\.pdf$/i, "")}-organized.pdf`,
        blob,
        size: blob.size,
        kind: "PDF",
      },
    ],
    note: `${total} page${total === 1 ? "" : "s"} kept`,
  };
}

/* ---------------- ROTATE ---------------- */

export interface RotateOptions {
  angle: 90 | 180 | 270;
}

async function runRotate(
  entries: { id: string; file: File }[],
  opts: RotateOptions,
  cb: RunCallbacks
): Promise<EngineResult> {
  const { PDFDocument, degrees } = await getPdfLib();
  const outFiles: EngineResult["files"] = [];
  for (let i = 0; i < entries.length; i++) {
    const bytes = await fileToBytes(entries[i].file);
    const doc = await loadWithPdfLib(bytes);
    for (const page of doc.getPages()) {
      const cur = page.getRotation().angle;
      page.setRotation(degrees((cur + opts.angle) % 360));
    }
    const blob = new Blob([await doc.save()], { type: "application/pdf" });
    outFiles.push({
      name: `${entries[i].file.name.replace(/\.pdf$/i, "")}-rotated.pdf`,
      blob,
      size: blob.size,
      kind: "PDF",
    });
    cb.onFileProgress?.(entries[i].id, 1);
    cb.onOverall?.((i + 1) / entries.length);
    await tick();
  }
  return { files: outFiles, note: `Rotated ${opts.angle}°` };
}

/* ---------------- PDF → JPG ---------------- */

export interface PdfToJpgOptions {
  scale: 1 | 2 | 3;
}

async function runPdfToJpg(
  entries: { id: string; file: File }[],
  opts: PdfToJpgOptions,
  cb: RunCallbacks
): Promise<EngineResult> {
  const outFiles: EngineResult["files"] = [];
  let pageCount = 0;

  for (let i = 0; i < entries.length; i++) {
    const bytes = await fileToBytes(entries[i].file);
    const doc = await openWithPdfjs(bytes);
    const n = doc.numPages;
    const base = entries[i].file.name.replace(/\.pdf$/i, "");
    const pad = String(n).length;
    for (let p = 1; p <= n; p++) {
      const canvas = await renderPageToCanvas(doc, p, opts.scale);
      const blob = await canvasToBlob(canvas, "image/jpeg", 0.92);
      outFiles.push({
        name: `${base}-p${padNum(p, pad)}.jpg`,
        blob,
        size: blob.size,
        kind: "JPG",
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
  return { files: outFiles, note: `${pageCount} image(s) rendered` };
}

/* ---------------- JPG → PDF ---------------- */

export interface JpgToPdfOptions {
  pageSize: "fit" | "a4" | "letter";
  margin: number; // pt
  orientation: "auto" | "portrait" | "landscape";
}

async function runJpgToPdf(
  entries: { id: string; file: File }[],
  opts: JpgToPdfOptions,
  cb: RunCallbacks
): Promise<EngineResult> {
  const { PDFDocument } = await getPdfLib();
  const out = await PDFDocument.create();
  const A4 = { w: 595.28, h: 841.89 };
  const LETTER = { w: 612, h: 792 };

  for (let i = 0; i < entries.length; i++) {
    const bytes = new Uint8Array(await entries[i].file.arrayBuffer());
    let img;
    try {
      img = await out.embedJpg(bytes);
    } catch {
      img = await out.embedPng(bytes);
    }

    let pageW: number;
    let pageH: number;
    if (opts.pageSize === "fit") {
      pageW = img.width + opts.margin * 2;
      pageH = img.height + opts.margin * 2;
    } else {
      const std = opts.pageSize === "a4" ? A4 : LETTER;
      const landscape =
        opts.orientation === "landscape" ||
        (opts.orientation === "auto" && img.width > img.height);
      pageW = landscape ? std.h : std.w;
      pageH = landscape ? std.w : std.h;
    }
    const page = out.addPage([pageW, pageH]);
    const maxW = pageW - opts.margin * 2;
    const maxH = pageH - opts.margin * 2;
    const ratio = Math.min(maxW / img.width, maxH / img.height);
    const w = img.width * ratio;
    const h = img.height * ratio;
    page.drawImage(img, {
      x: (pageW - w) / 2,
      y: (pageH - h) / 2,
      width: w,
      height: h,
    });
    cb.onFileProgress?.(entries[i].id, 1);
    cb.onOverall?.((i + 1) / entries.length);
    await tick();
  }
  const blob = new Blob([await out.save()], { type: "application/pdf" });
  return {
    files: [
      {
        name:
          entries.length === 1
            ? `${entries[0].file.name.replace(/\.(jpg|jpeg|png)$/i, "")}.pdf`
            : "images.pdf",
        blob,
        size: blob.size,
        kind: "PDF",
      },
    ],
    note: `${entries.length} image(s) placed`,
  };
}

/* ---------------- PDF → WORD ---------------- */

async function runPdfToWord(
  entries: { id: string; file: File }[],
  _opts: Record<string, never>,
  cb: RunCallbacks
): Promise<EngineResult> {
  const { Document, Packer, Paragraph, TextRun, HeadingLevel } = await import(
    "docx"
  );
  const outFiles: EngineResult["files"] = [];

  for (let i = 0; i < entries.length; i++) {
    const bytes = await fileToBytes(entries[i].file);
    const doc = await openWithPdfjs(bytes);
    const n = doc.numPages;
    const children: any[] = [];

    for (let p = 1; p <= n; p++) {
      const page = await doc.getPage(p);
      const tc = await page.getTextContent();
      const lines: {
        y: number;
        items: { x: number; str: string; bold: boolean; size: number }[];
      }[] = [];
      for (const item of tc.items as any[]) {
        if (!item.str || !item.str.trim()) continue;
        const x = item.transform[4];
        const y = item.transform[5];
        const size = Math.hypot(item.transform[0], item.transform[1]) || 12;
        const bold = /bold|black|heavy/i.test(String(item.fontName || ""));
        let line = lines.find((l) => Math.abs(l.y - y) < size * 0.6);
        if (!line) {
          line = { y, items: [] };
          lines.push(line);
        }
        line.items.push({ x, str: item.str, bold, size });
      }
      lines.sort((a, b) => b.y - a.y);

      if (p > 1) children.push(new Paragraph({ text: "" }));
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
        if (!text.trim()) continue;
        const maxSize = Math.max(...line.items.map((s) => s.size));
        const allBold = line.items.every((s) => s.bold);
        if (allBold && maxSize > 13) {
          children.push(
            new Paragraph({
              heading:
                maxSize > 17 ? HeadingLevel.HEADING_1 : HeadingLevel.HEADING_2,
              children: [new TextRun({ text, bold: true })],
            })
          );
        } else {
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text,
                  size: Math.max(16, Math.round(maxSize * 2 * 0.75)),
                  bold: allBold,
                }),
              ],
            })
          );
        }
      }
      cb.onStatus?.(`Extracting page ${p}/${n}`);
      cb.onFileProgress?.(entries[i].id, p / n);
      cb.onOverall?.(((i + p / n) / entries.length) * 0.92);
      await tick();
    }

    const docxDoc = new Document({ sections: [{ children }] });
    const blob = await Packer.toBlob(docxDoc);
    outFiles.push({
      name: `${entries[i].file.name.replace(/\.pdf$/i, "")}.docx`,
      blob,
      size: blob.size,
      kind: "DOCX",
    });
    cb.onFileProgress?.(entries[i].id, 1);
  }
  cb.onOverall?.(1);
  return {
    files: outFiles,
    note: "Text layer extracted — scanned PDFs have no text layer",
  };
}

/* ---------------- PDF → EXCEL ---------------- */

async function runPdfToExcel(
  entries: { id: string; file: File }[],
  _opts: Record<string, never>,
  cb: RunCallbacks
): Promise<EngineResult> {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();

  for (let i = 0; i < entries.length; i++) {
    const bytes = await fileToBytes(entries[i].file);
    const doc = await openWithPdfjs(bytes);
    const n = doc.numPages;
    const rows: (string | number)[][] = [];

    for (let p = 1; p <= n; p++) {
      const page = await doc.getPage(p);
      const tc = await page.getTextContent();
      const lines: { y: number; cells: { x: number; str: string }[] }[] = [];
      for (const item of tc.items as any[]) {
        if (!item.str || !item.str.trim()) continue;
        const x = item.transform[4];
        const y = item.transform[5];
        const size = Math.hypot(item.transform[0], item.transform[1]) || 12;
        let line = lines.find((l) => Math.abs(l.y - y) < size * 0.5);
        if (!line) {
          line = { y, cells: [] };
          lines.push(line);
        }
        line.cells.push({ x, str: item.str });
      }
      lines.sort((a, b) => b.y - a.y);
      rows.push([`--- Page ${p} ---`]);
      for (const line of lines) {
        line.cells.sort((a, b) => a.x - b.x);
        const cells: string[] = [];
        let prevEnd: number | null = null;
        let cur = "";
        for (const c of line.cells) {
          if (prevEnd !== null && c.x - prevEnd > 14) {
            cells.push(cur.trim());
            cur = "";
          } else if (cur) {
            cur += " ";
          }
          cur += c.str;
          prevEnd = c.x + c.str.length * 4;
        }
        if (cur.trim()) cells.push(cur.trim());
        rows.push(cells.length ? cells : [""]);
      }
      cb.onStatus?.(`Page ${p}/${n}`);
      cb.onFileProgress?.(entries[i].id, p / n);
      cb.onOverall?.(((i + p / n) / entries.length) * 0.92);
      await tick();
    }

    const sheetName = `P${i + 1}-${entries[i].file.name
      .replace(/\.pdf$/i, "")
      .slice(0, 20)}`.replace(/[\\/?*[\]:]/g, "_");
    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
    cb.onFileProgress?.(entries[i].id, 1);
  }

  const data = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([data], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const name =
    entries.length === 1
      ? `${entries[0].file.name.replace(/\.pdf$/i, "")}.xlsx`
      : "tables.xlsx";
  cb.onOverall?.(1);
  return {
    files: [{ name, blob, size: blob.size, kind: "XLSX" }],
    note: "One row per text line — columns split by spacing",
  };
}

/* ---------------- PDF → PPT ---------------- */

async function runPdfToPpt(
  entries: { id: string; file: File }[],
  _opts: Record<string, never>,
  cb: RunCallbacks
): Promise<EngineResult> {
  const PptxGenJS = (await import("pptxgenjs")).default;
  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: "WIDE", width: 13.333, height: 7.5 });
  pptx.layout = "WIDE";

  let pageCount = 0;
  let totalPages = 0;
  const docs: any[] = [];
  for (const e of entries) {
    const bytes = await fileToBytes(e.file);
    const doc = await openWithPdfjs(bytes);
    docs.push(doc);
    totalPages += doc.numPages;
  }

  for (let i = 0; i < docs.length; i++) {
    const doc = docs[i];
    const n = doc.numPages;
    for (let p = 1; p <= n; p++) {
      const canvas = await renderPageToCanvas(doc, p, 2);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
      const slide = pptx.addSlide();
      const iw = canvas.width;
      const ih = canvas.height;
      const ratio = Math.min(13.333 / iw, 7.5 / ih);
      const w = iw * ratio;
      const h = ih * ratio;
      slide.addImage({
        data: dataUrl,
        x: (13.333 - w) / 2,
        y: (7.5 - h) / 2,
        w,
        h,
      });
      pageCount++;
      cb.onStatus?.(`Building slide ${pageCount}/${totalPages}`);
      cb.onFileProgress?.(entries[i].id, p / n);
      cb.onOverall?.(0.95 * (pageCount / totalPages));
      await tick();
    }
    cb.onFileProgress?.(entries[i].id, 1);
  }
  const blob = (await pptx.write({ outputType: "blob" })) as Blob;
  const name =
    entries.length === 1
      ? `${entries[0].file.name.replace(/\.pdf$/i, "")}.pptx`
      : "slides.pptx";
  cb.onOverall?.(1);
  return {
    files: [{ name, blob, size: blob.size, kind: "PPTX" }],
    note: `${pageCount} slide(s) — pages become slide images`,
  };
}

/* ---------------- WORD → PDF ---------------- */

export interface WordToPdfOptions {
  pageSize: "a4" | "letter";
}

async function runWordToPdf(
  entries: { id: string; file: File }[],
  opts: WordToPdfOptions,
  cb: RunCallbacks
): Promise<EngineResult> {
  const mammoth = await import("mammoth");
  const { jsPDF } = await import("jspdf");
  const outFiles: EngineResult["files"] = [];
  const pageW = opts.pageSize === "a4" ? 595.28 : 612;
  const pageH = opts.pageSize === "a4" ? 841.89 : 792;
  const M = 56;

  for (let i = 0; i < entries.length; i++) {
    const buf = await entries[i].file.arrayBuffer();
    const { value: html } = await mammoth.convertToHtml({ arrayBuffer: buf });
    const dom = new DOMParser().parseFromString(html, "text/html");
    const pdf = new jsPDF({ unit: "pt", format: [pageW, pageH] });
    let y = M;

    const writeBlock = (
      text: string,
      size: number,
      bold: boolean,
      gapAfter: number
    ) => {
      const clean = text.replace(/\s+/g, " ").trim();
      if (!clean) return;
      pdf.setFont("helvetica", bold ? "bold" : "normal");
      pdf.setFontSize(size);
      const lines = pdf.splitTextToSize(clean, pageW - M * 2) as string[];
      for (const ln of lines) {
        if (y > pageH - M) {
          pdf.addPage();
          y = M;
        }
        pdf.text(ln, M, y);
        y += size * 1.4;
      }
      y += gapAfter;
    };

    const walk = (node: Element) => {
      for (const el of Array.from(node.children)) {
        const tag = el.tagName.toLowerCase();
        const text = el.textContent ?? "";
        if (/^h[1-6]$/.test(tag)) {
          const size = [20, 17, 15, 13.5, 12.5, 12][parseInt(tag[1], 10) - 1];
          writeBlock(text, size, true, 6);
        } else if (tag === "li") {
          writeBlock(`•  ${text}`, 11, false, 2);
        } else if (tag === "table") {
          const rows = Array.from(el.querySelectorAll("tr"));
          for (const tr of rows) {
            const cells = Array.from(tr.querySelectorAll("th,td")).map(
              (c) => (c.textContent ?? "").trim()
            );
            writeBlock(
              cells.join("    |    "),
              10,
              tr.querySelector("th") !== null,
              2
            );
          }
          y += 6;
        } else if (el.children.length) {
          walk(el);
        } else {
          writeBlock(text, 11, false, 8);
        }
      }
    };
    walk(dom.body);

    const blob = pdf.output("blob");
    outFiles.push({
      name: `${entries[i].file.name.replace(/\.docx$/i, "")}.pdf`,
      blob,
      size: blob.size,
      kind: "PDF",
    });
    cb.onFileProgress?.(entries[i].id, 1);
    cb.onOverall?.((i + 1) / entries.length);
  }
  return {
    files: outFiles,
    note: "Text & structure kept — complex layout simplified",
  };
}

/* ---------------- WATERMARK ---------------- */

export interface WatermarkOptions {
  text: string;
  fontSize: number;
  color: string; // hex
  opacity: number; // 0..1
  rotation: number;
  position: "center" | "diagonal" | "tile" | "footer" | "header";
  bold: boolean;
}

function hexToRgb01(hex: string): [number, number, number] {
  const m = hex.replace("#", "");
  const r = parseInt(m.slice(0, 2), 16) / 255;
  const g = parseInt(m.slice(2, 4), 16) / 255;
  const b = parseInt(m.slice(4, 6), 16) / 255;
  return [r, g, b];
}

async function runWatermark(
  entries: { id: string; file: File }[],
  opts: WatermarkOptions,
  cb: RunCallbacks
): Promise<EngineResult> {
  const { PDFDocument, degrees, rgb, StandardFonts } = await getPdfLib();
  if (!opts.text.trim()) throw new Error("Enter watermark text");
  const holder = await PDFDocument.create();
  const font = opts.bold
    ? await holder.embedFont(StandardFonts.HelveticaBold)
    : await holder.embedFont(StandardFonts.Helvetica);
  const [r, g, b] = hexToRgb01(opts.color);

  const outFiles: EngineResult["files"] = [];
  for (let i = 0; i < entries.length; i++) {
    const bytes = await fileToBytes(entries[i].file);
    const doc = await loadWithPdfLib(bytes);
    const pages = doc.getPages();
    for (const page of pages) {
      const { width, height } = page.getSize();
      const tw = font.widthOfTextAtSize(opts.text, opts.fontSize);
      const draw = (x: number, y: number, rot: number) => {
        page.drawText(opts.text, {
          x,
          y,
          size: opts.fontSize,
          font,
          color: rgb(r, g, b),
          opacity: opts.opacity,
          rotate: degrees(rot),
        });
      };
      switch (opts.position) {
        case "center":
          draw((width - tw) / 2, height / 2 - opts.fontSize / 2, 0);
          break;
        case "diagonal":
          draw((width - tw) / 2 - width * 0.1, height * 0.35, opts.rotation);
          break;
        case "tile": {
          const stepX = Math.max(40, tw + width * 0.08);
          const stepY = Math.max(30, opts.fontSize * 5);
          for (let y = 0; y < height + stepY; y += stepY) {
            for (let x = -tw; x < width + stepX; x += stepX) {
              draw(x, y, opts.rotation);
            }
          }
          break;
        }
        case "footer":
          draw((width - tw) / 2, opts.fontSize * 1.2, 0);
          break;
        case "header":
          draw((width - tw) / 2, height - opts.fontSize * 2, 0);
          break;
      }
    }
    const blob = new Blob([await doc.save()], { type: "application/pdf" });
    outFiles.push({
      name: `${entries[i].file.name.replace(/\.pdf$/i, "")}-watermarked.pdf`,
      blob,
      size: blob.size,
      kind: "PDF",
    });
    cb.onFileProgress?.(entries[i].id, 1);
    cb.onOverall?.((i + 1) / entries.length);
    await tick();
  }
  return { files: outFiles, note: `"${opts.text}" stamped on every page` };
}

/* ---------------- PAGE NUMBERS ---------------- */

export interface PageNumberOptions {
  format: "n" | "page_n" | "n_of_total";
  position:
    | "bottom-center"
    | "bottom-right"
    | "bottom-left"
    | "top-center"
    | "top-right"
    | "top-left";
  startAt: number;
  fontSize: number;
  skipFirst: boolean;
}

async function runPageNumbers(
  entries: { id: string; file: File }[],
  opts: PageNumberOptions,
  cb: RunCallbacks
): Promise<EngineResult> {
  const { PDFDocument, StandardFonts } = await getPdfLib();
  const outFiles: EngineResult["files"] = [];

  for (let i = 0; i < entries.length; i++) {
    const bytes = await fileToBytes(entries[i].file);
    const doc = await loadWithPdfLib(bytes);
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const pages = doc.getPages();
    const total = pages.length;
    const showFrom = opts.skipFirst ? 2 : 1;

    for (let p = 1; p <= total; p++) {
      if (p < showFrom) continue;
      const num = opts.startAt + p - 1;
      const label =
        opts.format === "n"
          ? `${num}`
          : opts.format === "page_n"
            ? `Page ${num}`
            : `${num} / ${opts.startAt + total - 1}`;
      const page = pages[p - 1];
      const { width, height } = page.getSize();
      const tw = font.widthOfTextAtSize(label, opts.fontSize);
      const M = 28;
      let x = (width - tw) / 2;
      let y = M;
      if (opts.position.endsWith("right")) x = width - M - tw;
      if (opts.position.endsWith("left")) x = M;
      if (opts.position.startsWith("top")) y = height - M - opts.fontSize;
      page.drawText(label, { x, y, size: opts.fontSize, font });
    }
    const blob = new Blob([await doc.save()], { type: "application/pdf" });
    outFiles.push({
      name: `${entries[i].file.name.replace(/\.pdf$/i, "")}-numbered.pdf`,
      blob,
      size: blob.size,
      kind: "PDF",
    });
    cb.onFileProgress?.(entries[i].id, 1);
    cb.onOverall?.((i + 1) / entries.length);
    await tick();
  }
  return { files: outFiles, note: "Numbers placed" };
}

/* ---------------- CROP ---------------- */

export interface CropOptions {
  top: number; // %
  right: number;
  bottom: number;
  left: number;
}

async function runCrop(
  entries: { id: string; file: File }[],
  opts: CropOptions,
  cb: RunCallbacks
): Promise<EngineResult> {
  const { PDFDocument } = await getPdfLib();
  const outFiles: EngineResult["files"] = [];
  const clamp = (v: number) => Math.max(0, Math.min(45, v)) / 100;
  const t = clamp(opts.top);
  const rr = clamp(opts.right);
  const b = clamp(opts.bottom);
  const l = clamp(opts.left);

  for (let i = 0; i < entries.length; i++) {
    const bytes = await fileToBytes(entries[i].file);
    const doc = await loadWithPdfLib(bytes);
    for (const page of doc.getPages()) {
      const { width, height } = page.getSize();
      const newW = width * (1 - rr - l);
      const newH = height * (1 - t - b);
      page.setCropBox(width * l, height * b, newW, newH);
    }
    const blob = new Blob([await doc.save()], { type: "application/pdf" });
    outFiles.push({
      name: `${entries[i].file.name.replace(/\.pdf$/i, "")}-cropped.pdf`,
      blob,
      size: blob.size,
      kind: "PDF",
    });
    cb.onFileProgress?.(entries[i].id, 1);
    cb.onOverall?.((i + 1) / entries.length);
    await tick();
  }
  return { files: outFiles, note: "Crop box applied to all pages" };
}

/* ---------------- PROTECT ---------------- */

export interface ProtectOptions {
  password: string;
  confirm: string;
}

async function runProtect(
  entries: { id: string; file: File }[],
  opts: ProtectOptions,
  cb: RunCallbacks
): Promise<EngineResult> {
  if (!opts.password || opts.password.length < 4)
    throw new Error("Use a password of at least 4 characters");
  if (opts.password !== opts.confirm) throw new Error("Passwords do not match");

  const Cantoo = await getCantoo();
  const outFiles: EngineResult["files"] = [];

  for (let i = 0; i < entries.length; i++) {
    const bytes = await fileToBytes(entries[i].file);
    const doc = await Cantoo.PDFDocument.load(bytes, {
      ignoreEncryption: true,
    });
    const anyDoc = doc as any;
    if (typeof anyDoc.encrypt !== "function") {
      throw new Error("Encryption engine unavailable in this browser");
    }
    anyDoc.encrypt({
      userPassword: opts.password,
      ownerPassword: opts.password,
      permissions: {
        printing: "highResolution",
        modifying: false,
        copying: false,
        annotating: false,
        fillingForms: true,
        contentAccessibility: true,
        documentAssembly: false,
      },
    });
    const saved = await doc.save();
    const blob = new Blob([saved], { type: "application/pdf" });
    outFiles.push({
      name: `${entries[i].file.name.replace(/\.pdf$/i, "")}-protected.pdf`,
      blob,
      size: blob.size,
      kind: "PDF",
    });
    cb.onFileProgress?.(entries[i].id, 1);
    cb.onOverall?.((i + 1) / entries.length);
    await tick();
  }
  return {
    files: outFiles,
    note: "Password set — keep it safe, it cannot be recovered",
  };
}

/* ---------------- UNLOCK ---------------- */

export interface UnlockOptions {
  password: string;
}

async function runUnlock(
  entries: { id: string; file: File }[],
  opts: UnlockOptions,
  cb: RunCallbacks
): Promise<EngineResult> {
  const Cantoo = await getCantoo();
  const outFiles: EngineResult["files"] = [];

  for (let i = 0; i < entries.length; i++) {
    const bytes = await fileToBytes(entries[i].file);
    let doc;
    try {
      doc = await Cantoo.PDFDocument.load(bytes, {
        password: opts.password,
        throwOnInvalidObject: false,
      });
    } catch {
      throw new Error(
        "Wrong password, or the file is not an encrypted PDF we can open"
      );
    }
    const saved = await doc.save({ ignoreEncryption: false });
    const blob = new Blob([saved], { type: "application/pdf" });
    outFiles.push({
      name: `${entries[i].file.name.replace(/\.pdf$/i, "")}-unlocked.pdf`,
      blob,
      size: blob.size,
      kind: "PDF",
    });
    cb.onFileProgress?.(entries[i].id, 1);
    cb.onOverall?.((i + 1) / entries.length);
    await tick();
  }
  return { files: outFiles, note: "Password removed from the saved copy" };
}

/* ================================================================
   DISPATCHER
   ================================================================ */

export async function runTool(
  toolId: string,
  entries: { id: string; file: File }[],
  opts: any,
  cb: RunCallbacks
): Promise<EngineResult> {
  switch (toolId) {
    case "merge":
      return runMerge(entries, cb);
    case "split":
      return runSplit(entries, opts, cb);
    case "compress":
      return runCompress(entries, opts, cb);
    case "organize":
      return runOrganize(entries, opts, cb);
    case "rotate":
      return runRotate(entries, opts, cb);
    case "pdf-to-jpg":
      return runPdfToJpg(entries, opts, cb);
    case "jpg-to-pdf":
      return runJpgToPdf(entries, opts, cb);
    case "pdf-to-word":
      return runPdfToWord(entries, opts, cb);
    case "pdf-to-excel":
      return runPdfToExcel(entries, opts, cb);
    case "pdf-to-ppt":
      return runPdfToPpt(entries, opts, cb);
    case "word-to-pdf":
      return runWordToPdf(entries, opts, cb);
    case "watermark":
      return runWatermark(entries, opts, cb);
    case "page-numbers":
      return runPageNumbers(entries, opts, cb);
    case "crop":
      return runCrop(entries, opts, cb);
    case "protect":
      return runProtect(entries, opts, cb);
    case "unlock":
      return runUnlock(entries, opts, cb);
    default:
      throw new Error("Unknown tool");
  }
}

/** render first page data-url for live previews */
export async function firstPagePreview(
  file: File,
  scale = 1
): Promise<{ dataUrl: string; width: number; height: number }> {
  const bytes = await fileToBytes(file);
  const doc = await openWithPdfjs(bytes);
  const canvas = await renderPageToCanvas(doc, 1, scale);
  return {
    dataUrl: canvas.toDataURL("image/png"),
    width: canvas.width,
    height: canvas.height,
  };
}

/** generate page thumbnails for a pdf file */
export async function makeThumbnails(
  file: File,
  opts: { targetWidth?: number; limit?: number } = {}
): Promise<
  { dataUrl: string; page: number; width: number; height: number }[]
> {
  const targetWidth = opts.targetWidth ?? 180;
  const limit = opts.limit ?? 200;
  const bytes = await fileToBytes(file);
  const doc = await openWithPdfjs(bytes);
  const n = Math.min(doc.numPages, limit);
  const out: {
    dataUrl: string;
    page: number;
    width: number;
    height: number;
  }[] = [];
  const first = await doc.getPage(1);
  const base = first.getViewport({ scale: 1 });
  const scale = targetWidth / base.width;
  for (let p = 1; p <= n; p++) {
    const canvas = await renderPageToCanvas(doc, p, scale);
    out.push({
      dataUrl: canvas.toDataURL("image/jpeg", 0.7),
      page: p,
      width: canvas.width,
      height: canvas.height,
    });
    if (p % 3 === 0) await tick();
  }
  return out;
}

export { parseRangesStrict };
