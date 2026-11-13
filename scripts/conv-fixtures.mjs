/**
 * Conversion QA fixtures — deterministic styled documents used to check
 * PDF→Word and Word→PDF fidelity.
 *  - tests/conv/fixture-report.pdf : centered title, wrapped body with a bold
 *    span, right-aligned date, bullet list, ruled table
 *  - tests/conv/fixture-doc.docx   : headings, mixed bold/italic, centered +
 *    right paragraphs, bullets, a real table
 *  - tests/conv/fixture-image.pdf  : body text + an alpha PNG logo, an opaque
 *    gradient "photo" and a small stamp painted twice (dedupe path)
 */
import { mkdirSync, writeFileSync } from "node:fs";
import zlib from "node:zlib";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
} from "docx";

const here = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(here, "../tests/conv");
mkdirSync(OUT, { recursive: true });

/* ---------------- fixture-report.pdf ---------------- */

const pdf = await PDFDocument.create();
const page = pdf.addPage([595.28, 841.89]); // A4
const helv = await pdf.embedFont(StandardFonts.Helvetica);
const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
const M = 56;
const right = 595.28 - M;
let y = 780;

const drawCentered = (text, font, size) => {
  const w = font.widthOfTextAtSize(text, size);
  page.drawText(text, { x: (595.28 - w) / 2, y, size, font });
  y -= size * 1.5;
};
const drawRight = (text, font, size) => {
  const w = font.widthOfTextAtSize(text, size);
  page.drawText(text, { x: right - w, y, size, font });
  y -= size * 1.5;
};

drawCentered("Quarterly Business Report", bold, 22);
drawCentered("Prepared by the Finance Department", helv, 12);
y -= 14;
drawRight("October 2026", helv, 11);

// wrapped body paragraph with a bold span in the middle
const body =
  "Revenue grew steadily through the third quarter, driven by strong " +
 "subscription renewals and a notable increase in enterprise accounts. " +
  "Operating costs remained flat, which lifted the overall margin profile " +
  "well above the plan we shared in January.";
const wrap = (text, font, size, maxW) => {
  const words = text.split(" ");
  const lines = [];
  let cur = "";
  for (const w of words) {
    const t = cur ? cur + " " + w : w;
    if (font.widthOfTextAtSize(t, size) > maxW && cur) {
      lines.push(cur);
      cur = w;
    } else cur = t;
  }
  if (cur) lines.push(cur);
  return lines;
};
const bodySize = 11;
const bodyLines = wrap(body, helv, bodySize, right - M);
for (const line of bodyLines) {
  page.drawText(line, { x: M, y, size: bodySize, font: helv });
  y -= bodySize * 1.45;
}
y -= 10;

// bullet list
for (const item of [
  "Subscription revenue up 14% quarter over quarter",
  "Enterprise pipeline doubled after the June launch",
  "Headcount held steady at forty-two employees",
]) {
  page.drawText("\u2022  " + item, { x: M + 14, y, size: bodySize, font: helv });
  y -= bodySize * 1.6;
}
y -= 12;

// ruled table, 3 cols x 4 rows
const rows = [
  ["Region", "Revenue", "Growth"],
  ["North America", "$412,000", "12%"],
  ["Europe", "$268,500", "9%"],
  ["Asia Pacific", "$151,200", "18%"],
];
const colW = [150, 120, 90];
const rowH = 22;
const tableX = M + 20;
for (let r = 0; r < rows.length; r++) {
  let x = tableX;
  for (let c = 0; c < rows[r].length; c++) {
    page.drawText(rows[r][c], {
      x: x + 5,
      y: y - rowH + 6,
      size: 10,
      font: r === 0 ? bold : helv,
    });
    x += colW[c];
  }
  // horizontal rule
  page.drawLine({
    start: { x: tableX, y },
    end: { x: tableX + colW.reduce((a, b) => a + b, 0), y },
    thickness: 0.7,
    color: rgb(0.2, 0.2, 0.2),
  });
  y -= rowH;
}
page.drawLine({
  start: { x: tableX, y: y + rowH },
  end: { x: tableX + colW.reduce((a, b) => a + b, 0), y: y + rowH },
  thickness: 0.7,
  color: rgb(0.2, 0.2, 0.2),
});
// vertical rules
const vx = [tableX];
for (const w of colW) vx.push(vx[vx.length - 1] + w);
const tableTop = y + rowH * (rows.length + 1) + rowH * 0;
const tableBottom = y + rowH;
for (const x of vx) {
  page.drawLine({
    start: { x, y: tableTop },
    end: { x, y: tableBottom },
    thickness: 0.7,
    color: rgb(0.2, 0.2, 0.2),
  });
}

writeFileSync(
  path.join(OUT, "fixture-report.pdf"),
  await pdf.save()
);
console.log("fixture-report.pdf written");

/* ---------------- fixture-doc.docx ---------------- */

const cell = (t, boldCell) =>
  new TableCell({
    children: [
      new Paragraph({
        children: [new TextRun({ text: t, bold: !!boldCell, size: 20 })],
      }),
    ],
  });

