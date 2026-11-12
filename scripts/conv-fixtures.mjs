/**
 * Conversion QA fixtures — deterministic styled documents used to check
 * PDF→Word and Word→PDF fidelity.
 *  - tests/conv/fixture-report.pdf : centered title, wrapped body with a bold
 *    span, right-aligned date, bullet list, ruled table
 *  - tests/conv/fixture-doc.docx   : headings, mixed bold/italic, centered +
 *    right paragraphs, bullets, a real table
 */
import { mkdirSync, writeFileSync } from "node:fs";
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
