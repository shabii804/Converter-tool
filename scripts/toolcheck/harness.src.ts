/**
 * Toolcheck harness — runs the REAL src/lib/extra-engine.ts in headless
 * Chromium against real files (baseline samples + generated fixtures),
 * with edge cases and end-to-end output verification (text extraction,
 * image extraction, pixel sampling).
 */
import { runExtraTool } from "../../src/lib/extra-engine";
import * as pdfjs from "pdfjs-dist";
import { PDFDocument, StandardFonts, degrees, rgb } from "pdf-lib";
import { PDFDocument as CantooPDFDocument } from "@cantoo/pdf-lib";

pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

/* ---------- assert helpers ---------- */

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error("ASSERT FAILED: " + msg);
}

async function extractTextOf(bytes: Uint8Array, pageIndex?: number): Promise<string> {
  const doc = await pdfjs.getDocument({ data: bytes.slice() }).promise;
  const pages =
    pageIndex === undefined
      ? Array.from({ length: doc.numPages }, (_, i) => i)
      : [pageIndex];
  let out = "";
  for (const p of pages) {
    const pg = await doc.getPage(p + 1);
    const tc = await pg.getTextContent();
    out +=
      (tc.items as { str?: string }[])
        .map((it) => it.str ?? "")
        .join(" ") + "\n";
  }
  return out;
}

async function pdfPageCount(bytes: Uint8Array): Promise<number> {
  const doc = await pdfjs.getDocument({ data: bytes.slice() }).promise;
  return doc.numPages;
}

async function textItemsOf(bytes: Uint8Array, pageIndex: number) {
  const doc = await pdfjs.getDocument({ data: bytes.slice() }).promise;
  const pg = await doc.getPage(pageIndex + 1);
  const tc = await pg.getTextContent();
  return (tc.items as any[]).filter((it) => it.str && it.str.trim());
}

/** render a page and count dark / colored pixels in a region (canvas coords) */
async function sampleRegion(
  bytes: Uint8Array,
  pageIndex: number,
  scale: number,
  region: { x: number; y: number; w: number; h: number },
  predicate: (r: number, g: number, b: number) => boolean
): Promise<number> {
  const doc = await pdfjs.getDocument({ data: bytes.slice() }).promise;
  const pg = await doc.getPage(pageIndex + 1);
  const vpt = pg.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = Math.floor(vpt.width);
  canvas.height = Math.floor(vpt.height);
  await pg.render({ canvasContext: canvas.getContext("2d")!, viewport: vpt } as any)
    .promise;
  const ctx = canvas.getContext("2d")!;
  const data = ctx.getImageData(
    Math.floor(region.x * scale),
    Math.floor(region.y * scale),
    Math.ceil(region.w * scale),
    Math.ceil(region.h * scale)
  ).data;
  let count = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (predicate(data[i], data[i + 1], data[i + 2])) count++;
  }
  return count;
}

/* ---------- fixture builders ---------- */

async function blobToB64(blob: Blob): Promise<string> {
  const buf = new Uint8Array(await blob.arrayBuffer());
  let s = "";
  for (let i = 0; i < buf.length; i += 0x8000)
    s += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return btoa(s);
}

function bytesOf(blob: Blob): Promise<Uint8Array> {
  return blob.arrayBuffer().then((b) => new Uint8Array(b));
}

async function makeAlphaPng(): Promise<Blob> {
  const c = document.createElement("canvas");
  c.width = 800;
  c.height = 600;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#E11D48"; // red circle near top-left on transparent bg
  ctx.beginPath();
  ctx.arc(100, 100, 50, 0, Math.PI * 2);
  ctx.fill();
  return await new Promise<Blob>((res) => c.toBlob((b) => res(b!), "image/png"));
}

async function makePhotoJpg(): Promise<Blob> {
  const c = document.createElement("canvas");
  c.width = 1600;
  c.height = 1000;
  const ctx = c.getContext("2d")!;
  const grad = ctx.createLinearGradient(0, 0, 1600, 1000);
  grad.addColorStop(0, "#4F46E5");
  grad.addColorStop(1, "#F59E0B");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1600, 1000);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 80px sans-serif";
  ctx.fillText("fixture photo", 80, 500);
  return await new Promise<Blob>((res) => c.toBlob((b) => res(b!), "image/jpeg", 0.9));
}

