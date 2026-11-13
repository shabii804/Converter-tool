/**
 * Alignment QA driver — verifies the user-reported bug:
 * "the alignment of pic and the alignment of text changes or breaks when converting"
 *
 * Direction 1 (word-to-pdf): fixture-align-doc.docx uses centered Heading 1,
 *   centered body, right body, justified body, centered picture, right
 *   picture, centered table cells. The output PDF's text lines and image
 *   centroid are measured in-browser.
 * Direction 2 (pdf-to-word): fixture-align.pdf carries a centered title
 *   block, right-aligned lines, a manually justified block, centered and
 *   right-aligned images. The output docx's w:jc values and floating anchor
 *   offsets are read from document.xml.
 */
import http from "node:http";
import { mkdirSync, writeFileSync } from "node:fs";
import { readFile as rf } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import esbuild from "esbuild";
import { chromium } from "playwright";
import JSZip from "jszip";

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(here, "../tests/conv");
const OUT = path.join(ROOT, "out");
mkdirSync(OUT, { recursive: true });

const stubNodeBuiltins = {
  name: "stub-node-builtins",
  setup(build) {
    const mods = [
      "fs", "path", "crypto", "stream", "os", "url", "http", "https",
      "zlib", "util", "child_process", "net", "tls", "readline", "assert",
    ];
    for (const m of mods) {
      build.onResolve({ filter: new RegExp(`^${m}$`) }, () => ({
        path: m, namespace: "stub",
      }));
    }
    build.onLoad({ filter: /.*/, namespace: "stub" }, () => ({
      contents: "module.exports = {};", loader: "js",
    }));
  },
};
await esbuild.build({
  entryPoints: [path.join(here, "conv-align-harness.src.ts")],
  bundle: true, format: "iife", platform: "browser",
  outfile: path.join(ROOT, "conv-align-harness.js"),
  define: { "process.env.NODE_ENV": '"production"' },
  plugins: [stubNodeBuiltins], logLevel: "warning",
});

const server = http.createServer(async (req, res) => {
  try {
    let p = new URL(req.url, "http://x").pathname;
    if (p === "/") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end('<!doctype html><html><body><script src="/conv-align-harness.js"></script></body></html>');
      return;
    }
    const file =
      p === "/pdf.worker.min.mjs"
        ? path.join(here, "../public/pdf.worker.min.mjs")
        : path.join(ROOT, p);
    const data = await rf(file);
    res.writeHead(200, {
      "Content-Type": p.endsWith(".js") || p.endsWith(".mjs")
        ? "text/javascript"
        : "application/octet-stream",
      "Cache-Control": "no-store",
    });
    res.end(data);
  } catch {
    res.writeHead(404); res.end("nf");
  }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const port = server.address().port;

const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined,
});
const page = await browser.newPage();
page.on("pageerror", (e) => console.log("PAGEERROR:", String(e?.message ?? e)));
await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: "load" });
await page.waitForFunction(() => typeof window.alignTest === "function", null, {
  timeout: 60000, polling: 250,
});

/* ---------- direction 1: word-to-pdf ---------- */
{
  const b64 = (await rf(path.join(ROOT, "fixture-align-doc.docx"))).toString("base64");
  const res = await page.evaluate(
    ({ b64 }) => window.alignTest("word-to-pdf", b64, "fixture-align-doc.docx", { pageSize: "letter" }),
    { b64 }
  );
  writeFileSync(path.join(OUT, "align-from-docx.pdf"), Buffer.from(res.b64, "base64"));
  console.log("\n=== DOC -> PDF ===  note:", res.note);
  console.log(`pageW=${res.pageW} pageMid=${(res.pageW / 2).toFixed(0)}`);
  for (const l of res.lines)
    console.log(
      `  y=${String(l.size).padStart(4)} x0=${String(l.x0).padStart(6)} x1=${String(l.x1).padStart(6)} off=${String(l.offCenter).padStart(7)}  ${l.t}`
    );
  if (res.imageBox) {
    const b = res.imageBox;
    console.log(
      `  IMAGE p1 box x:[${b.x0}..${b.x1}] y:[${b.y0}..${b.y1}] centroidX=${b.cx} pageMid=${(b.pageW / 2).toFixed(0)}`
    );
  }
  if (res.imageBox2) {
    const b = res.imageBox2;
    console.log(
      `  IMAGE p2 box x:[${b.x0}..${b.x1}] y:[${b.y0}..${b.y1}] centroidX=${b.cx}`
    );
  } else console.log("  IMAGE p2: none");
}

/* ---------- direction 2: pdf-to-word ---------- */
{
  const b64 = (await rf(path.join(ROOT, "fixture-align.pdf"))).toString("base64");
  const res = await page.evaluate(
    ({ b64 }) => window.alignTest("pdf-to-word", b64, "fixture-align.pdf", {}),
    { b64 }
  );
  const docxPath = path.join(OUT, "align-from-pdf.docx");
  writeFileSync(docxPath, Buffer.from(res.b64, "base64"));
  console.log("\n=== PDF -> DOC ===  note:", res.note);

  const zip = await JSZip.loadAsync(Buffer.from(res.b64, "base64"));
  const xml = await zip.file("word/document.xml").async("string");
  // one entry per paragraph: jc value + leading text
  const paras = [...xml.matchAll(/<w:p\b[^>]*>([\s\S]*?)<\/w:p>/g)];
  console.log("paragraph w:jc values:");
  for (const [, body] of paras) {
    const jc = body.match(/<w:jc w:val="([^"]+)"/)?.[1] ?? "(none)";
    const text = [...body.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)]
      .map((m) => m[1])
      .join("")
      .slice(0, 52);
    if (text.trim() || jc !== "(none)")
      console.log(`  jc=${jc.padEnd(8)} "${text}"`);
  }
  const anchors = [...xml.matchAll(/<wp:anchor[\s\S]*?<\/wp:anchor>/g)];
  console.log(`floating images: ${anchors.length}`);
  anchors.forEach((a, i) => {
    const posH = a[0].match(/<wp:positionH relativeFrom="([^"]+)"><wp:posOffset>(-?\d+)</);
    const posV = a[0].match(/<wp:positionV relativeFrom="([^"]+)"><wp:posOffset>(-?\d+)</);
    const ext = a[0].match(/<wp:extent cx="(\d+)" cy="(\d+)"/);
    const emu = 12700; // per pt
    if (posH && ext)
      console.log(
        `  #${i} H=${posH[1]}@${(Number(posH[2]) / emu).toFixed(1)}pt V=${posV?.[1]}@${(Number(posV?.[2]) / emu).toFixed(1)}pt w=${(Number(ext[1]) / emu).toFixed(1)}pt`
      );
  });
  // font families referenced
  const fonts = new Set(
    [...xml.matchAll(/<w:rFonts[^>]*w:ascii="([^"]+)"/g)].map((m) => m[1])
  );
  console.log("run fonts:", [...fonts].join(", ") || "(none — Word default)");
}

await browser.close();
server.close();
console.log("\ndone → tests/conv/out/");
