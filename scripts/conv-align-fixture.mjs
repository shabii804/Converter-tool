/**
 * Alignment fixtures for the user-reported bug:
 * "the alignment of pic and the alignment of text changes or breaks when converting"
 *
 *  - tests/conv/fixture-align-doc.docx : Word doc that uses every alignment
 *    Word offers — centered Heading 1, centered body, right body, justified
 *    body, a centered picture, a right-aligned picture, a table with a
 *    centered cell — next to plain left text as the control.
 *  - tests/conv/fixture-align.pdf : PDF built like a designed export —
 *    centered title block, right-aligned date line, a manually justified
 *    body block (every line stretched to the exact same right edge), a
 *    centered image and a right-aligned image.
 *
 * Both are pure-node (no browser needed): PNG encoder uses node zlib.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import zlib from "node:zlib";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import {
  Document,
  Paragraph,
  TextRun,
  ImageRun,
  AlignmentType,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  Packer,
} from "docx";

const here = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(here, "../tests/conv");
mkdirSync(OUT, { recursive: true });

/* ---------- minimal PNG encoder (RGBA, filter none) ---------- */
function makePng(W, H, pixelFn) {
  const raw = Buffer.alloc((W * 4 + 1) * H);
  for (let y = 0; y < H; y++) {
    raw[y * (W * 4 + 1)] = 0;
    for (let x = 0; x < W; x++) {
      const i = y * (W * 4 + 1) + 1 + x * 4;
      const [r, g, b, a] = pixelFn(x, y);
      raw[i] = r;
      raw[i + 1] = g;
      raw[i + 2] = b;
      raw[i + 3] = a;
    }
  }
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
    const crcTable = [];
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      crcTable[n] = c >>> 0;
    }
    let crc = 0xffffffff;
    for (const b of td) crc = crcTable[(crc ^ b) & 0xff] ^ (crc >>> 8);
    crc = (crc ^ 0xffffffff) >>> 0;
    const crcB = Buffer.alloc(4);
    crcB.writeUInt32BE(crc);
    return Buffer.concat([len, td, crcB]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/* big photo-ish PNG 200x140 — saturated gradient so the rendered centroid
   of colored pixels is measurable in the output PDF */
const W = 200,
  H = 140;
const png = makePng(W, H, (x, y) => [
  Math.round((x / W) * 255),
  40 + Math.round((y / H) * 120),
  255 - Math.round((x / W) * 255),
  255,
]);
const pngSmall = makePng(120, 84, (x, y) => [
  255 - Math.round((y / 84) * 255),
  Math.round((x / 120) * 200),
  60,
  255,
]);

/* ================= fixture-align-doc.docx ================= */

const para = (text, alignment, extra = {}) =>
  new Paragraph({ alignment, ...extra, children: [new TextRun({ text })] });

const docx = new Document({
  sections: [
    {
      children: [
        // 1. centered HEADING — Word exports <w:pStyle w:val="Heading1"/> + <w:jc center/>
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "Quarterly Sales Report", bold: true })],
        }),
        // 2. centered body paragraph, long enough to wrap onto 2 lines
        para(
          "This report summarizes the quarterly performance across all regional offices including revenue growth staffing changes and customer satisfaction metrics for the entire organization this year.",
          AlignmentType.CENTER
        ),
        // 3. right-aligned line
        para("Submitted by the Finance Department", AlignmentType.RIGHT),
        // 4. justified paragraph — wraps to several full lines
        para(
          "The finance team reviewed every line item carefully and confirmed that the budget forecast remains accurate despite the market volatility that affected several product categories during the second quarter of the fiscal year.",
          AlignmentType.JUSTIFIED
        ),
        // 5. centered picture
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new ImageRun({
              type: "png",
              data: png,
              transformation: { width: 200, height: 140 },
            }),
          ],
        }),
        // 6. right-aligned picture
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [
            new ImageRun({
              type: "png",
              data: pngSmall,
              transformation: { width: 120, height: 84 },
            }),
          ],
        }),
        // 7. table with a centered cell next to left cells
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  children: [para("Region", AlignmentType.CENTER)],
                }),
                new TableCell({
                  children: [para("Revenue", AlignmentType.CENTER)],
                }),
              ],
            }),
            new TableRow({
              children: [
                new TableCell({
                  children: [para("North", AlignmentType.CENTER)],
                }),
                new TableCell({ children: [para("$1,240,000")] }),
              ],
            }),
            new TableRow({
              children: [
                new TableCell({
                  children: [para("South", AlignmentType.CENTER)],
                }),
                new TableCell({ children: [para("$980,500")] }),
              ],
            }),
          ],
        }),
        // 8. plain left paragraph (control)
        para("Plain left aligned closing paragraph for reference.", undefined),
      ],
    },
  ],
});

