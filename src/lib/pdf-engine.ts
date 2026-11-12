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
  const {
    Document,
    Packer,
    Paragraph,
    TextRun,
    HeadingLevel,
    AlignmentType,
    PageBreak,
    Tab,
    TabStopType,
    LineRuleType,
  } = await import("docx");
  const outFiles: EngineResult["files"] = [];

  type Part = {
    x: number;
    y: number;
    size: number;
    w: number;
    bold: boolean;
    italic: boolean;
    str: string;
  };
  type Line = {
    y: number;
    x0: number;
    x1: number;
    size: number;
    text: string;
    parts: Part[];
    boldAll: boolean;
    bullet: boolean;
    heading: boolean;
    centered: boolean;
    rightAligned: boolean;
  };
  type RRun = {
    text: string;
    bold: boolean;
    italic: boolean;
    size: number;
    tabBefore: boolean;
  };

  const BULLET_RE =
    /^[\u2022\u25CF\u25CB\u25E6\u25AA\u25A0\u25A1\u00B7\u2023\u2043\u2013\u2014*-]\s+/;
  const clampHP = (pt: number) => Math.min(144, Math.max(16, Math.round(pt * 2)));

  /* Real bold/italic flags come from pdf.js resolved font objects — the raw
     fontName is an opaque id (g_d0_f1) for embedded subset fonts, so string
     matching alone misses most documents. */
  const fontFlags = (page: any, fontName: string) => {
    let bold = false;
    let italic = false;
    let name = String(fontName || "");
    try {
      const d = page.commonObjs?.get?.(fontName);
      if (d) {
        bold = !!d.bold;
        italic = !!d.italic;
        if (d.name) name = String(d.name);
      }
    } catch {
      /* font object not resolved yet — fall back to name matching */
    }
    const clean = name.replace(/^[A-Z]{6}\+/, "");
    if (!bold) bold = /bold|black|heavy/i.test(clean);
    if (!italic) italic = /italic|oblique/i.test(clean);
    return { bold, italic };
  };

  /* visual line: parts joined gap-aware; wide gaps (table columns) become
     tab markers so Word keeps the column rhythm */
  const buildLine = (parts: Part[]): Line => {
    parts.sort((a, b) => a.x - b.x);
    let text = "";
    let prevEnd: number | null = null;
    for (const p of parts) {
      if (prevEnd !== null) {
        const gap = p.x - prevEnd;
        if (gap > p.size * 2.5) text += "\t";
        else if (gap > Math.max(1, p.size * 0.12)) text += " ";
      }
      text += p.str;
      prevEnd = p.x + p.w;
    }
    const x0 = parts[0].x;
    const x1 = Math.max(...parts.map((p) => p.x + p.w));
    const size = Math.max(...parts.map((p) => p.size));
    const boldAll =
      parts.every((p) => p.bold) && text.replace(/\s/g, "").length >= 2;
    return {
      y: parts[0].y,
      x0,
      x1,
      size,
      text,
      parts,
      boldAll,
      bullet: BULLET_RE.test(text.trim()),
      heading: false,
      centered: false,
      rightAligned: false,
    };
  };

  const mode = (vals: number[]) => {
    const f = new Map<number, number>();
    for (const v of vals) f.set(v, (f.get(v) ?? 0) + 1);
    let best = vals[0];
    let n = 0;
    for (const [v, c] of f) if (c > n) ((n = c), (best = v));
    return best;
  };
  const median = (vals: number[]) => {
    if (!vals.length) return 0;
    const s = [...vals].sort((a, b) => a - b);
    return s[Math.floor(s.length / 2)];
  };

  const metricsFor = (lines: Line[]) => {
    const freq = new Map<number, number>();
    for (const l of lines) {
      const k = Math.round(l.size * 2) / 2;
      freq.set(k, (freq.get(k) ?? 0) + l.text.length);
    }
    let bodySize = 11;
    let n = -1;
    for (const [k, c] of freq) if (c > n) ((n = c), (bodySize = k));
    const body = lines.filter((l) => Math.abs(l.size - bodySize) <= 0.6);
    const leftMargin = body.length ? mode(body.map((l) => Math.round(l.x0))) : Math.min(...lines.map((l) => l.x0));
    const bodyRight = body.length ? median(body.map((l) => l.x1)) : Math.max(...lines.map((l) => l.x1));
    const pageRight = Math.max(...lines.map((l) => l.x1));
    return { bodySize, leftMargin, bodyRight, pageRight };
  };

  const classify = (lines: Line[], pageW: number) => {
    const m = metricsFor(lines);
    for (const l of lines) {
      const leftGap = l.x0 - m.leftMargin;
      const rightGap = m.pageRight - l.x1;
      l.centered =
        Math.abs(leftGap - rightGap) <= Math.max(6, l.size * 0.4) &&
        leftGap > l.size * 0.8 &&
        rightGap > l.size * 0.8;
      l.rightAligned =
        !l.centered &&
        rightGap <= Math.max(3, l.size) &&
        leftGap > (m.bodyRight - m.leftMargin) * 0.25;
      l.heading =
        (l.boldAll && l.size >= m.bodySize * 1.12) ||
        l.size >= m.bodySize * 1.45;
    }
    return m;
  };

  /* lightweight two-column detection: enough lines start past the middle,
     and almost nothing crosses the gutter */
  const detectColumns = (lines: Line[], pageW: number): Line[][] => {
    if (lines.length < 8) return [lines];
    const mid = lines.filter((l) => l.x0 > pageW * 0.44 && l.x0 < pageW * 0.68);
    if (mid.length < 4 || mid.length * 2 < lines.length) return [lines];
    const gutterX = Math.min(...mid.map((l) => l.x0));
    const crossing = lines.filter((l) => l.x0 < gutterX - 2 && l.x1 > gutterX + 2);
    if (crossing.length > lines.length * 0.1) return [lines];
    const left = lines.filter((l) => l.x0 < gutterX - 2);
    const right = lines.filter((l) => l.x0 >= gutterX - 2);
    if (left.length < 2 || right.length < 2) return [lines];
    return [left, right];
  };

  const canJoin = (a: Line, b: Line, m: ReturnType<typeof metricsFor>) => {
    if (a.heading || b.heading || a.centered || b.centered) return false;
    if (a.rightAligned || b.rightAligned || b.bullet) return false;
    const gap = a.y - b.y;
    const pitch = Math.max(a.size, b.size) * 1.25;
    if (gap > pitch * 1.75 || gap < pitch * 0.5) return false;
    const full = a.x1 >= m.bodyRight - Math.max(2, a.size);
    const hyph = /[-\u2010\u2011]$/.test(a.text.trimEnd());
    const lower =
      /^[a-z\u00DF-\u024F]/.test(b.text.trim()) && gap <= pitch * 1.45;
    return full || hyph || lower;
  };

  const lineRuns = (line: Line): RRun[] => {
    const runs: RRun[] = [];
    let prevEnd: number | null = null;
    for (const p of line.parts) {
      let tabBefore = false;
      if (prevEnd !== null) {
        const gap = p.x - prevEnd;
        if (gap > p.size * 2.5) tabBefore = true;
        else if (gap > Math.max(1, p.size * 0.12) && runs.length)
          runs[runs.length - 1].text += " ";
      }
      const last = runs[runs.length - 1];
      if (
        last &&
        last.bold === p.bold &&
        last.italic === p.italic &&
        Math.abs(last.size - p.size) < 0.4 &&
        !tabBefore
      )
        last.text += p.str;
      else
        runs.push({
          text: p.str,
          bold: p.bold,
          italic: p.italic,
          size: p.size,
          tabBefore,
        });
      prevEnd = p.x + p.w;
    }
    return runs;
  };

  for (let i = 0; i < entries.length; i++) {
    const bytes = await fileToBytes(entries[i].file);
    const doc = await openWithPdfjs(bytes);
    const n = doc.numPages;
    const children: any[] = [];

    /* pass 1 — visual lines for every page. Margins are measured across the
       whole document, so the extractor needs every page's lines up front. */
    const pagesLines: Line[][] = [];
    const pagesW: number[] = [];
    let pageW = 0;
    let pageH = 0;

    for (let p = 1; p <= n; p++) {
      const page = await doc.getPage(p);
      const tc = await page.getTextContent();
      try {
        await page.getOperatorList(); // resolves fonts into commonObjs
      } catch {
        /* rendering not required for text extraction */
      }
      const vp = page.getViewport({ scale: 1 });
      if (p === 1) {
        pageW = vp.width;
        pageH = vp.height;
      }
      pagesW.push(vp.width);

      const parts: Part[] = [];
      for (const item of tc.items as any[]) {
        if (!item.str || !item.str.trim()) continue;
        const size = Math.hypot(item.transform[0], item.transform[1]) || 12;
        const flags = fontFlags(page, String(item.fontName || ""));
        parts.push({
          x: item.transform[4],
          y: item.transform[5],
          size,
          w: item.width || item.str.length * size * 0.5,
          bold: flags.bold,
          italic: flags.italic,
          str: item.str,
        });
      }

      const lines: Line[] = [];
      for (const part of parts) {
        let line = lines.find(
          (l) =>
            Math.abs(l.y - part.y) < part.size * 0.55 &&
            Math.abs(l.size - part.size) < part.size * 1.5
        );
        if (!line) {
          line = buildLine([part]);
          lines.push(line);
        } else {
          line.parts.push(part);
          const rebuilt = buildLine(line.parts);
          Object.assign(line, rebuilt);
        }
      }
      lines.sort((a, b) => b.y - a.y);
      pagesLines.push(lines);

      cb.onStatus?.(`Reading page ${p}/${n}`);
      cb.onFileProgress?.(entries[i].id, (p / n) * 0.45);
      cb.onOverall?.(((i + (p / n) * 0.45) / entries.length) * 0.92);
      await tick();
    }

    /* The Word section adopts the PDF's real text margins, measured across
       every page. The old extractor hardcoded 1-inch Word margins, so the
       text area no longer matched the PDF column: every line shifted and
       wrapped at different words. With measured margins the column width
       matches and lines break exactly where the PDF breaks them. */
    const flat = pagesLines.flat();
    let pageProps: any = null;
    let pageLeftPt: number | null = null;
    if (flat.length && pageW) {
      /* left margin = text-weighted mode of line starts: each line votes
         with its character count, so a table with many short cells cannot
         outvote the body text for the margin */
      const leftSide = flat.filter((l) => l.x0 < pageW * 0.5);
      if (leftSide.length) {
        const weight = new Map<number, number>();
        for (const l of leftSide) {
          const k = Math.round(l.x0);
          weight.set(k, (weight.get(k) ?? 0) + l.text.length);
        }
        let best = Math.round(leftSide[0].x0);
        let bestW = -1;
        for (const [k, w] of weight)
          if (w > bestW || (w === bestW && k < best)) {
            best = k;
            bestW = w;
          }
        pageLeftPt = best;
      } else {
        pageLeftPt = Math.min(...flat.map((l) => l.x0));
      }
      const rightEdge = Math.max(...flat.map((l) => l.x1));
      const firstPage = pagesLines[0];
      const topLine = firstPage.length
        ? Math.max(...firstPage.map((l) => l.y + l.size))
        : pageH - 72;
      pageProps = {
        page: {
          size: { width: Math.round(pageW * 20), height: Math.round(pageH * 20) },
          margin: {
            top: Math.min(2160, Math.max(720, Math.round((pageH - topLine) * 20))),
            right: Math.min(
              2160,
              Math.max(360, Math.round((pageW - rightEdge) * 20))
            ),
            bottom: 1440,
            left: Math.min(2160, Math.max(360, Math.round(pageLeftPt * 20))),
          },
        },
      };
    }

    /* pass 2 — paragraphs, alignment and spacing per page */
    for (let p = 1; p <= n; p++) {
      const lines = pagesLines[p - 1];

      if (p > 1 && children.length)
        children.push(
          new Paragraph({ children: [new PageBreak()], spacing: { after: 0 } })
        );

      if (lines.length) {
        for (const group of detectColumns(lines, pagesW[p - 1])) {
          const m = classify(group, pageW);
          /* group lines into paragraphs */
          const paras: Line[][] = [];
          for (const line of group) {
            const cur = paras[paras.length - 1];
            if (
              cur &&
              canJoin(cur[cur.length - 1], line, m)
            )
              cur.push(line);
            else paras.push([line]);
          }

          for (const para of paras) {
            const first = para[0];
            const runs: RRun[] = [];
            for (let li = 0; li < para.length; li++) {
              if (li > 0 && !/[-\u2010\u2011]$/.test(para[li - 1].text.trimEnd()))
                runs.push({
                  text: " ",
                  bold: false,
                  italic: false,
                  size: Math.max(para[li - 1].size, para[li].size),
                  tabBefore: false,
                });
              runs.push(...lineRuns(para[li]));
            }
            /* strip a bullet marker from the first run */
            if (first.bullet && runs.length) {
              const head = runs[0];
              const stripped = head.text.replace(BULLET_RE, "");
              if (stripped !== head.text) {
                head.text = stripped;
                if (!head.text && runs.length > 1) runs.shift();
              }
            }

            const isBullet = first.bullet;
            const heading = first.heading;
            const alignment = first.centered
              ? AlignmentType.CENTER
              : first.rightAligned
              ? AlignmentType.RIGHT
              : undefined;

            /* tab stops from wide gaps (reconstructed table columns) —
               OOXML tab positions are measured from the left text margin,
               so they land at the PDF x position only when the base is the
               measured page margin (not the paragraph's own left edge) */
            const marginLeftPt = pageLeftPt ?? m.leftMargin;
            const tabs: any[] = [];
            for (const line of para) {
              let prevEnd: number | null = null;
              for (const pt of line.parts) {
                if (
                  prevEnd !== null &&
                  pt.x - prevEnd > pt.size * 2.5 &&
                  tabs.length < 6
                )
                  tabs.push({
                    type: TabStopType.LEFT,
                    position: Math.max(
                      240,
                      Math.round((pt.x - marginLeftPt) * 20)
                    ),
                  });
                prevEnd = pt.x + pt.w;
              }
            }

            /* indent: paragraph starts right of the page's text margin —
               also carries a detected second column to its own x position.
               Centered and right-aligned paragraphs are skipped: their x
               position is produced by the alignment, an indent would just
               shove them off-centre */
            const minX0 = Math.min(...para.map((l) => l.x0));
            const overhang = minX0 - marginLeftPt;
            const indent =
              !isBullet &&
              !first.centered &&
              !first.rightAligned &&
              overhang > first.size * 1.2
                ? { left: Math.min(5760, Math.max(240, Math.round(overhang * 20))) }
                : undefined;

            const docRuns = runs.map((r) =>
              Tab && r.tabBefore
                ? new TextRun({
                    children: [new Tab(), r.text] as any,
                    bold: r.bold || !!heading,
                    italics: r.italic,
                    size: clampHP(r.size),
                  })
                : new TextRun({
                    text: r.text,
                    bold: r.bold || !!heading,
                    italics: r.italic,
                    size: clampHP(r.size),
                  })
            );

            /* keep the PDF's vertical rhythm: the measured baseline pitch
               becomes an exact Word line height, so multi-line paragraphs
               fill the page the same way instead of drifting */
            const gaps: number[] = [];
            for (let li = 1; li < para.length; li++)
              gaps.push(para[li - 1].y - para[li].y);
            gaps.sort((a, b) => a - b);
            const pitch = gaps.length ? gaps[Math.floor(gaps.length / 2)] : 0;
            const spacing: any = heading
              ? { before: 240, after: 120 }
              : isBullet
              ? { after: 60 }
              : { after: 120 };
            if (pitch > first.size * 0.9 && pitch < first.size * 3.4)
              spacing.line = Math.max(120, Math.round(pitch * 20));
            if (spacing.line) spacing.lineRule = LineRuleType.AT_LEAST;

            children.push(
              new Paragraph({
                heading: heading
                  ? first.size >= m.bodySize * 1.7
                    ? HeadingLevel.HEADING_1
                    : first.size >= m.bodySize * 1.35
                    ? HeadingLevel.HEADING_2
                    : HeadingLevel.HEADING_3
                  : undefined,
                alignment,
                bullet: isBullet ? { level: 0 } : undefined,
                indent,
                tabStops: tabs.length ? tabs : undefined,
                spacing,
                children: docRuns,
              })
            );
          }
        }
      }

      cb.onStatus?.(`Building page ${p}/${n}`);
      cb.onFileProgress?.(entries[i].id, 0.45 + (0.55 * p) / n);
      cb.onOverall?.(((i + 0.45 + (0.55 * p) / n) / entries.length) * 0.92);
      await tick();
    }

    const docxDoc = new Document({
      sections: pageProps
        ? [{ properties: pageProps, children }]
        : [{ children }],
    });
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
    note: "Text extracted — scanned PDFs have no text layer; complex layouts are approximated",
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

  type RRun = { text: string; bold: boolean; italic: boolean };

  for (let i = 0; i < entries.length; i++) {
    const buf = await entries[i].file.arrayBuffer();
    /* mammoth drops direct paragraph alignment (w:jc) from its HTML output —
       surface it by stamping synthetic style names on centered/right
       paragraphs, which the style map turns into detectable classes */
    const { value: html } = await mammoth.convertToHtml(
      { arrayBuffer: buf },
      {
        styleMap: [
          "p[style-name='__mzCenter'] => p.mz-center:fresh",
          "p[style-name='__mzRight'] => p.mz-right:fresh",
        ],
        transformDocument: (document: any) => {
          const mark = (el: any) => {
            if (
              el.type === "paragraph" &&
              (el.alignment === "center" || el.alignment === "right") &&
              (!el.styleId || /normal|body/i.test(String(el.styleId)))
            ) {
              el.styleName =
                el.alignment === "center" ? "__mzCenter" : "__mzRight";
              el.styleId = undefined;
            }
            (el.children ?? []).forEach(mark);
          };
          mark(document);
          return document;
        },
      }
    );
    const dom = new DOMParser().parseFromString(html, "text/html");
    const pdf = new jsPDF({ unit: "pt", format: [pageW, pageH] });
    let y = M;

    const alignOf = (el: Element): "left" | "center" | "right" => {
      const cls = el.getAttribute("class") ?? "";
      if (cls.includes("mz-center")) return "center";
      if (cls.includes("mz-right")) return "right";
      return "left";
    };

    /* collect inline runs with inherited bold/italic so <strong>/<em>
       survive the conversion (the old walker flattened them away) */
    const inlineRuns = (
      el: Node,
      bold: boolean,
      italic: boolean
    ): RRun[] => {
      const out: RRun[] = [];
      const push = (t: string, b: boolean, it: boolean) => {
        if (!t) return;
        const last = out[out.length - 1];
        if (last && last.bold === b && last.italic === it) last.text += t;
        else out.push({ text: t, bold: b, italic: it });
      };
      el.childNodes.forEach((n) => {
        if (n.nodeType === 3) {
          push(n.textContent ?? "", bold, italic);
        } else if (n.nodeType === 1) {
          const tag = (n as Element).tagName.toLowerCase();
          if (tag === "br") {
            push("\n", bold, italic);
            return;
          }
          const nb = bold || tag === "strong" || tag === "b";
          const ni = italic || tag === "em" || tag === "i";
          inlineRuns(n, nb, ni).forEach((r) => push(r.text, r.bold, r.italic));
        }
      });
      return out;
    };

    const fontFor = (b: boolean, it: boolean) =>
      b && it ? "bolditalic" : b ? "bold" : it ? "italic" : "normal";

    /* rich-text flow: wraps word-by-word ACROSS style runs, so a paragraph
       keeps its mixed bold/italic exactly like the source document. Lines
       are buffered first so centered/right paragraphs get offset. */
    const writeRuns = (
      runs: RRun[],
      size: number,
      indent: number,
      gapAfter: number,
      align: "left" | "center" | "right" = "left"
    ) => {
      const left = M + indent;
      const avail = pageW - M - left;
      const lineH = size * 1.45;
      type W = { text: string; w: number; bold: boolean; italic: boolean };
      let line: W[] = [];
      let lineW = 0;

      const flush = () => {
        while (line.length && /^\s+$/.test(line[line.length - 1].text))
          lineW -= line.pop()!.w;
        if (!line.length) return;
        if (y > pageH - M) {
          pdf.addPage();
          y = M;
        }
        let x = left;
        if (align === "center") x += Math.max(0, (avail - lineW) / 2);
        else if (align === "right") x += Math.max(0, avail - lineW);
        for (const wd of line) {
          pdf.setFont("helvetica", fontFor(wd.bold, wd.italic));
          pdf.setFontSize(size);
          pdf.text(wd.text, x, y);
          x += wd.w;
        }
        line = [];
        lineW = 0;
        y += lineH;
      };

      if (y > pageH - M) {
        pdf.addPage();
        y = M;
      }
      for (const run of runs) {
        if (!run.text) continue;
        pdf.setFont("helvetica", fontFor(run.bold, run.italic));
        pdf.setFontSize(size);
        const segs = run.text.split("\n");
        for (let si = 0; si < segs.length; si++) {
          if (si > 0) {
            /* hard line break — always advance; blank segments keep the
               empty line instead of collapsing */
            const had = line.length > 0;
            flush();
            if (!had) {
              if (y > pageH - M) {
                pdf.addPage();
                y = M;
              }
              y += lineH;
            }
          }
          for (const wd of segs[si].split(/(\s+)/)) {
            if (!wd) continue;
            if (/^\s+$/.test(wd)) {
              if (line.length) {
                const sw = pdf.getTextWidth(" ");
                line.push({ text: " ", w: sw, bold: run.bold, italic: run.italic });
                lineW += sw;
              }
              continue;
            }
            const ww = pdf.getTextWidth(wd);
            if (lineW + ww > avail && line.length) flush();
            if (ww > avail) {
              /* pathological single word wider than the line: hard-break */
              for (const ch of wd) {
                const cw = pdf.getTextWidth(ch);
                if (lineW + cw > avail && line.length) flush();
                line.push({ text: ch, w: cw, bold: run.bold, italic: run.italic });
                lineW += cw;
              }
            } else {
              line.push({ text: wd, w: ww, bold: run.bold, italic: run.italic });
              lineW += ww;
            }
          }
        }
      }
      flush();
      y += gapAfter;
    };

    /* embed mammoth's inlined data-URI images, scaled to the text column */
    const drawImageEl = (el: Element) => {
      const src = el.getAttribute("src") ?? "";
      const m = src.match(/^data:image\/(png|jpe?g);base64,([\s\S]+)$/);
      if (!m) return; // unsupported source — skipped honestly
      try {
        const bin = atob(m[2]);
        const raw = new Uint8Array(bin.length);
        for (let k = 0; k < bin.length; k++) raw[k] = bin.charCodeAt(k);
        const props = pdf.getImageProperties(raw);
        const w = Math.min(pageW - M * 2, props.width);
        const h = (w / props.width) * props.height;
        if (y + h > pageH - M) {
          pdf.addPage();
          y = M;
        }
        pdf.addImage(raw, m[1] === "png" ? "PNG" : "JPEG", M, y, w, h);
        y += h + 10;
      } catch {
        /* broken image — skip rather than fail the whole file */
      }
    };

    /* real ruled table: columns sized to their content, cells wrapped,
       header row bold on a light fill — instead of pipe-joined text */
    const renderTable = (table: Element) => {
      const trs = Array.from(table.querySelectorAll("tr"));
      if (!trs.length) return;
      const size = 10;
      const pad = 4;
      const lineH = size * 1.35;
      const grid: string[][] = [];
      const rowBold: boolean[] = [];
      for (let r = 0; r < trs.length; r++) {
        const cells = Array.from(trs[r].querySelectorAll("th,td"));
        grid.push(
          cells.map((c) =>
            (c.textContent ?? "").replace(/\s+/g, " ").trim()
          )
        );
        rowBold.push(
          trs[r].querySelector("th") !== null ||
            (r === 0 &&
              cells.length > 0 &&
              cells.every((c) => c.querySelector("strong,b") !== null))
        );
      }
      const nCols = Math.max(...grid.map((r) => r.length));
      for (const r of grid) while (r.length < nCols) r.push("");
      pdf.setFontSize(size);
      const colW: number[] = [];
      for (let c = 0; c < nCols; c++) {
        let w = 0;
        for (let r = 0; r < grid.length; r++) {
          pdf.setFont("helvetica", rowBold[r] ? "bold" : "normal");
          for (const word of grid[r][c].split(/\s+/))
            if (word) w = Math.max(w, pdf.getTextWidth(word));
        }
        colW.push(
          Math.min(Math.max(w + pad * 2 + 2, 42), (pageW - M * 2) * 0.6)
        );
      }
      const total = colW.reduce((a, b) => a + b, 0);
      const avail = pageW - M * 2;
      if (total > avail)
        for (let c = 0; c < nCols; c++) colW[c] *= avail / total;
      pdf.setDrawColor(168);
      pdf.setLineWidth(0.5);
      for (let r = 0; r < grid.length; r++) {
        pdf.setFont("helvetica", rowBold[r] ? "bold" : "normal");
        pdf.setFontSize(size);
        const cellLines = grid[r].map((t, c) =>
          t
            ? (pdf.splitTextToSize(t, Math.max(20, colW[c] - pad * 2)) as string[])
            : []
        );
        const nLines = Math.max(1, ...cellLines.map((ls) => ls.length));
        const rowH = nLines * lineH + pad * 2;
        if (y + rowH > pageH - M) {
          pdf.addPage();
          y = M;
        }
        if (rowBold[r]) {
          pdf.setFillColor(243, 243, 243);
          pdf.rect(M, y, colW.reduce((a, b) => a + b, 0), rowH, "F");
        }
        let x = M;
        for (let c = 0; c < nCols; c++) {
          pdf.rect(x, y, colW[c], rowH);
          for (let li = 0; li < cellLines[c].length; li++)
            pdf.text(
              cellLines[c][li],
              x + pad,
              y + pad + size * 0.85 + li * lineH
            );
          x += colW[c];
        }
        y += rowH;
      }
      pdf.setDrawColor(0);
      pdf.setLineWidth(1);
      y += 8;
    };

    const isList = (t: string) => t === "ul" || t === "ol";

    const walkList = (list: Element, depth: number) => {
      const tag = list.tagName.toLowerCase();
      const items = Array.from(list.children).filter(
        (c) => c.tagName.toLowerCase() === "li"
      );
      let idx = 0;
      for (const li of items) {
        idx++;
        const runs: RRun[] = [
          { text: tag === "ul" ? "•  " : `${idx}.  `, bold: false, italic: false },
        ];
        for (const n of Array.from(li.childNodes)) {
          if (n.nodeType === 3) {
            const t = n.textContent ?? "";
            if (t) runs.push({ text: t, bold: false, italic: false });
          } else if (n.nodeType === 1) {
            const t = (n as Element).tagName.toLowerCase();
            if (isList(t) || t === "img") continue; // handled after the text
            inlineRuns(n, false, false).forEach((r) => runs.push(r));
          }
        }
        writeRuns(runs, 11, depth * 16 + 8, 2);
        for (const sub of Array.from(li.children)) {
          const t = sub.tagName.toLowerCase();
          if (isList(t)) walkList(sub, depth + 1);
          else if (t === "img") drawImageEl(sub);
        }
      }
    };

    const walk = (node: Element, depth: number) => {
      for (const el of Array.from(node.children)) {
        const tag = el.tagName.toLowerCase();
        if (/^h[1-6]$/.test(tag)) {
          const size = [20, 17, 15, 13.5, 12.5, 12][parseInt(tag[1], 10) - 1];
          writeRuns(inlineRuns(el, true, false), size, 0, 6, alignOf(el));
        } else if (isList(tag)) {
          walkList(el, depth);
        } else if (tag === "table") {
          renderTable(el);
        } else if (tag === "img") {
          drawImageEl(el);
        } else if (el.querySelector("img,ul,ol,table")) {
          /* mixed container — walk in document order so images/lists land
             between the right paragraphs */
          walk(el, depth);
        } else {
          const runs = inlineRuns(el, false, false);
          if (runs.some((r) => r.text.trim()))
            writeRuns(runs, 11, 0, 8, alignOf(el));
        }
      }
    };
    walk(dom.body, 0);

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
    note: "Text, headings, lists, tables, alignment, images & bold/italic kept — complex layout simplified",
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
      /* stamp on the page the viewer SHOWS: positions are computed in
         display space (visible box incl. non-zero origins, honoring
         /Rotate) and mapped to user space, with the text counter-rotated
         so it sits at the intended visual angle. */
      const base = page.getCropBox();
      const W = base.width;
      const H = base.height;
      const rot = ((page.getRotation().angle % 360) + 360) % 360;
      const swap = rot === 90 || rot === 270;
      const Dw = swap ? H : W;
      const Dh = swap ? W : H;
      const tw = font.widthOfTextAtSize(opts.text, opts.fontSize);
      const draw = (dx: number, dyBottom: number, visualAngle: number) => {
        const dyTop = Dh - dyBottom;
        let xu: number;
        let yu: number;
        switch (rot) {
          case 90:
            xu = dyTop;
            yu = dx;
            break;
          case 180:
            xu = W - dx;
            yu = H - dyTop;
            break;
          case 270:
            xu = W - dyTop;
            yu = H - dx;
            break;
          default:
            xu = dx;
            yu = H - dyTop;
        }
        page.drawText(opts.text, {
          x: base.x + xu,
          y: base.y + yu,
          size: opts.fontSize,
          font,
          color: rgb(r, g, b),
          opacity: opts.opacity,
          rotate: degrees((visualAngle + rot) % 360),
        });
      };
      switch (opts.position) {
        case "center":
          draw((Dw - tw) / 2, Dh / 2 - opts.fontSize / 2, 0);
          break;
        case "diagonal":
          draw((Dw - tw) / 2 - Dw * 0.1, Dh * 0.35, opts.rotation);
          break;
        case "tile": {
          const stepX = Math.max(40, tw + Dw * 0.08);
          const stepY = Math.max(30, opts.fontSize * 5);
          for (let dy = 0; dy < Dh + stepY; dy += stepY) {
            for (let dx = -tw; dx < Dw + stepX; dx += stepX) {
              draw(dx, dy, opts.rotation);
            }
          }
          break;
        }
        case "footer":
          draw((Dw - tw) / 2, opts.fontSize * 1.2, 0);
          break;
        case "header":
          draw((Dw - tw) / 2, Dh - opts.fontSize * 2, 0);
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
  const { PDFDocument, StandardFonts, degrees } = await getPdfLib();
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
      /* position the number on the page the viewer SHOWS: respect the
         visible box (crop || media, incl. non-zero origins) and /Rotate,
         drawing the text rotated so it reads upright. */
      const base = page.getCropBox();
      const W = base.width;
      const H = base.height;
      const rot = ((page.getRotation().angle % 360) + 360) % 360;
      const swap = rot === 90 || rot === 270;
      const Dw = swap ? H : W;
      const Dh = swap ? W : H;
      const tw = font.widthOfTextAtSize(label, opts.fontSize);
      const M = 28;
      let dx = (Dw - tw) / 2;
      if (opts.position.endsWith("right")) dx = Dw - M - tw;
      if (opts.position.endsWith("left")) dx = M;
      const dyBottom = opts.position.startsWith("top")
        ? Dh - M - opts.fontSize
        : M;
      const dyTop = Dh - dyBottom;
      let xu: number;
      let yu: number;
      switch (rot) {
        case 90:
          xu = dyTop;
          yu = dx;
          break;
        case 180:
          xu = W - dx;
          yu = H - dyTop;
          break;
        case 270:
          xu = W - dyTop;
          yu = H - dx;
          break;
        default:
          xu = dx;
          yu = H - dyTop;
      }
      page.drawText(label, {
        x: base.x + xu,
        y: base.y + yu,
        size: opts.fontSize,
        font,
        rotate: degrees(rot),
      });
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
      /* crop against what the viewer actually shows: the current crop box
         (falls back to the media box), not the raw media box — and respect
         a non-zero box origin. */
      const base = page.getCropBox();
      const W = base.width;
      const H = base.height;
      const rot = ((page.getRotation().angle % 360) + 360) % 360;
      /* map the four visual edges of the DISPLAYED page to user-space:
         with /Rotate 90 the displayed top edge is the user-space left
         edge, etc. (0: l/b, 90: t/l, 180: r/b, 270: b/r) */
      let x0: number;
      let y0: number;
      let w: number;
      let h: number;
      switch (rot) {
        case 90:
          x0 = base.x + t * W;
          y0 = base.y + l * H;
          w = (1 - b - t) * W;
          h = (1 - rr - l) * H;
          break;
        case 180:
          x0 = base.x + rr * W;
          y0 = base.y + b * H;
          w = (1 - l - rr) * W;
          h = (1 - t - b) * H;
          break;
        case 270:
          x0 = base.x + b * W;
          y0 = base.y + rr * H;
          w = (1 - t - b) * W;
          h = (1 - l - rr) * H;
          break;
        default:
          x0 = base.x + l * W;
          y0 = base.y + b * H;
          w = (1 - l - rr) * W;
          h = (1 - t - b) * H;
      }
      page.setCropBox(x0, y0, Math.max(1, w), Math.max(1, h));
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
