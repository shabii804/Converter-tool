/**
 * Alignment QA harness — runs the REAL src/lib/pdf-engine.ts word-to-pdf and
 * pdf-to-word paths on alignment fixtures and MEASURES the result:
 *  - word-to-pdf: extract output-PDF text lines (x0/x1/center-delta) and the
 *    centroid of colored image pixels, so centered/right/justified intent can
 *    be judged objectively instead of by eye.
 *  - pdf-to-word: return the docx bytes; the node driver inspects w:jc and
 *    floating-anchor offsets in document.xml.
 * Exposed as window.alignTest(toolId, fileB64, fileName, opts).
 */
import "../src/lib/compat-shims";
import { runTool } from "../src/lib/pdf-engine";
import * as pdfjs from "pdfjs-dist";

pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

async function b64ToBlob(b64: string, type: string): Promise<Blob> {
  const bin = atob(b64);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return new Blob([buf], { type });
}

async function blobToB64(blob: Blob): Promise<string> {
  const buf = new Uint8Array(await blob.arrayBuffer());
  let s = "";
  const CH = 0x8000;
  for (let i = 0; i < buf.length; i += CH)
    s += String.fromCharCode(...buf.subarray(i, i + CH));
  return btoa(s);
}

type Line = { t: string; x0: number; x1: number; y: number; size: number };

async function pdfLines(bytes: Uint8Array): Promise<{
  pageW: number;
  pageH: number;
  lines: Line[];
}> {
  const doc = await pdfjs.getDocument({ data: bytes.slice() }).promise;
  const page = await doc.getPage(1);
  const vp = page.getViewport({ scale: 1 });
  const tc = await page.getTextContent();
  const parts: { x: number; y: number; size: number; w: number; str: string }[] =
    [];
  for (const item of tc.items as any[]) {
    if (!item.str || !item.str.trim()) continue;
    parts.push({
      x: item.transform[4],
      y: item.transform[5],
      size: Math.hypot(item.transform[0], item.transform[1]) || 12,
      w: item.width || 0,
      str: item.str,
    });
  }
  const lines: Line[] = [];
  for (const p of parts.sort((a, b) => b.y - a.y || a.x - b.x)) {
    const l = lines.find((l) => Math.abs(l.y - p.y) < p.size * 0.55);
    if (l) {
      l.x1 = Math.max(l.x1, p.x + p.w);
      l.x0 = Math.min(l.x0, p.x);
      l.t += (l.t && " ") + p.str;
    } else lines.push({ t: p.str, x0: p.x, x1: p.x + p.w, y: p.y, size: p.size });
  }
  return { pageW: vp.width, pageH: vp.height, lines };
}

/** centroid + bbox of strongly-colored pixels = where the picture landed */
async function pdfImageBox(
  bytes: Uint8Array,
  pageNo = 1
): Promise<{
  cx: number;
  cy: number;
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  pageW: number;
  pageH: number;
  n: number;
} | null> {
  const doc = await pdfjs.getDocument({ data: bytes.slice() }).promise;
  const page = await doc.getPage(pageNo);
  const vp = page.getViewport({ scale: 1 });
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(vp.width);
  canvas.height = Math.round(vp.height);
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvas, canvasContext: ctx, viewport: vp } as any).promise;
  const d = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  let sx = 0,
    sy = 0,
    n = 0,
    x0 = 1e9,
    x1 = -1,
    y0 = 1e9,
    y1 = -1;
  for (let y = 0; y < canvas.height; y++)
    for (let x = 0; x < canvas.width; x++) {
      const i = (y * canvas.width + x) * 4;
      const r = d[i],
        g = d[i + 1],
        b = d[i + 2];
      if (Math.max(r, g, b) - Math.min(r, g, b) > 60) {
        sx += x;
        sy += y;
        n++;
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  if (n < 500) return null; // no picture drawn
  return {
    cx: +(sx / n).toFixed(1),
    cy: +(sy / n).toFixed(1),
    x0,
    x1,
    y0,
    y1,
    pageW: canvas.width,
    pageH: canvas.height,
    n,
  };
}

(window as any).alignTest = async (
  toolId: string,
  fileB64: string,
  fileName: string,
  opts: Record<string, unknown> = {}
) => {
  const type =
    toolId === "word-to-pdf"
      ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      : "application/pdf";
  const file = new File([await b64ToBlob(fileB64, type)], fileName);
  const res = await runTool(toolId, [{ id: "f1", file }], opts, {
    onStatus: (m: string) => console.log("[status]", m),
  });
  const out = res.files[0];
  const outBytes = new Uint8Array(await out.blob.arrayBuffer());
  const report: any = { note: res.note, name: out.name, size: out.size };
  if (out.kind === "PDF") {
    const { pageW, pageH, lines } = await pdfLines(outBytes);
    report.pageW = pageW;
    report.pageH = pageH;
    report.lines = lines.map((l) => ({
      t: l.t.slice(0, 48),
      x0: +l.x0.toFixed(1),
      x1: +l.x1.toFixed(1),
      size: +l.size.toFixed(1),
      mid: +(((l.x0 + l.x1) / 2) as number).toFixed(1),
      pageMid: +(pageW / 2).toFixed(1),
      offCenter: +(((l.x0 + l.x1) / 2 - pageW / 2) as number).toFixed(1),
    }));
    const box = await pdfImageBox(outBytes, 1);
    if (box) report.imageBox = box;
    try {
      const box2 = await pdfImageBox(outBytes, 2);
      if (box2) report.imageBox2 = box2;
    } catch {
      /* single-page output */
    }
    report.b64 = await blobToB64(out.blob);
  } else {
    report.b64 = await blobToB64(out.blob);
  }
  return report;
};

/** expose mammoth's HTML for the stamped document so the driver can see what
    the walker receives */
(window as any).probeMammoth = async (fileB64: string) => {
  const mammoth = await import("mammoth");
  const buf = await b64ToBlob(fileB64, "");
  const { value: html } = await mammoth.convertToHtml(
    { arrayBuffer: await buf.arrayBuffer() },
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
            el.styleName = el.alignment === "center" ? "__mzCenter" : "__mzRight";
            el.styleId = undefined;
          }
          (el.children ?? []).forEach(mark);
        };
        mark(document);
        return document;
      },
    }
  );
  return html;
};
