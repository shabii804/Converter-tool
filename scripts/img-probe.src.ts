/**
 * Image-probe harness — builds a PDF with images at KNOWN pdf-lib positions,
 * then reads them back through pdf.js getOperatorList and prints the rects
 * the op-list walk produces, so the coordinate space can be pinned down.
 * Exposed as window.probe().
 */
import "../src/lib/compat-shims";
import * as pdfjs from "pdfjs-dist";

pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

/* a 40x20 red-ish PNG with a blue border, drawn via canvas */
function makePngDataUrl(): string {
  const c = document.createElement("canvas");
  c.width = 80;
  c.height = 40;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#e11d48";
  ctx.fillRect(0, 0, 80, 40);
  ctx.fillStyle = "#1d4ed8";
  ctx.fillRect(6, 6, 68, 28);
  return c.toDataURL("image/png");
}

async function dataUrlToBytes(url: string): Promise<Uint8Array> {
  const bin = atob(url.split(",")[1]);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf;
}

async function b64ToBytes(b64: string): Promise<Uint8Array> {
  const bin = atob(b64);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf;
}

/* dump text runs of a served PDF (base64-free: fetched by URL) */
(window as any).probeFile = async (url: string) => {
  const buf = await (await fetch(url)).arrayBuffer();
  const read = await pdfjs.getDocument({ data: new Uint8Array(buf) }).promise;
  const pg = await read.getPage(1);
  const tc = await pg.getTextContent();
  return (tc.items as any[])
    .filter((it) => it.str && it.str.trim())
    .map((it) => ({
      str: it.str.slice(0, 30),
      x: +it.transform[4].toFixed(2),
      y: +it.transform[5].toFixed(2),
      w: +it.width.toFixed(2),
      size: +Math.hypot(it.transform[0], it.transform[1]).toFixed(2),
    }));
};

(window as any).probe = async () => {
  /* 1. build fixture with known placements */
  const { PDFDocument } = await import("@cantoo/pdf-lib");
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]);
  const pngBytes = await dataUrlToBytes(makePngDataUrl());
  const img = await doc.embedPng(pngBytes);

  /* known placements in PDF user space (origin bottom-left, y up) */
  const PLACEMENTS = [
    { x: 100, y: 600, w: 200, h: 150 },
    { x: 60, y: 350, w: 120, h: 90 },
  ];
  for (const p of PLACEMENTS)
    page.drawImage(img, { x: p.x, y: p.y, width: p.w, height: p.h });
  page.drawText("Probe paragraph before images", {
    x: 72,
    y: 780,
    size: 12,
  });

  const pdfBytes = await doc.save();

  /* 2. read back through pdf.js */
  const read = await pdfjs.getDocument({ data: pdfBytes }).promise;
  const pg = await read.getPage(1);

  const tc = await pg.getTextContent();
  const textItems = (tc.items as any[])
    .filter((it) => it.str && it.str.trim())
    .map((it) => ({
      str: it.str,
      x: +it.transform[4].toFixed(2),
      y: +it.transform[5].toFixed(2),
      w: +it.width.toFixed(2),
      size: +Math.hypot(it.transform[0], it.transform[1]).toFixed(2),
    }));

  const opList = await pg.getOperatorList();
  const OPS = pdfjs.OPS;

  const mul = (m: number[], t: number[]): number[] => [
    m[0] * t[0] + m[2] * t[1],
    m[1] * t[0] + m[3] * t[1],
    m[0] * t[2] + m[2] * t[3],
    m[1] * t[2] + m[3] * t[3],
    m[0] * t[4] + m[2] * t[5] + m[4],
    m[1] * t[4] + m[3] * t[5] + m[5],
  ];
  const apply = (m: number[], x: number, y: number) => ({
    x: m[0] * x + m[2] * y + m[4],
    y: m[1] * x + m[3] * y + m[5],
  });

  let ctm = [1, 0, 0, 1, 0, 0];
  const stack: number[][] = [];
  const rects: any[] = [];

  for (let i = 0; i < opList.fnArray.length; i++) {
    const fn = opList.fnArray[i];
    const args = opList.argsArray[i] as any;
    if (fn === OPS.save) stack.push([...ctm]);
    else if (fn === OPS.restore) ctm = stack.pop() ?? [1, 0, 0, 1, 0, 0];
    else if (fn === OPS.transform) ctm = mul(ctm, args as number[]);
    else if (fn === OPS.setTransform) ctm = [...(args as number[])];
    else if (fn === OPS.paintImageXObject || fn === OPS.paintJpegXObject) {
      const objId = args[0];
      let obj: any = null;
      let src = "";
      try {
        if (pg.commonObjs.has(objId)) {
          obj = pg.commonObjs.get(objId);
          src = "commonObjs";
        } else if (pg.objs.has(objId)) {
          obj = pg.objs.get(objId);
          src = "objs";
        }
      } catch (e) {
        src = "get-threw: " + String(e);
      }
      const p00 = apply(ctm, 0, 0);
      const p10 = apply(ctm, 1, 0);
      const p01 = apply(ctm, 0, 1);
      const p11 = apply(ctm, 1, 1);
      const xs = [p00.x, p10.x, p01.x, p11.x];
      const ys = [p00.y, p10.y, p01.y, p11.y];
      rects.push({
        objId,
        src,
        ctm: ctm.map((v) => +v.toFixed(3)),
        rect: {
          x: +Math.min(...xs).toFixed(2),
          y: +Math.min(...ys).toFixed(2),
          w: +(Math.max(...xs) - Math.min(...xs)).toFixed(2),
          h: +(Math.max(...ys) - Math.min(...ys)).toFixed(2),
        },
        keys: obj ? Object.keys(obj) : null,
        width: obj?.width,
        height: obj?.height,
        hasBitmap: !!obj?.bitmap,
        hasData: !!obj?.data,
        kind: obj?.kind,
      });
    }
  }

  return { textItems, rects, expected: PLACEMENTS, opsCount: opList.fnArray.length };
};
