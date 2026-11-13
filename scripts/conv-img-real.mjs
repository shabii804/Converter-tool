/**
 * Real-world image fixtures (node side) — docx files mirroring what users
 * actually insert in Word:
 *   - fixture-docx-jpeg.docx   : inline baseline JPEG photo (most common)
 *   - fixture-docx-float.docx  : ANCHORED/floating PNG (text wrapping, drag)
 *   - fixture-docx-table.docx  : PNG image inside a table cell
 */
import { writeFileSync } from "node:fs";
import path from "node:path";
import { readFile as rf } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  ImageRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  HorizontalPositionRelativeFrom,
  VerticalPositionRelativeFrom,
  TextWrappingType,
} from "docx";

const here = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(here, "../tests/conv");

const png = await rf(path.join(OUT, "img-alpha.png"));
const jpg = await rf(path.join(OUT, "photo-baseline.jpg"));

/* 1. inline JPEG photo */
const docJpeg = new Document({
  sections: [
    {
      children: [
        new Paragraph({
          children: [new TextRun({ text: "Photo report", bold: true, size: 32 })],
        }),
        new Paragraph({
          children: [
            new TextRun("A photo taken during the trip: "),
            new ImageRun({
              type: "jpg",
              data: jpg,
              transformation: { width: 240, height: 150 },
            }),
          ],
        }),
        new Paragraph({ children: [new TextRun("That was the beach.")] }),
      ],
    },
  ],
});
writeFileSync(path.join(OUT, "fixture-docx-jpeg.docx"), await Packer.toBuffer(docJpeg));

/* 2. floating/anchored image — what Word produces when you drag a pic
      or pick any text wrapping other than "In Line with Text" */
const docFloat = new Document({
  sections: [
    {
      children: [
        new Paragraph({
          children: [
            new TextRun("Body text before the picture. "),
            new ImageRun({
              type: "png",
              data: png,
              transformation: { width: 160, height: 112 },
              floating: {
                horizontalPosition: {
                  relative: HorizontalPositionRelativeFrom.PAGE,
                  offset: 3200000,
                },
                verticalPosition: {
                  relative: VerticalPositionRelativeFrom.PAGE,
                  offset: 1600000,
                },
                wrap: { type: TextWrappingType.SQUARE },
                zIndex: 5,
              },
            }),
            new TextRun("More body text wrapping around the anchored image so the layout stays interesting."),
          ],
        }),
        new Paragraph({ children: [new TextRun("Closing paragraph.")] }),
      ],
    },
  ],
});
writeFileSync(path.join(OUT, "fixture-docx-float.docx"), await Packer.toBuffer(docFloat));

/* 3. image inside a table cell — invoices and reports do this constantly */
const docTable = new Document({
  sections: [
    {
      children: [
        new Paragraph({ children: [new TextRun("Invoice with logo in a table:")] }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  width: { size: 40, type: WidthType.PERCENTAGE },
                  children: [
                    new Paragraph({
                      children: [
                        new ImageRun({
                          type: "png",
                          data: png,
                          transformation: { width: 120, height: 84 },
                        }),
                      ],
                    }),
                  ],
                }),
                new TableCell({
                  width: { size: 60, type: WidthType.PERCENTAGE },
                  children: [
                    new Paragraph({
                      children: [new TextRun("Acme GmbH\nInvoice #12345")],
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
        new Paragraph({ children: [new TextRun("Total: 100 EUR")] }),
      ],
    },
  ],
});
writeFileSync(path.join(OUT, "fixture-docx-table.docx"), await Packer.toBuffer(docTable));

console.log("✓ fixture-docx-jpeg.docx / fixture-docx-float.docx / fixture-docx-table.docx");
