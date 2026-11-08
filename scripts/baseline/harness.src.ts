/**
 * Engine harness — runs the REAL src/lib/pdf-engine.ts in headless Chromium.
 * No UI involved. Fixed, deterministic specs for all 16 tools.
 */
import { runTool } from "../../src/lib/pdf-engine";
import * as pdfjs from "pdfjs-dist";

pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

/* ---------- deterministic tool specs ---------- */
export interface Spec {
  key: string;
  id: string;
  inputs: string[];
  opts: Record<string, unknown>;
  pdfPassword?: string;
}

export const SPECS: Spec[] = [
  { key: "merge", id: "merge", inputs: ["sample-text.pdf", "sample-second.pdf"], opts: {} },
  {
    key: "split@ranges", id: "split", inputs: ["sample-text.pdf"],
    opts: { mode: "ranges", ranges: "1-2", everyN: 2, selectedPages: [] },
  },
  {
    key: "split@fixed", id: "split", inputs: ["sample-text.pdf"],
    opts: { mode: "fixed", ranges: "", everyN: 2, selectedPages: [] },
  },
  {
    key: "split@extract", id: "split", inputs: ["sample-text.pdf"],
    opts: { mode: "extract", ranges: "", everyN: 2, selectedPages: [1, 3] },
  },
  { key: "compress", id: "compress", inputs: ["sample-text.pdf", "sample-image.pdf"], opts: { level: "medium" } },
  { key: "organize", id: "organize", inputs: ["sample-text.pdf"], opts: { order: [3, 1, 2], rotations: { 1: 90 } } },
  { key: "rotate", id: "rotate", inputs: ["sample-text.pdf"], opts: { angle: 90 } },
  { key: "pdf-to-jpg", id: "pdf-to-jpg", inputs: ["sample-text.pdf"], opts: { scale: 1 } },
  { key: "jpg-to-pdf", id: "jpg-to-pdf", inputs: ["sample-photo.jpg"], opts: { pageSize: "a4", margin: 24, orientation: "auto" } },
  { key: "pdf-to-word", id: "pdf-to-word", inputs: ["sample-text.pdf"], opts: {} },
  { key: "pdf-to-excel", id: "pdf-to-excel", inputs: ["sample-text.pdf"], opts: {} },
  { key: "pdf-to-ppt", id: "pdf-to-ppt", inputs: ["sample-image.pdf"], opts: {} },
  { key: "word-to-pdf", id: "word-to-pdf", inputs: ["sample-doc.docx"], opts: { pageSize: "a4" } },
  {
    key: "watermark", id: "watermark", inputs: ["sample-text.pdf"],
    opts: { text: "CONFIDENTIAL", fontSize: 48, color: "#EF4444", opacity: 0.3, rotation: 45, position: "diagonal", bold: true },
  },
  {
    key: "page-numbers", id: "page-numbers", inputs: ["sample-text.pdf"],
    opts: { format: "n_of_total", position: "bottom-center", startAt: 1, fontSize: 11, skipFirst: false },
  },
  { key: "crop", id: "crop", inputs: ["sample-text.pdf"], opts: { top: 5, right: 5, bottom: 5, left: 5 } },
  { key: "protect", id: "protect", inputs: ["sample-text.pdf"], opts: { password: "test1234", confirm: "test1234" }, pdfPassword: "test1234" },
  { key: "unlock", id: "unlock", inputs: ["sample-encrypted.pdf"], opts: { password: "test1234" } },
];

/* ---------- analysis helpers ---------- */

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", bytes as unknown as ArrayBuffer);
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function blobToB64(blob: Blob): Promise<string> {
  const buf = new Uint8Array(await blob.arrayBuffer());
  let s = "";
  const CH = 0x8000;
  for (let i = 0; i < buf.length; i += CH)
    s += String.fromCharCode(...buf.subarray(i, i + CH));
  return btoa(s);
}

async function analyzePdf(ab: ArrayBuffer, password?: string) {
  const doc = await pdfjs.getDocument({
    data: new Uint8Array(ab.slice(0)),
    password,
    isEvalSupported: false,
  }).promise;
  const pages: { w: number; h: number }[] = [];
  let textAgg = "";
  const enc = new TextEncoder();
  for (let p = 1; p <= doc.numPages; p++) {
    const pg = await doc.getPage(p);
    const v = pg.getViewport({ scale: 1 });
    pages.push({ w: Math.round(v.width * 100) / 100, h: Math.round(v.height * 100) / 100 });
    const tc = await pg.getTextContent();
    const s = (tc.items as { str?: string; transform?: number[] }[])
      .map((it) =>
        it.str
          ? `${it.str}@${Math.round((it.transform?.[4] ?? 0) * 10) / 10},${Math.round((it.transform?.[5] ?? 0) * 10) / 10}`
          : ""
      )
      .join("\u0001");
    textAgg += s + "\u0002";
  }
  const textHash = await sha256Hex(enc.encode(textAgg));
  return { pageCount: doc.numPages, pages, textHash };
}

async function analyzeImage(blob: Blob) {
  const bmp = await createImageBitmap(blob);
  const dims = { imgW: bmp.width, imgH: bmp.height };
  bmp.close();
  return dims;
}

/* ---------- runner ---------- */

export async function runAll(): Promise<Record<string, unknown>> {
  const results: Record<string, unknown> = {};
  for (const spec of SPECS) {
    const t0 = performance.now();
    try {
      const entries: { id: string; file: File }[] = [];
      for (let i = 0; i < spec.inputs.length; i++) {
        const res = await fetch(`/samples/${spec.inputs[i]}`);
        if (!res.ok) throw new Error(`sample fetch failed: ${spec.inputs[i]}`);
        const blob = await res.blob();
        entries.push({
          id: `e${i}`,
          file: new File([blob], spec.inputs[i], {
            type: blob.type || "application/octet-stream",
          }),
        });
      }
      const out = await runTool(spec.id, entries, spec.opts, {
        onOverall: () => {},
        onFileProgress: () => {},
        onStatus: () => {},
      });
      const outputs: Record<string, unknown>[] = [];
      for (const f of out.files) {
        const rec: Record<string, unknown> = {
          name: f.name,
          kind: f.kind,
          size: f.size,
          b64: await blobToB64(f.blob),
        };
        if (f.kind === "PDF") {
          const analysis = await analyzePdf(await f.blob.arrayBuffer(), spec.pdfPassword);
          Object.assign(rec, analysis);
        }
        if (f.kind === "JPG" || f.kind === "PNG") {
          Object.assign(rec, await analyzeImage(f.blob));
        }
        outputs.push(rec);
      }
      results[spec.key] = {
        ok: true,
        ms: Math.round(performance.now() - t0),
        note: out.note ?? null,
        outputs,
      };
    } catch (err) {
      results[spec.key] = {
        ok: false,
        ms: Math.round(performance.now() - t0),
        error: String((err as Error)?.message ?? err),
      };
    }
  }
  return results;
}

(window as unknown as { runAll: typeof runAll }).runAll = runAll;
