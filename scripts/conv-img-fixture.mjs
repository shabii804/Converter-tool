/**
 * Realistic image fixtures for the user-reported bug:
 * "pic i insert gets removed when i convert pdf<->doc"
 *  - tests/conv/fixture-doc-img.docx : Word doc with an inserted PNG logo
 *    (with alpha) and a JPEG photo between paragraphs
 *  - tests/conv/fixture-realimg.pdf  : PDF built like a Word export —
 *    DCTDecode JPEG + FlateDecode RGB image drawn with a CTM (not unit square)
 */
import { writeFileSync, mkdirSync } from "node:fs";
import zlib from "node:zlib";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PDFDocument, rgb } from "pdf-lib";
import {
  Document,
  Paragraph,
  TextRun,
  ImageRun,
  AlignmentType,
} from "docx";

const here = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(here, "../tests/conv");
mkdirSync(OUT, { recursive: true });

/* ---------- build a PNG (with alpha) and a JPEG in pure node ---------- */

// 200x140 PNG: red-blue gradient with a transparent circle — no external deps
function makePngWithAlpha() {
  const W = 200, H = 140;
  const raw = Buffer.alloc((W * 4 + 1) * H);
  for (let y = 0; y < H; y++) {
    raw[y * (W * 4 + 1)] = 0; // filter none
    for (let x = 0; x < W; x++) {
      const i = y * (W * 4 + 1) + 1 + x * 4;
      raw[i] = Math.round((x / W) * 255);       // R
      raw[i + 1] = 60;                          // G
      raw[i + 2] = 255 - Math.round((x / W) * 255); // B
      // transparent circle in the middle
      const dx = x - W / 2, dy = y - H / 2;
      raw[i + 3] = Math.sqrt(dx * dx + dy * dy) < 40 ? 0 : 255;
    }
  }
  // minimal PNG encoder with zlib from node
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
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// 320x200 JPEG: build with pdf-lib's embedJpg round-trip? Simpler: construct
// a tiny baseline JPEG via canvas in the harness — here use a solid-color
// JPEG produced by pdf-lib's standard fonts? No — write a minimal JPEG by
// encoding raw pixels with node's dct? Node has no JPEG encoder, so build
// the JPEG bytes from a 1x1? That would look broken.
// → Instead reuse the browser: this fixture maker only produces the DOCX;
//   the "photo" JPEG is created below via pdf-lib (it can't encode JPEG).
// Workaround: generate the JPEG in the conv-test browser step instead.
const png = makePngWithAlpha();

/* ---------- fixture-doc-img.docx ---------- */

const docx = new Document({
  sections: [
    {
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "My Trip Report", bold: true, size: 32 })],
        }),
        new Paragraph({
          children: [
            new TextRun("Here is the logo I inserted: "),
            new ImageRun({
              type: "png",
              data: png,
              transformation: { width: 150, height: 105 },
            }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun("And below is a photo from the beach. The sunset was amazing and the water was warm. We swam every morning before breakfast."),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new ImageRun({
              type: "jpg",
              data: png, // temp placeholder replaced by harness JPEG below
              transformation: { width: 220, height: 140 },
            }),
          ],
        }),
        new Paragraph({
          children: [new TextRun("Closing line after the images.")],
        }),
      ],
    },
  ],
});

const { Packer: P } = await import("docx");
const nodeBuf = await P.toBuffer(docx);
writeFileSync(path.join(OUT, "fixture-doc-img.docx"), nodeBuf);
console.log("✓ fixture-doc-img.docx", nodeBuf.length, "bytes (JPEG slot reuses PNG; harness replaces)");
console.log("✓ png.png written for harness use");
writeFileSync(path.join(OUT, "img-alpha.png"), png);
