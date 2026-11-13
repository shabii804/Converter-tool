/**
 * Image-probe harness — takes PDF bytes, walks getOperatorList() and dumps
 * every image op: the objId, where the object lives, its runtime shape
 * (bitmap vs data/kind) and the CTM rect. Pinpoints why an image class
 * (e.g. DCTDecode JPEG) is dropped by the pdf-to-word extractor.
 * Exposed as window.probe(bytes).
 */
import "../src/lib/compat-shims";
import * as pdfjs from "pdfjs-dist";

pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

(window as any).probe = async (bytes: Uint8Array) => {
  const read = await pdfjs.getDocument({ data: bytes.slice() }).promise;
  const pg = await read.getPage(1);

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
  const opHistogram: Record<string, number> = {};

  for (let i = 0; i < opList.fnArray.length; i++) {
    const fn = opList.fnArray[i];
    const args = opList.argsArray[i] as any;
    const opName = (OPS as any)[fn] ?? String(fn);
    opHistogram[opName] = (opHistogram[opName] ?? 0) + 1;
    if (fn === OPS.save) stack.push([...ctm]);
    else if (fn === OPS.restore) ctm = stack.pop() ?? [1, 0, 0, 1, 0, 0];
    else if (fn === OPS.transform) ctm = mul(ctm, args as number[]);
    else if (fn === OPS.setTransform) ctm = [...(args as number[])];
    else if (
      fn === OPS.paintImageXObject || fn === OPS.paintJpegXObject ||
      fn === OPS.paintImageMaskXObject || fn === (OPS as any).paintImageXObjectRepeat
    ) {
      const objId = String(args[0]);
      let obj: any = null;
      let src = "not-found";
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
        op: opName,
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
        bitmapW: obj?.bitmap?.width,
        hasData: !!obj?.data,
        dataLen: obj?.data?.length,
        kind: obj?.kind,
      });
    }
  }

  return { rects, opsCount: opList.fnArray.length, opHistogram };
};
