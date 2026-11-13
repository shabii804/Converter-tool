/**
 * Image round-trip QA harness — runs the REAL src/lib/pdf-engine.ts
 * word-to-pdf and pdf-to-word paths on documents that contain inserted
 * images, and reports whether the images survive.
 * Exposed as window.imgTest(dir, fileB64, fileName).
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

/** rasterize page 1 of a PDF and sample a grid of pixels; returns the share
    of non-white pixels — a text-only page is <5%, a page with an image >>5% */
async function pdfImageCoverage(pdfBytes: Uint8Array): Promise<{
  nonWhitePct: number;
  coloredPct: number;
}> {
  const doc = await pdfjs.getDocument({ data: pdfBytes.slice() }).promise;
  const page = await doc.getPage(1);
  const vp = page.getViewport({ scale: 1.5 });
  const canvas = document.createElement("canvas");
  canvas.width = vp.width;
  canvas.height = vp.height;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvas, canvasContext: ctx, viewport: vp } as any).promise;
  const d = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  let nonWhite = 0;
  let colored = 0;
  const total = canvas.width * canvas.height;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    if (r < 245 || g < 245 || b < 245) nonWhite++;
    if (Math.max(r, g, b) - Math.min(r, g, b) > 30) colored++;
  }
  return {
    nonWhitePct: +((nonWhite / total) * 100).toFixed(2),
    coloredPct: +((colored / total) * 100).toFixed(2),
  };
}

(window as any).imgTest = async (
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
    const cov = await pdfImageCoverage(outBytes);
    report.imageCoverage = cov;
    report.b64 = await blobToB64(out.blob);
  } else {
    report.b64 = await blobToB64(out.blob);
  }
  return report;
};