const buf = await Packer.toBuffer(docx);
writeFileSync(path.join(OUT, "fixture-align-doc.docx"), buf);
console.log("OK fixture-align-doc.docx", buf.length, "bytes");

/* ================= fixture-align.pdf ================= */

const pdf = await PDFDocument.create();
const page = pdf.addPage([612, 792]); // US Letter, same as engine default
const helv = await pdf.embedFont(StandardFonts.Helvetica);
const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
page.drawRectangle({
  x: 0,
  y: 0,
  width: 612,
  height: 792,
  color: rgb(1, 1, 1),
});

const M = 56;
const RIGHT = 612 - M; // text column right edge = 556
let y = 730;
const center = (text, font, size) => {
  const w = font.widthOfTextAtSize(text, size);
  page.drawText(text, { x: (612 - w) / 2, y, size, font });
  y -= size * 1.5;
};
const rightLine = (text, font, size) => {
  const w = font.widthOfTextAtSize(text, size);
  page.drawText(text, { x: RIGHT - w, y, size, font });
  y -= size * 1.6;
};
const leftLine = (text, font, size) => {
  page.drawText(text, { x: M, y, size, font });
  y -= size * 1.55;
};
/* manually justified line: word-by-word with the gap stretched so the
   line's right edge lands EXACTLY on the column edge — the same visual
   signature Word's "justify" produces in an exported PDF */
const justifiedLine = (words, font, size) => {
  const spaceW = font.widthOfTextAtSize(" ", size);
  const wordsW = words.reduce(
    (a, wd) => a + font.widthOfTextAtSize(wd, size),
    0
  );
  const gap = (RIGHT - M - wordsW) / (words.length - 1);
  let x = M;
  for (const wd of words) {
    page.drawText(wd, { x, y, size, font });
    x += font.widthOfTextAtSize(wd, size) + gap;
  }
  y -= size * 1.55;
};

// centered title block
center("Certificate of Achievement", bold, 22);
center("This certificate is proudly presented to", helv, 11);
center("Jordan Alexandra Whitfield", bold, 15);

// right-aligned block
rightLine("Date: October 14, 2026", helv, 11);
rightLine("Reference: QA-2026-114", helv, 11);

// justified body block — 3 full-stretched lines + a short last line
y -= 10;
justifiedLine(
  ["The", "program", "evaluated", "every", "submitted", "entry", "against"],
  helv,
  11
);
justifiedLine(
  ["the", "published", "criteria", "and", "recorded", "the", "results"],
  helv,
  11
);
justifiedLine(
  ["in", "the", "official", "register", "for", "the", "current", "term."],
  helv,
  11
);
leftLine("All findings were archived for review.", helv, 11);

// centered image
const emb = await pdf.embedPng(png);
const embS = await pdf.embedPng(pngSmall);
y -= 30;
const imgY = y - H;
page.drawImage(emb, { x: (612 - W) / 2, y: imgY, width: W, height: H });
y = imgY - 24;
// right-aligned image
page.drawImage(embS, { x: RIGHT - 120, y: y - 84, width: 120, height: 84 });
y = y - 84 - 30;

// left text below
leftLine("End of the alignment fixture page.", helv, 11);

const pdfBytes = await pdf.save();
writeFileSync(path.join(OUT, "fixture-align.pdf"), pdfBytes);
console.log("OK fixture-align.pdf", pdfBytes.length, "bytes");

/* expected geometry reference (printed for the QA report) */
console.log(
  JSON.stringify({
    pdfPageW: 612,
    colLeft: M,
    colRight: RIGHT,
    colCenter: (M + RIGHT) / 2,
    pageCenter: 306,
    imgCenteredX: (612 - W) / 2,
    imgRightX: RIGHT - 120,
  })
);