const doc = new Document({
  sections: [
    {
      children: [
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          children: [new TextRun({ text: "Project Overview", bold: true })],
        }),
        new Paragraph({
          children: [
            new TextRun({
              text:
                "The migration plan covers every team workspace and keeps " +
                "the shared drive online while the copy runs. ",
            }),
            new TextRun({ text: "Downtime is expected to stay under one hour", bold: true }),
            new TextRun({ text: ", and the " }),
            new TextRun({ text: "rollback procedure", italic: true }),
            new TextRun({
              text:
                " has been rehearsed twice with the on-call rotation.",
            }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "Prepared by the Platform Team" })],
        }),
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [new TextRun({ text: "Revised October 2026" })],
        }),
        new Paragraph({
          children: [
            new TextRun({
              text:
                "Each workspace keeps its permission model during the move. " +
                "Owners receive a summary the moment their space finishes " +
                "copying, and anyone with an open draft is asked to save " +
                "before the window begins so nothing is lost mid-transfer.",
            }),
          ],
        }),
        new Paragraph({
          children: [new TextRun({ text: "Key milestones:", bold: true })],
        }),
        new Paragraph({
          children: [new TextRun({ text: "Inventory complete by Friday" })],
          bullet: { level: 0 },
        }),
        new Paragraph({
          children: [new TextRun({ text: "Pilot group migrated next week" })],
          bullet: { level: 0 },
        }),
        new Paragraph({
          children: [new TextRun({ text: "Company-wide cutover on the 30th" })],
          bullet: { level: 0 },
        }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                cell("Workspace", true),
                cell("Owner", true),
                cell("Status", true),
              ],
            }),
            new TableRow({
              children: [cell("Design"), cell("Aisha"), cell("Done")],
            }),
            new TableRow({
              children: [cell("Engineering"), cell("Marco"), cell("In progress")],
            }),
          ],
        }),
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [new TextRun({ text: "Next Steps", bold: true })],
        }),
        new Paragraph({
          children: [
            new TextRun({
              text:
                "Confirm the pilot roster with team leads and circulate the " +
                "final schedule before the end of the week.",
            }),
          ],
        }),
      ],
    },
  ],
});

const buf = await Packer.toBlob(doc);
writeFileSync(path.join(OUT, "fixture-doc.docx"), Buffer.from(await buf.arrayBuffer()));
console.log("fixture-doc.docx written");

/* ---------------- fixture-image.pdf ---------------- */

/* minimal deterministic PNG encoder (RGBA, no filters) */
const CRC_TABLE = new Int32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c;
});
const crc32 = (buf) => {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
};
const pngChunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
};
const encodePng = (width, height, rgba) => {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
};

/* logo: 120x80, transparent background, filled circle + inner bar */
const LW = 120, LH = 80;
const logo = Buffer.alloc(LW * LH * 4);
for (let y = 0; y < LH; y++) {
  for (let x = 0; x < LW; x++) {
    const j = (y * LW + x) * 4;
    const inCircle = (x - 60) ** 2 + (y - 40) ** 2 <= 34 ** 2;
    const inBar = x >= 44 && x <= 76 && y >= 34 && y <= 46;
    if (inBar) {
      logo[j] = 255; logo[j + 1] = 255; logo[j + 2] = 255; logo[j + 3] = 255;
    } else if (inCircle) {
      logo[j] = 225; logo[j + 1] = 29; logo[j + 2] = 72; logo[j + 3] = 255;
    } else {
      logo[j + 3] = 0; // fully transparent
    }
  }
}

/* photo: 200x120 opaque diagonal gradient with stripes */
const PW = 200, PH = 120;
const photo = Buffer.alloc(PW * PH * 4);
for (let y = 0; y < PH; y++) {
  for (let x = 0; x < PW; x++) {
    const j = (y * PW + x) * 4;
    const t = (x + y) / (PW + PH);
    const stripe = Math.floor(x / 12) % 2 === 0 ? 0 : 24;
    photo[j] = Math.round(40 + t * 180) + stripe;
    photo[j + 1] = Math.round(70 + t * 120);
    photo[j + 2] = Math.round(160 - t * 90);
    photo[j + 3] = 255;
  }
}

/* stamp: 48x48 opaque checker */
const SW = 48, SH = 48;
const stamp = Buffer.alloc(SW * SH * 4);
for (let y = 0; y < SH; y++) {
  for (let x = 0; x < SW; x++) {
    const j = (y * SW + x) * 4;
    const on = (Math.floor(x / 8) + Math.floor(y / 8)) % 2 === 0;
    stamp[j] = on ? 16 : 240;
    stamp[j + 1] = on ? 90 : 240;
    stamp[j + 2] = on ? 160 : 240;
    stamp[j + 3] = 255;
  }
}

const pdfImg = await PDFDocument.create();
const pg = pdfImg.addPage([595.28, 841.89]);
const helv2 = await pdfImg.embedFont(StandardFonts.Helvetica);
const bold2 = await pdfImg.embedFont(StandardFonts.HelveticaBold);

pg.drawText("Product Catalog Preview", {
  x: 72, y: 780, size: 20, font: bold2,
});
pg.drawText(
  "Each listing ships with a hero shot and a compliance stamp. The images below keep their original positions after conversion.",
  { x: 72, y: 752, size: 11, font: helv2, maxWidth: 380, lineHeight: 15 }
);

const logoImg = await pdfImg.embedPng(encodePng(LW, LH, logo));
const photoImg = await pdfImg.embedPng(encodePng(PW, PH, photo));
const stampImg = await pdfImg.embedPng(encodePng(SW, SH, stamp));

/* known placements in PDF user space */
pg.drawImage(logoImg, { x: 440, y: 730, width: 120, height: 80 });
pg.drawImage(photoImg, { x: 72, y: 520, width: 220, height: 132 });
pg.drawText("Hero shot", { x: 72, y: 500, size: 10, font: helv2 });
pg.drawImage(stampImg, { x: 340, y: 560, width: 96, height: 96 });
pg.drawImage(stampImg, { x: 460, y: 560, width: 48, height: 48 });
pg.drawText("Compliance stamps", { x: 340, y: 540, size: 10, font: helv2 });

writeFileSync(path.join(OUT, "fixture-image.pdf"), await pdfImg.save());
console.log("fixture-image.pdf written");