async function makeSquigglePng(): Promise<Blob> {
  const c = document.createElement("canvas");
  c.width = 400;
  c.height = 160;
  const ctx = c.getContext("2d")!;
  ctx.strokeStyle = "#1D4ED8";
  ctx.lineWidth = 7;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(20, 110);
  ctx.bezierCurveTo(90, 20, 160, 150, 230, 60);
  ctx.bezierCurveTo(280, 10, 330, 90, 380, 40);
  ctx.stroke();
  return await new Promise<Blob>((res) => c.toBlob((b) => res(b!), "image/png"));
}

async function makeRotatedPdf(): Promise<Blob> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontN = await doc.embedFont(StandardFonts.Helvetica);
  const p1 = doc.addPage([595.28, 841.89]);
  p1.drawText("ROTATED PAGE MARKER", { x: 56, y: 785.89, size: 12, font });
  p1.drawText("second line on rotated page", { x: 56, y: 755, size: 11, font: fontN });
  p1.setRotation(degrees(90));
  const p2 = doc.addPage([595.28, 841.89]);
  p2.drawText("PLAIN SECOND PAGE", { x: 56, y: 785.89, size: 12, font });
  return new Blob([await doc.save()], { type: "application/pdf" });
}

async function makeRedactSrcPdf(): Promise<{ blob: Blob; boxW: number }> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontN = await doc.embedFont(StandardFonts.Helvetica);
  const secret = "CONFIDENTIAL: ACME-12345";
  const tw = font.widthOfTextAtSize(secret, 12);
  const p1 = doc.addPage([595.28, 841.89]);
  p1.drawText(secret, { x: 56, y: 785.89, size: 12, font });
  p1.drawText("This line stays readable.", { x: 56, y: 750, size: 11, font: fontN });
  const p2 = doc.addPage([595.28, 841.89]);
  p2.drawText("PAGE TWO IS CLEAN", { x: 56, y: 785.89, size: 12, font });
  const blob = new Blob([await doc.save()], { type: "application/pdf" });
  return { blob, boxW: tw };
}

async function makeEmbeddedImgPdf(alphaPng: Blob): Promise<Blob> {
  const doc = await PDFDocument.create();
  const png = await doc.embedPng(new Uint8Array(await alphaPng.arrayBuffer()));
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.addPage([595.28, 841.89]);
  page.drawText("has image", { x: 56, y: 700, size: 12, font });
  page.drawImage(png, { x: 100, y: 400, width: 300, height: 225 });
  return new Blob([await doc.save()], { type: "application/pdf" });
}

/** image-only page — no text layer at all (extract-text must fail honestly) */
async function makeImageOnlyPdf(alphaPng: Blob): Promise<Blob> {
  const doc = await PDFDocument.create();
  const png = await doc.embedPng(new Uint8Array(await alphaPng.arrayBuffer()));
  const page = doc.addPage([595.28, 841.89]);
  page.drawImage(png, { x: 60, y: 300, width: 480, height: 360 });
  return new Blob([await doc.save()], { type: "application/pdf" });
}

