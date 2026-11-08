import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

export const metadata: Metadata = {
  title: "Blog — SwiftPDF",
  description:
    "Honest notes on local-first PDF processing: how in-browser tools work, what they can and cannot do, and why files never need to be uploaded.",
};

const posts = [
  {
    slug: "why-local-first",
    date: "November 2026",
    title: "Why local-first beats upload for sensitive PDFs",
    paragraphs: [
      "Every mainstream PDF site works the same way: your file is transferred to a server, processed there, and sent back. That round-trip means your contract, invoice or ID exists — briefly or not — on hardware you do not control. You are trusting the operator's retention policy, their storage vendor and every point in between.",
      "A local-first toolkit removes that trust entirely. SwiftPDF is JavaScript and WebAssembly running in your browser tab: the PDF is parsed, edited and re-encoded in your device's own memory. There is no upload endpoint to attack, no database of user documents to breach, and no retention policy to read.",
      "It also changes the threat model in your favor in quieter ways. You can load the page, disconnect from the network, and keep working — proof that nothing is being transmitted. And because processing is local, confidential networks and air-gapped laptops are not a problem.",
      "The honest trade-off: your device does the work, so very large files are bounded by your hardware rather than someone else's server quota. For most documents that is a limit you will never hit — and one you control.",
    ],
  },
  {
    slug: "how-pdf-to-word-works",
    date: "November 2026",
    title: "How PDF to Word works entirely in your browser",
    paragraphs: [
      "A PDF does not store paragraphs — it stores positioned glyphs. So converting to an editable Word file means reading the text layer (which glyphs, in which order, in which font and size) and rebuilding a document model from those clues.",
      "SwiftPDF's converter extracts the text layer with pdf.js in your tab, groups lines into paragraphs by their position, then writes a proper .docx with the docx library. The result keeps reading order and basic structure; it is not a pixel-perfect clone of the original layout, and any converter that promises that is overselling.",
      "Two honest limits: scanned pages have no text layer at all — the page is just a photograph — so they convert to an empty document, and OCR is not yet included. And complex multi-column layouts can come out with columns merged in the wrong order.",
      "For text-first documents — contracts, reports, letters — the output is immediately editable. Everything happens on your device, which matters most for exactly those documents.",
    ],
  },
  {
    slug: "honest-limits",
    date: "November 2026",
    title: "Five honest limits of browser-based PDF tools",
    paragraphs: [
      "Local-first is a genuine advantage, not a magic one. Here is what a browser toolkit cannot do, stated plainly.",
      "First, memory: your browser tab is your RAM. Files of several hundred megabytes work on a modern laptop; a 2 GB scan may not, no matter what the marketing says. Second, OCR: scanned images contain no text, so PDF to Word and Excel return empty results for them. Third, fonts: Word to PDF uses a built-in font set, so exotic typefaces are substituted (non-Latin scripts can garble). Fourth, exact layouts: conversions reconstruct structure, not pixel positions. Fifth, very large batches: unlike a server farm, your CPU processes sequentially — big jobs take real time.",
      "None of these limits are hidden in SwiftPDF. The site tells you what your device can handle instead of claiming infinite capacity, because a limit you know about is a plan; a limit you discover is a broken afternoon.",
      "What you get in exchange: no uploads, no accounts, no waiting on a transfer, and tools that keep working when the internet does not.",
    ],
  },
];

export default function BlogPage() {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-background">
      <Header />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12 sm:px-6 sm:py-16">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-primary">Blog</p>
        <h1 className="mt-2 text-h1 font-bold tracking-heading">
          Honest notes on local-first PDFs
        </h1>
        <p className="mt-3 text-body text-fg-muted">
          How in-browser tools work, what they can and cannot do — written by the same rules the
          product follows: no spin.
        </p>

        <div className="mt-10 space-y-10">
          {posts.map((p) => (
            <article
              key={p.slug}
              id={p.slug}
              className="rounded-card border border-border bg-surface-1/60 p-6 shadow-xs sm:p-8"
            >
              <p className="text-micro font-semibold uppercase tracking-wide text-fg-faint">
                {p.date}
              </p>
              <h2 className="mt-2 text-h3 font-bold tracking-heading">{p.title}</h2>
              <div className="mt-4 space-y-3.5">
                {p.paragraphs.map((par, i) => (
                  <p key={i} className="text-[14px] leading-relaxed text-fg-muted">
                    {par}
                  </p>
                ))}
              </div>
            </article>
          ))}
        </div>

        <p className="mt-10 text-center text-[13px] text-fg-muted">
          Ready to try it?{" "}
          <Link
            href="/"
            className="font-semibold text-primary underline-offset-4 hover:underline"
          >
            Open the toolkit
          </Link>{" "}
          — no account, no uploads.
        </p>
      </main>
      <Footer />
    </div>
  );
}
