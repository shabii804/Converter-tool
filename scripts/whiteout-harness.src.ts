/**
 * Whiteout QA harness — runs the REAL src/lib/extra-engine.ts annotate path
 * (runExtraTool → runApplyAnnotations) in headless Chromium.
 * Exposed as window.convTest(toolId, fileB64, fileName, opts).
 */
import "../src/lib/compat-shims";
import { runExtraTool } from "../src/lib/extra-engine";
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

(window as any).convTest = async (
  toolId: string,
  fileB64: string,
  fileName: string,
  opts: Record<string, unknown>
) => {
  const blob = await b64ToBlob(fileB64, "application/pdf");
  const file = new File([blob], fileName);
  const res = await runExtraTool(
    toolId,
    [{ id: "f1", file }],
    opts,
    { onStatus: (m: string) => console.log("[status]", m) }
  );
  return {
    note: res.note ?? "",
    outputs: await Promise.all(
      res.files.map(async (f) => ({
        name: f.name,
        kind: f.kind,
        b64: await blobToB64(f.blob),
      }))
    ),
  };
};