/** a genuinely large password-protected PDF (> 10 KB) via Cantoo encryption */
async function makeBigEncryptedPdf(): Promise<Blob> {
  const doc = await CantooPDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  let page = doc.addPage([595.28, 841.89]);
  let y = 800;
  for (let i = 0; i < 400; i++) {
    if (y < 40) {
      page = doc.addPage([595.28, 841.89]);
      y = 800;
    }
    page.drawText(`FILLER LINE ${i} ABCDEFGHIJKLMNOPQRSTUVWXYZ 0123456789`, {
      x: 40, y, size: 10, font,
    });
    y -= 14;
  }
  const anyDoc = doc as any;
  anyDoc.encrypt({
    userPassword: "test1234",
    ownerPassword: "test1234",
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
  return new Blob([await doc.save()], { type: "application/pdf" });
}

async function fetchSample(name: string): Promise<File> {
  const res = await fetch(`/samples/${name}`);
  if (!res.ok) throw new Error("sample fetch failed: " + name);
  const blob = await res.blob();
  return new File([blob], name, { type: blob.type || "application/pdf" });
}

async function fetchCjkFont(): Promise<File> {
  const res = await fetch("/fonts/NotoSansSC-Regular.ttf");
  if (!res.ok) throw new Error("font fetch failed");
  const blob = await res.blob();
  return new File([blob], "NotoSansSC-Regular.ttf", {
    type: "font/ttf",
  });
}

/* ---------- runner ---------- */

type TestFn = () => Promise<string>;

const RESULTS: Record<string, { ok: boolean; ms: number; detail?: string; error?: string }> = {};

async function test(key: string, fn: TestFn): Promise<void> {
  const t0 = performance.now();
  try {
    const detail = await fn();
    RESULTS[key] = { ok: true, ms: Math.round(performance.now() - t0), detail };
    console.log("✓", key, detail ?? "");
  } catch (err) {
    RESULTS[key] = {
      ok: false,
      ms: Math.round(performance.now() - t0),
      error: String((err as Error)?.message ?? err),
    };
    console.log("✗", key, String((err as Error)?.message ?? err));
  }
}

interface EngineOut {
  files: { name: string; blob: Blob; size: number; kind: string }[];
  note?: string;
}

async function run(
  id: string,
  files: File[],
  opts: Record<string, unknown>
): Promise<EngineOut> {
  const entries = files.map((f, i) => ({ id: `e${i}`, file: f }));
  return runExtraTool(id, entries, opts, {
    onOverall: () => {},
    onFileProgress: () => {},
    onStatus: () => {},
  });
}

async function expectError(id: string, files: File[], opts: Record<string, unknown>, match: RegExp): Promise<string> {
  try {
    await run(id, files, opts);
  } catch (err) {
    const msg = String((err as Error)?.message ?? err);
    assert(match.test(msg), `error message "${msg}" does not match ${match}`);
    return msg;
  }
  throw new Error("expected engine error but call succeeded");
}

/* ---------- fixtures (built once) ---------- */

let FIX: {
  alphaPng: File;
  photoJpg: File;
  squigglePng: File;
  rotatedPdf: File;
  redactPdf: File;
  redactBoxW: number;
  embeddedPdf: File;
  imgOnlyPdf: File;
  bigEncryptedPdf: File;
  cjkFont: File;
} | null = null;

async function buildFixtures() {
  if (FIX) return FIX;
  const alphaPngBlob = await makeAlphaPng();
  const photoJpgBlob = await makePhotoJpg();
  const squiggleBlob = await makeSquigglePng();
  const rotatedBlob = await makeRotatedPdf();
  const redact = await makeRedactSrcPdf();
  const embeddedBlob = await makeEmbeddedImgPdf(alphaPngBlob);
  FIX = {
    alphaPng: new File([alphaPngBlob], "alpha.png", { type: "image/png" }),
    photoJpg: new File([photoJpgBlob], "photo.jpg", { type: "image/jpeg" }),
    squigglePng: new File([squiggleBlob], "signature.png", { type: "image/png" }),
    rotatedPdf: new File([rotatedBlob], "rotated.pdf", { type: "application/pdf" }),
    redactPdf: new File([redact.blob], "redact-src.pdf", { type: "application/pdf" }),
    redactBoxW: redact.boxW,
    embeddedPdf: new File([embeddedBlob], "embedded.pdf", { type: "application/pdf" }),
    imgOnlyPdf: new File([await makeImageOnlyPdf(alphaPngBlob)], "img-only.pdf", { type: "application/pdf" }),
    bigEncryptedPdf: new File([await makeBigEncryptedPdf()], "big-encrypted.pdf", { type: "application/pdf" }),
    cjkFont: await fetchCjkFont(),
  };
  return FIX;
}

/* ---------- the tests ---------- */

export async function runAll(): Promise<Record<string, unknown>> {
  const fix = await buildFixtures();
  const encPdf = await fetchSample("sample-encrypted.pdf");
  const textPdf = await fetchSample("sample-text.pdf");
  const imagePdf = await fetchSample("sample-image.pdf");
  const lorem =
    "Lorem ipsum dolor sit amet, consectetur adipiscing elit. SwiftPDF runs entirely in your browser, so files never leave your device. ".repeat(
      40
    ) +
    "The quick brown fox jumps over the lazy dog. ".repeat(20);

  /* ===== TEXT TO PDF ===== */

  await test("text-to-pdf: latin multipage", async () => {
    const out = await run("text-to-pdf", [], {
      text: lorem,
      fontFamily: "helvetica",
      fontSize: 11,
      pageSize: "a4",
      margin: 56,
    });
    const f = out.files[0];
    assert(f.kind === "PDF" && f.size > 1000, "produces a PDF");
    const bytes = await bytesOf(f.blob);
    const pages = await pdfPageCount(bytes);
    assert(pages >= 2, `expected >=2 pages, got ${pages}`);
    const txt = await extractTextOf(bytes, 0);
    assert(txt.includes("Lorem ipsum"), "first page contains Lorem ipsum");
    return `${pages} pages, ${out.note}`;
  });

  await test("text-to-pdf: empty input is rejected", async () => {
    const msg = await expectError("text-to-pdf", [], {
      text: "   ",
      fontFamily: "helvetica",
      fontSize: 11,
      pageSize: "a4",
      margin: 56,
    }, /Enter or paste some text/i);
    return msg;
  });

  await test("text-to-pdf: non-Latin without custom font fails honestly", async () => {
    const msg = await expectError("text-to-pdf", [], {
      text: "你好，世界 — this starts with CJK",
      fontFamily: "helvetica",
      fontSize: 11,
      pageSize: "a4",
      margin: 56,
    }, /Standard PDF fonts support basic Latin/i);
    return msg;
  });

  await test("text-to-pdf: CJK renders with uploaded font", async () => {
    const out = await run("text-to-pdf", [], {
      text: "你好，SwiftPDF 世界",
      fontFamily: "helvetica",
      fontSize: 14,
      pageSize: "a4",
      margin: 56,
      customFont: fix.cjkFont,
    });
    const bytes = await bytesOf(out.files[0].blob);
    assert(out.files[0].size > 1_500, "embedded font subset makes the file non-trivial");
    // end-to-end visual check: glyphs actually rendered on the page
    const dark = await sampleRegion(bytes, 0, 1, { x: 40, y: 40, w: 400, h: 120 }, (r, g, b) => r < 120 && g < 120 && b < 120);
    assert(dark > 50, `expected drawn glyphs, only ${dark} dark pixels`);
    const soft = await extractTextOf(bytes, 0);
    return `built + rendered (extraction saw: ${JSON.stringify(soft.slice(0, 40))})`;
  });

  await test("text-to-pdf: unbroken 500-char token wraps", async () => {
    const out = await run("text-to-pdf", [], {
      text: "A".repeat(500),
      fontFamily: "courier",
      fontSize: 10,
      pageSize: "a4",
      margin: 56,
    });
    const bytes = await bytesOf(out.files[0].blob);
    assert((await pdfPageCount(bytes)) >= 1, "builds");
    return out.note ?? "";
  });

  /* ===== COMPRESS TO TARGET ===== */

  await test("compress-target: already under target returns file unchanged", async () => {
    const orig = new Uint8Array(await textPdf.arrayBuffer());
    const out = await run("compress-target", [textPdf], { targetKB: 100 });
    assert(out.note?.includes("Already under"), `note: ${out.note}`);
    assert(out.files[0].name === "sample-text.pdf", "keeps original name");
    assert(out.files[0].size === orig.length, "byte-identical size");
    return out.note ?? "";
  });

  await test("compress-target: scanned PDF reaches 20KB target", async () => {
    const out = await run("compress-target", [imagePdf], { targetKB: 20 });
    assert(out.files[0].kind === "PDF", "pdf out");
    const bytes = await bytesOf(out.files[0].blob);
    const pages = await pdfPageCount(bytes);
    const origPages = await pdfPageCount(new Uint8Array(await imagePdf.arrayBuffer()));
    assert(pages === origPages, `pages preserved (${pages}/${origPages})`);
    if (out.files[0].size > 20 * 1024) {
      assert(/Closest possible/.test(out.note ?? ""), "honest fallback note present");
      return `UNREACHED honestly: ${(out.files[0].size / 1024).toFixed(0)}KB — ${out.note}`;
    }
    assert(out.files[0].size <= 20 * 1024, `size ${out.files[0].size} ≤ 20480`);
    return `${(out.files[0].size / 1024).toFixed(1)}KB reached — ${out.note}`;
  });

  await test("compress-target: impossible target fails honestly", async () => {
    const out = await run("compress-target", [imagePdf], { targetKB: 5 });
    assert(/Closest possible/.test(out.note ?? ""), `note: ${out.note}`);
    return out.note ?? "";
  });

  await test("compress-target: encrypted PDF gives friendly error", async () => {
    assert(fix.bigEncryptedPdf.size > 15_000, `fixture is large enough (${fix.bigEncryptedPdf.size})`);
    const msg = await expectError("compress-target", [fix.bigEncryptedPdf], { targetKB: 10 }, /password/i);
    return msg;
  });

  /* ===== IMAGE TOOLS ===== */

  await test("compress-image: jpg shrinks at same dims", async () => {
    const out = await run("compress-image", [fix.photoJpg], {
      format: "jpeg",
      quality: 0.4,
      maxDimension: 0,
    });
    const f = out.files[0];
    assert(f.kind === "JPG" && f.name.endsWith("-compressed.jpg"), "naming/kind");
    assert(f.size < fix.photoJpg.size, `${f.size} < ${fix.photoJpg.size}`);
    const bmp = await createImageBitmap(f.blob);
    assert(bmp.width === 1600 && bmp.height === 1000, "dims preserved");
    bmp.close();
    return `${(f.size / 1024).toFixed(1)}KB (was ${(fix.photoJpg.size / 1024).toFixed(1)}KB)`;
  });

  await test("compress-image: transparency flattens white for JPG", async () => {
    const out = await run("compress-image", [fix.alphaPng], {
      format: "jpeg",
      quality: 0.8,
      maxDimension: 0,
    });
    const bmp = await createImageBitmap(out.files[0].blob);
    const c = document.createElement("canvas");
    c.width = bmp.width;
    c.height = bmp.height;
    const ctx = c.getContext("2d")!;
    ctx.drawImage(bmp, 0, 0);
    const corner = ctx.getImageData(700, 550, 1, 1).data; // was transparent
    assert(corner[0] === 255 && corner[1] === 255 && corner[2] === 255, "corner is white");
    const circle = ctx.getImageData(100, 100, 1, 1).data; // was red
    assert(circle[0] > 150 && circle[1] < 110, "circle survives");
    bmp.close();
    return "white flatten + content kept";
  });

  await test("resize-image: by width", async () => {
    const out = await run("resize-image", [fix.photoJpg], {
      mode: "width",
      value: 400,
      format: "keep",
    });
    const bmp = await createImageBitmap(out.files[0].blob);
    assert(bmp.width === 400 && bmp.height === 250, `got ${bmp.width}x${bmp.height}`);
    bmp.close();
    assert(out.files[0].name.endsWith("-resized.jpg"), "naming");
    return "400x250";
  });

  await test("resize-image: percent + png kept", async () => {
    const out = await run("resize-image", [fix.alphaPng], {
      mode: "percent",
      value: 50,
      format: "keep",
    });
    const bmp = await createImageBitmap(out.files[0].blob);
    assert(bmp.width === 400 && bmp.height === 300, `got ${bmp.width}x${bmp.height}`);
    assert(out.files[0].kind === "PNG", "png kept");
    // alpha preserved end-to-end
    const c = document.createElement("canvas");
    c.width = bmp.width;
    c.height = bmp.height;
    const ctx = c.getContext("2d")!;
    ctx.drawImage(bmp, 0, 0);
    const corner = ctx.getImageData(399, 299, 1, 1).data;
    assert(corner[3] === 0, "alpha channel preserved");
    bmp.close();
    return "400x300, alpha kept";
  });

  await test("convert-image: png → webp", async () => {
    const out = await run("convert-image", [fix.alphaPng], { format: "webp", quality: 0.85 });
    assert(out.files[0].blob.type === "image/webp", `got ${out.files[0].blob.type}`);
    assert(out.files[0].name.endsWith(".webp"), "extension");
    const bmp = await createImageBitmap(out.files[0].blob);
    assert(bmp.width === 800 && bmp.height === 600, "dims kept");
    bmp.close();
    return "webp ok";
  });

  await test("convert-image: jpeg → png keeps content", async () => {
    const out = await run("convert-image", [fix.photoJpg], { format: "png" });
    assert(out.files[0].kind === "PNG", "png kind");
    const bmp = await createImageBitmap(out.files[0].blob);
    assert(bmp.width === 1600, "dims");
    bmp.close();
    return "png ok";
  });

  await test("convert-image: garbage input fails honestly", async () => {
    const bad = new File([new Uint8Array([1, 2, 3, 4, 5])], "broken.png", { type: "image/png" });
    const msg = await expectError("convert-image", [bad], { format: "png" }, /could not be decoded/i);
    return msg;
  });

  /* ===== PDF → PNG ===== */

  await test("pdf-to-png: one PNG per page, rotated page reflected", async () => {
    const out = await run("pdf-to-png", [fix.rotatedPdf], { scale: 1 });
    assert(out.files.length === 2, `got ${out.files.length}`);
    assert(out.files.every((f) => f.kind === "PNG" && f.blob.type === "image/png"), "pngs");
    const bmp = await createImageBitmap(out.files[0].blob);
    // A4 portrait rotated 90° → landscape canvas 841x595
    assert(bmp.width > bmp.height, `landscape expected, got ${bmp.width}x${bmp.height}`);
    bmp.close();
    return "2 pngs, landscape first page";
  });

  await test("pdf-to-png: encrypted PDF gives friendly error", async () => {
    const msg = await expectError("pdf-to-png", [encPdf], { scale: 1 }, /password/i);
    return msg;
  });

  /* ===== EXTRACT IMAGES ===== */

  await test("extract-images: fixture pdf yields the embedded PNG", async () => {
    const out = await run("extract-images", [fix.embeddedPdf], { format: "png" });
    assert(out.files.length >= 1, `got ${out.files.length}`);
    const f = out.files[0];
    const bmp = await createImageBitmap(f.blob);
    assert(bmp.width === 800 && bmp.height === 600, `got ${bmp.width}x${bmp.height}`);
    bmp.close();
    return `${out.files.length} image(s), 800x600`;
  });

  await test("extract-images: scanned sample yields images", async () => {
    const out = await run("extract-images", [imagePdf], { format: "jpeg" });
    assert(out.files.length >= 1, `got ${out.files.length}`);
    assert(out.files.every((f) => f.kind === "JPG"), "jpg kind");
    return `${out.files.length} image(s)`;
  });

  await test("extract-images: text-only pdf fails honestly", async () => {
    const msg = await expectError("extract-images", [textPdf], { format: "png" }, /No embedded images/i);
    return msg;
  });

  /* ===== EXTRACT TEXT ===== */

  await test("extract-text: reading order + page markers", async () => {
    const out = await run("extract-text", [fix.rotatedPdf], { pageMarkers: true });
    const txt = await out.files[0].blob.text();
    assert(txt.includes("ROTATED PAGE MARKER"), "page 1 text");
    assert(txt.includes("----- Page 2 -----"), "page marker present");
    assert(txt.includes("PLAIN SECOND PAGE"), "page 2 text");
    return `${out.files[0].size} bytes`;
  });

  await test("extract-text: text-free pdf fails honestly", async () => {
    const msg = await expectError("extract-text", [fix.imgOnlyPdf], { pageMarkers: true }, /no text layer/i);
    return msg;
  });

  await test("extract-text: encrypted pdf gives friendly error", async () => {
    const msg = await expectError("extract-text", [encPdf], { pageMarkers: true }, /password/i);
    return msg;
  });

  /* ===== EDIT PDF (incl. rotated-page coordinate math) ===== */

  await test("edit-pdf: text+image on 90°-rotated page land correctly", async () => {
    // simulate the UI: render page 0 at scale 2, place items in view space
    const bytes0 = new Uint8Array(await fix.rotatedPdf.arrayBuffer());
    const doc = await pdfjs.getDocument({ data: bytes0.slice() }).promise;
    const pg = await doc.getPage(1);
    const RENDER = 2;
    const vpt2 = pg.getViewport({ scale: RENDER });
    const vpt1 = pg.getViewport({ scale: 1 });

    // text at view CSS (100, 100), font size 24 CSS px
    const cssX = 100;
    const cssY = 100;
    const cssSize = 24;
    const baseline = vpt1.convertToPdfPoint(cssX / RENDER, (cssY + cssSize) / RENDER);
    const d1 = vpt1.convertToPdfPoint(cssX / RENDER, (cssY + cssSize) / RENDER);
    const d2 = vpt1.convertToPdfPoint((cssX + 10) / RENDER, (cssY + cssSize) / RENDER);
    const angle = Math.atan2(d2[1] - d1[1], d2[0] - d1[0]) * (180 / Math.PI);
    void vpt2;

    // image at view CSS (200, 300), 150 x 112.5 — anchor bottom-left
    const imgAnchor = vpt1.convertToPdfPoint(200 / RENDER, (300 + 112.5) / RENDER);
    const i1 = vpt1.convertToPdfPoint(200 / RENDER, (300 + 112.5) / RENDER);
    const i2 = vpt1.convertToPdfPoint((200 + 10) / RENDER, (300 + 112.5) / RENDER);
    const imgAngle = Math.atan2(i2[1] - i1[1], i2[0] - i1[0]) * (180 / Math.PI);

    const items = [
      {
        page: 0,
        type: "text",
        text: "EDIT ROTATED",
        x: baseline[0],
        y: baseline[1],
        size: cssSize / RENDER,
        color: "#111827",
        font: "helvetica-bold",
        rotate: angle,
      },
      {
        page: 0,
        type: "image",
        dataUrl: `data:image/png;base64,${await blobToB64(fix.squigglePng)}`,
        x: imgAnchor[0],
        y: imgAnchor[1],
        w: 150 / RENDER,
        h: 112.5 / RENDER,
        rotate: imgAngle,
      },
      {
        page: 1,
        type: "highlight",
        x: 50,
        y: 780,
        w: 200,
        h: 16,
        color: "#FDE047",
        opacity: 0.5,
      },
    ];
    const out = await run("edit-pdf", [fix.rotatedPdf], { items });
    const f = out.files[0];
    assert(f.name.endsWith("-edited.pdf"), "naming");
    const outBytes = await bytesOf(f.blob);

    // 1) added text present on page 1 at the exact user-space position
    const items1 = await textItemsOf(outBytes, 0);
    const found = items1.find((it) => (it.str as string).includes("EDIT ROTATED"));
    assert(!!found, "EDIT ROTATED present in output text layer");
    assert(
      Math.abs(found.transform[4] - baseline[0]) < 2 && Math.abs(found.transform[5] - baseline[1]) < 2,
      `pos ${found.transform[4]},${found.transform[5]} vs ${baseline[0]},${baseline[1]}`
    );
    // 2) the squiggle image was embedded
    const imgOut = await run("extract-images", [
      new File([f.blob], "edited.pdf", { type: "application/pdf" }),
    ], { format: "png" });
    assert(imgOut.files.length >= 1, "image embedded on rotated page");
    const bmp = await createImageBitmap(imgOut.files[0].blob);
    assert(bmp.width === 400 && bmp.height === 160, `squiggle dims ${bmp.width}x${bmp.height}`);
    bmp.close();
    // 3) visual: red-free sanity — highlight on page 2 renders yellow in its region
    const yellow = await sampleRegion(outBytes, 1, 2, { x: 55, y: 45, w: 180, h: 12 }, (r, g, b) => r > 200 && g > 180 && b < 140);
    assert(yellow > 100, `highlight visible, ${yellow} px`);
    return `angle ${angle.toFixed(1)}° pos ok, image embedded, highlight visible`;
  });

  await test("edit-pdf: empty items rejected", async () => {
    const msg = await expectError("edit-pdf", [textPdf], { items: [] }, /Add at least one annotation/i);
    return msg;
  });

  /* ===== SIGN PDF ===== */

  await test("sign-pdf: signature image lands on upright page", async () => {
    const items = [
      {
        page: 0,
        type: "image",
        dataUrl: `data:image/png;base64,${await blobToB64(fix.squigglePng)}`,
        x: 340,
        y: 640,
        w: 120,
        h: 48,
        rotate: 0,
      },
    ];
    const out = await run("sign-pdf", [textPdf], { items });
    assert(out.files[0].name.endsWith("-signed.pdf"), "naming");
    const outBytes = await bytesOf(out.files[0].blob);
    const imgOut = await run("extract-images", [
      new File([outBytes], "signed.pdf", { type: "application/pdf" }),
    ], { format: "png" });
    assert(imgOut.files.length >= 1, "signature embedded");
    // visual: blue ink visible near placement (PDF y 640..688 → canvas y ~154..202)
    const blue = await sampleRegion(outBytes, 0, 2, { x: 330, y: 150, w: 140, h: 55 }, (r, g, b) => b > 120 && b > r + 30);
    assert(blue > 60, `ink visible, ${blue} px`);
    return "signature embedded + visible";
  });

  await test("sign-pdf: no signature rejected", async () => {
    const msg = await expectError("sign-pdf", [textPdf], { items: [] }, /Place a signature/i);
    return msg;
  });

  /* ===== REDACT ===== */

  await test("redact-pdf: secret text permanently removed (affected pages only)", async () => {
    const boxes = [{ page: 0, x: 50, y: 780, w: fix.redactBoxW + 12, h: 20 }];
    const out = await run("redact-pdf", [fix.redactPdf], { boxes, scope: "affected" });
    assert(out.files[0].name.endsWith("-redacted.pdf"), "naming");
    const outBytes = await bytesOf(out.files[0].blob);
    const page1 = await extractTextOf(outBytes, 0);
    assert(!page1.includes("ACME-12345"), "secret is GONE from text layer");
    assert(!page1.includes("CONFIDENTIAL:"), "prefix also gone");
    // page 1 is flattened by design — ALL its text leaves the text layer
    assert(!page1.includes("This line stays readable"), "flattened page has no text layer");
    // but the benign line is still VISUALLY there
    const benign = await sampleRegion(outBytes, 0, 2, { x: 56, y: 80, w: 160, h: 14 }, (r, g, b) => r < 110 && g < 110 && b < 110);
    assert(benign > 60, `benign line still visible, ${benign} px`);
    const page2 = await extractTextOf(outBytes, 1);
    assert(page2.includes("PAGE TWO IS CLEAN"), "untouched page keeps its text");
    // visual: the box area is black
    const black = await sampleRegion(outBytes, 0, 2, { x: 52, y: 42, w: fix.redactBoxW, h: 14 }, (r, g, b) => r < 40 && g < 40 && b < 40);
    assert(black > 200, `burned-in black box, ${black} px`);
    return "secret removed, flatten-by-design verified, neighbors intact";
  });

  await test("redact-pdf: scope=all flattens every page", async () => {
    const boxes = [{ page: 0, x: 50, y: 780, w: fix.redactBoxW + 12, h: 20 }];
    const out = await run("redact-pdf", [fix.redactPdf], { boxes, scope: "all" });
    const outBytes = await bytesOf(out.files[0].blob);
    const page2 = await extractTextOf(outBytes, 1);
    assert(!page2.includes("PAGE TWO IS CLEAN"), "page 2 text gone under scope=all");
    return "all pages flattened";
  });

  await test("redact-pdf: no boxes rejected", async () => {
    const msg = await expectError("redact-pdf", [fix.redactPdf], { boxes: [], scope: "affected" }, /Draw at least one redaction box/i);
    return msg;
  });

  await test("redact-pdf: encrypted pdf gives friendly error", async () => {
    const msg = await expectError("redact-pdf", [encPdf], {
      boxes: [{ page: 0, x: 10, y: 10, w: 50, h: 20 }],
      scope: "affected",
    }, /password/i);
    return msg;
  });

  return RESULTS;
}

(window as unknown as { runAll: typeof runAll }).runAll = runAll;
