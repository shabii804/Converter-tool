/** Probe pdf.js font metadata via commonObjs (bold/italic detection route). */
import "../src/lib/compat-shims";
import * as pdfjs from "pdfjs-dist";

pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

(window as any).probe = async (fileB64: string) => {
  const bin = atob(fileB64);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  const doc = await pdfjs.getDocument({ data: buf, isEvalSupported: false }).promise;
  const page = await doc.getPage(1);
  const tc = await page.getTextContent();
  await page.getOperatorList();
  const fontNames = new Set(
    (tc.items as any[]).filter((it) => it.str?.trim()).map((it) => it.fontName)
  );
  const fonts: Record<string, unknown> = {};
  for (const fn of fontNames) {
    try {
      const d = (page as any).commonObjs.get(fn);
      fonts[fn] = {
        name: d?.name,
        bold: d?.bold,
        italic: d?.italic,
        black: d?.black,
        loadedName: d?.loadedName,
      };
    } catch (e) {
      fonts[fn] = "ERR: " + String(e).slice(0, 80);
    }
  }
  return { fonts };
};
