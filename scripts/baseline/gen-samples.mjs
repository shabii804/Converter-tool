/**
 * Baseline sample generator — deterministic input files for all 16 tools.
 * Outputs to /tests/baseline/samples/ — run once, reused by every baseline run.
 */
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { PDFDocument as CantooPDFDocument, StandardFonts as CantooFonts } from "@cantoo/pdf-lib";
import sharp from "sharp";
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const OUT = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../tests/baseline/samples"
);
mkdirSync(OUT, { recursive: true });

const A4 = [595.28, 841.89];

async function makeTextPdf(name, pages, title) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  for (let p = 1; p <= pages; p++) {
    const page = doc.addPage(A4);
    page.drawText(`${title}`, { x: 56, y: 780, size: 20, font: bold });
    page.drawText(`Page ${p} of ${pages}`, {
      x: 56,
      y: 752,
      size: 12,
      font,
      color: rgb(0.35, 0.4, 0.5),
    });
    const lines = [
      `SwiftPDF baseline sample — ${name}`,
      "",
      "This document is generated deterministically for regression testing.",
      "It contains three paragraphs of plain Latin text laid out on A4 pages.",
      "The engine must preserve this text, its order and its position exactly.",
      "",
      "Section 1 — Purpose. The sample exercises structural operations such as",
      "merge, split, rotate, watermark and page numbering without any raster",
      "content, so output diffs isolate layout behaviour only.",
      "",
      "Section 2 — Method. Every baseline run uses identical options and inputs.",
      "Results are compared by page geometry, extracted text hash and size.",
      "",
      `Section 3 — Footer marker ${p}/${pages}. End of deterministic content.`,
    ];
    let y = 700;
    for (const ln of lines) {
      page.drawText(ln, { x: 56, y, size: 10.5, font });
      y -= 16;
    }
  }
  const bytes = await doc.save();
  writeFileSync(path.join(OUT, name), bytes);
  console.log("✓", name, bytes.length, "bytes");
}

async function makeImagePdf(name, pages, jpgBytes) {
  const doc = await PDFDocument.create();
  const img = await doc.embedJpg(jpgBytes);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let p = 1; p <= pages; p++) {
    const page = doc.addPage(A4);
    page.drawText(`Scan page ${p}`, { x: 56, y: 790, size: 14, font });
    page.drawImage(img, { x: 48, y: 220, width: 500, height: 500 });
  }
  const bytes = await doc.save();
  writeFileSync(path.join(OUT, name), bytes);
  console.log("✓", name, bytes.length, "bytes");
}

async function makePhotoJpg() {
  // deterministic gradient + blocks photo-like image, 1200x900
  const svg = `<svg width="1200" height="900" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#1e3a8a"/><stop offset="0.5" stop-color="#4f46e5"/><stop offset="1" stop-color="#7c3aed"/>
    </linearGradient></defs>
    <rect width="1200" height="900" fill="url(#g)"/>
    <circle cx="300" cy="260" r="180" fill="#f59e0b" opacity="0.85"/>
    <rect x="620" y="420" width="440" height="300" rx="24" fill="#0ea5e9" opacity="0.8"/>
    <rect x="120" y="560" width="360" height="220" rx="16" fill="#10b981" opacity="0.75"/>
    <text x="60" y="80" font-family="sans-serif" font-size="48" fill="#ffffff" font-weight="bold">SwiftPDF sample photo</text>
  </svg>`;
  const jpg = await sharp(Buffer.from(svg)).jpeg({ quality: 88 }).toBuffer();
  writeFileSync(path.join(OUT, "sample-photo.jpg"), jpg);
  console.log("✓ sample-photo.jpg", jpg.length, "bytes");
  return jpg;
}

async function makeDocx() {
  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [new TextRun("SwiftPDF Word Sample")],
          }),
          new Paragraph({
            children: [
              new TextRun(
                "This document travels the Word to PDF path. It contains a heading, two paragraphs and a short list so the converter has structure to keep."
              ),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun(
                "The converter should preserve reading order, heading weight and list markers. Deterministic content, no images."
              ),
            ],
          }),
          new Paragraph({ text: "First deterministic item", bullet: { level: 0 } }),
          new Paragraph({ text: "Second deterministic item", bullet: { level: 0 } }),
          new Paragraph({ text: "Closing paragraph with a fixed signature line." }),
        ],
      },
    ],
  });
  const blob = await Packer.toBlob(doc);
  const buf = Buffer.from(await blob.arrayBuffer());
  writeFileSync(path.join(OUT, "sample-doc.docx"), buf);
  console.log("✓ sample-doc.docx", buf.length, "bytes");
}

async function makeEncrypted() {
  const doc = await CantooPDFDocument.create();
  const font = await doc.embedFont(CantooFonts.Helvetica);
  const page = doc.addPage(A4);
  page.drawText("Secret sample — password: test1234", { x: 56, y: 760, size: 14, font });
  page.drawText("Used only by the Unlock baseline run.", { x: 56, y: 736, size: 11, font });
  doc.encrypt({
    userPassword: "test1234",
    ownerPassword: "test1234",
    permissions: { printing: "highResolution", modifying: false, copying: false, annotating: false, fillingForms: true, contentAccessibility: true, documentAssembly: false },
  });
  const bytes = await doc.save();
  writeFileSync(path.join(OUT, "sample-encrypted.pdf"), bytes);
  console.log("✓ sample-encrypted.pdf", bytes.length, "bytes");
}

await makeTextPdf("sample-text.pdf", 3, "Baseline Text Sample");
await makeTextPdf("sample-second.pdf", 2, "Baseline Second Sample");
const jpg = await makePhotoJpg();
await makeImagePdf("sample-image.pdf", 2, jpg);
await makeDocx();
await makeEncrypted();
console.log("\nAll samples written to", OUT);
