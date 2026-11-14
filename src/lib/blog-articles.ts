/**
 * Blog articles — genuinely useful how-tos with real screenshots of the
 * product doing each job. English-only (chrome is translated; a banner
 * discloses this on non-English locales). Screenshots live in /public/blog.
 */

export interface ArticleImage {
  src: string;
  alt: string;
}

export interface ArticleSection {
  heading: string;
  paragraphs: string[];
  image?: ArticleImage;
  /** numbered steps shown as an ordered list */
  steps?: string[];
}

export interface Article {
  slug: string;
  title: string;
  description: string;
  published: string; // ISO date — the real date the article was written
  minutes: number;
  /** tool the article's CTA opens */
  toolId?: string;
  sections: ArticleSection[];
}

export const ARTICLES: Article[] = [
  {
    slug: "merge-pdf-files-without-uploading",
    title: "How to merge PDF files without uploading them anywhere",
    description:
      "A step-by-step walkthrough of combining PDFs entirely in your browser — why it is safer, what actually happens on your device, and where the limits are.",
    published: "2026-11-08",
    minutes: 5,
    toolId: "merge",
    sections: [
      {
        heading: "Why bother avoiding the upload?",
        paragraphs: [
          "Merging is the most common PDF job in the world, and the default way to do it is to hand two or more documents — often contracts, payslips or medical letters — to a stranger's server. The server merges them, sends them back, and then what happens depends entirely on that company's deletion policy, their storage vendor, and whoever gets access next.",
          "Your browser can do the whole job itself. A PDF is just a structured file, and joining two of them means reading page objects from one and writing them into another — work JavaScript and WebAssembly handle easily. When the merge runs in your tab, the files never exist anywhere except your device's memory.",
        ],
        image: {
          src: "/blog/merge-1-files.png",
          alt: "PrivyPDF Merge PDF tool with two sample PDF files loaded in the file list",
        },
      },
      {
        heading: "The actual steps",
        paragraphs: [
          "The whole flow takes about fifteen seconds once the page has loaded. Here is the complete process in the PrivyPDF merge tool:",
        ],
        steps: [
          "Open the Merge PDF tool — or just drop files on the home page and accept the suggested tool.",
          "Drag in two or more PDFs, paste them with Ctrl+V, or tap to browse on mobile.",
          "Check the order: files merge from top to bottom of the list.",
          "Press Run Merge PDF. Watch the progress bar — this is your CPU working, not an upload.",
          "Download the merged PDF. Nothing was ever sent anywhere.",
        ],
        image: {
          src: "/blog/merge-2-result.png",
          alt: "PrivyPDF results screen showing a merged.pdf file ready to download",
        },
      },
      {
        heading: "What a local merge can and cannot do",
        paragraphs: [
          "A local merge preserves pages exactly: each page keeps its content, fonts and images byte-for-byte in the new file. Bookmarks and form fields are the honest caveat — they belong to the source documents and simple page-level merges do not reconstruct a combined bookmark tree. If your workflow depends on elaborate outlines, check the result before deleting the originals.",
          "The practical limit is your device's memory, not a server quota. Hundreds of megabytes merge comfortably on a modern laptop; on a phone, keep batches reasonable. Either way, the page warns you when a file is large instead of discovering it the hard way.",
        ],
      },
      {
        heading: "One extra proof it is really local",
        paragraphs: [
          "Once the page has loaded, turn off your Wi-Fi and merge something. It works, because there is no server to talk to. That single test — working with the network disconnected — is the difference between “trust us” and “verify it yourself”.",
        ],
      },
    ],
  },
  {
    slug: "compress-pdf-to-100kb",
    title: "How to compress a PDF to 100KB (or 200KB) for forms and portals",
    description:
      "Exam portals and application forms love hard size limits. Here is how to hit a specific target size honestly — and what to do when the target is physically unreachable.",
    published: "2026-11-08",
    minutes: 6,
    toolId: "compress-target",
    sections: [
      {
        heading: "The 100KB problem",
        paragraphs: [
          "Government portals, university application systems and job boards frequently reject PDFs above 100KB or 200KB. Generic compressors rarely help because they optimize for “smaller, roughly” instead of “under exactly this number”. What you need is a tool that walks down a quality ladder until the file fits — and tells you the truth when it cannot.",
          "There is also the privacy wrinkle: the document you are squeezing for a job application is often your CV; for a visa portal, your passport scan. Uploading those to a random compressor is a real decision with real consequences. Doing the same job in your browser makes that decision disappear.",
        ],
        image: {
          src: "/blog/compress-1-target.png",
          alt: "PrivyPDF Compress to Target Size tool with the 100KB preset selected",
        },
      },
      {
        heading: "How target-size compression actually works",
        paragraphs: [
          "The tool tries the cheap thing first: a lossless re-save that restructures the PDF's internal objects. Text-based documents sometimes shrink enough right there, and text stays perfectly sharp and selectable.",
          "If that is not enough, pages are re-encoded as images along a ladder — descending scale and JPEG quality combinations — stopping at the first rung that fits under the target. This is the same trick upload services use; the difference is that here it happens on your device, and the result note tells you honestly which path was used and what it means for text selection.",
        ],
        steps: [
          "Open Compress to Target Size and drop your PDF.",
          "Pick the preset (100KB, 200KB, 500KB, 1MB) or type a custom target.",
          "Press Run — the lossless attempt happens first, then the ladder if needed.",
          "Read the result note. If the target was unreachable, it reports the closest possible size instead of failing silently.",
        ],
        image: {
          src: "/blog/compress-2-done.png",
          alt: "PrivyPDF results screen showing a compressed PDF with the achieved size in the result note",
        },
      },
      {
        heading: "When 100KB is genuinely impossible",
        paragraphs: [
          "A single page rasterized at minimum sensible quality still carries a full page of pixel data — some scans simply cannot go below a certain size without becoming unreadable. When the ladder bottoms out above your target, the honest response is the one you get: the closest achievable size and an explanation. Fighting that with fake compression artifacts helps nobody.",
          "If you control the source, the reliable fix is upstream: scan at 150 DPI instead of 300, or export from the original app with image quality lowered. Then use the target tool to polish the final file.",
        ],
      },
    ],
  },
  {
    slug: "sign-a-pdf-on-your-phone",
    title: "How to sign a PDF on your phone — no app store required",
    description:
      "Draw, type or upload a signature and place it on a document from Android or iPhone, entirely in the browser. Your signature and the document never leave the phone.",
    published: "2026-11-08",
    minutes: 5,
    toolId: "sign-pdf",
    sections: [
      {
        heading: "The signature you already have",
        paragraphs: [
          "Signing a document on a phone usually ends with installing yet another app — one that wants file access, an account, and often a subscription for the privilege of drawing your own name. The browser on the same phone already has everything needed: a touchscreen to draw with, a file system to read the PDF, and a CPU that can place a signature image on a page.",
          "A local signing tool uses exactly that. The signature you draw becomes a small image placed onto the page; the document is rewritten in your phone's memory; the output downloads straight to your device. Nothing about the process requires a server, which is why it also works with Wi-Fi switched off.",
        ],
        image: {
          src: "/blog/sign-1-modal.png",
          alt: "PrivyPDF signature modal with Draw, Type and Upload tabs and an ink color picker",
        },
      },
      {
        heading: "Three ways to make the signature",
        paragraphs: [
          "The signature modal offers the three practical options. Draw with your finger or stylus on the pad — best on phones with a stylus, and best when you want it to look like your hand. Type your name and get it rendered in a handwriting-style font — fast and legible, clearly not ink. Upload an image of your signature on white paper (or a transparent PNG) — the most authentic-looking option for a signature you will reuse.",
          "The ink color picker matters more than people expect: dark blue reads as “signed by a person” in most business contexts, while pure black can blend into printed text. Pick what matches the document's culture.",
        ],
        image: {
          src: "/blog/sign-2-placed.png",
          alt: "A typed signature placed on a PDF page in the PrivyPDF editor, ready to be dragged into position",
        },
      },
      {
        heading: "Placing it where it belongs",
        steps: [
          "Open Sign PDF and load the document.",
          "Tap Add signature, choose Draw, Type or Upload, pick an ink color.",
          "Place the signature — it lands near the middle of the current page.",
          "Drag it into position, resize by placing a new one if needed, then press Run Sign PDF.",
          "Download the signed file. The signature is part of the page, not a detachable sticker.",
        ],
        paragraphs: [
          "One honest distinction: this is a visible, image-based signature — the kind businesses actually accept on printed and emailed documents. It is not a cryptographic certificate signature with a chain of trust. Those have their place in regulated workflows; for everything else, a clear visual signature plus the document's history in your email thread does the job.",
        ],
      },
    ],
  },
  {
    slug: "redact-a-pdf-properly",
    title: "Redacting a PDF properly: why drawing black boxes is not enough",
    description:
      "Most “redacted” PDFs still contain the hidden text under the box. Here is how to verify it — and how to remove redacted text for real, in your browser.",
    published: "2026-11-08",
    minutes: 6,
    toolId: "redact-pdf",
    sections: [
      {
        heading: "The black-box trap",
        paragraphs: [
          "Open any PDF viewer, draw a black rectangle over a paragraph, save — and you have not redacted anything. The rectangle is a drawing layered on top of the text. Copy-paste the area into a text editor, or run any text extractor on the file, and the “removed” text comes back in full. Government agencies have published redacted documents whose secrets were recoverable in one Ctrl+C; it happens to companies and journalists constantly.",
          "Real redaction means the text objects are gone from the file — not covered, removed. That is a stronger operation, and it deserves a tool that says clearly what it does.",
        ],
        image: {
          src: "/blog/redact-1-boxes.png",
          alt: "PrivyPDF Redact PDF editor showing a black redaction box drawn over a line of text",
        },
      },
      {
        heading: "How real redaction works here",
        paragraphs: [
          "The Redact PDF tool takes every box you draw and burns it into the page during a local re-render: the affected page is flattened to an image with the boxes painted solid black, and the original text objects — including the ones under the boxes — never make it into the output file. Pages without boxes can stay untouched, keeping their selectable text.",
          "The trade-off is stated plainly in the interface: redacted pages become images, so their remaining text stops being selectable. That is the price of guaranteed removal, and every serious redaction tool makes the same trade. What matters is that the tool tells you, rather than silently choosing for you.",
        ],
        steps: [
          "Open Redact PDF and load the document.",
          "Drag black boxes over everything sensitive — account numbers, names, signatures.",
          "Double-check every box; redaction is permanent.",
          "Choose the scope: flatten only the pages with boxes (default) or the whole document.",
          "Press Run Redact PDF, then verify: try to select text on a redacted page — there is none.",
        ],
        image: {
          src: "/blog/redact-2-warning.png",
          alt: "The redaction warning in PrivyPDF explaining that redaction is permanent and pages with boxes are flattened",
        },
      },
      {
        heading: "The two-minute verification habit",
        paragraphs: [
          "Whatever tool you use — including this one — build the habit of verification: open the redacted output, select-all, copy, paste into a plain text editor, and search for the sensitive string. Thirty seconds. On a properly redacted file the string is not there, because the text objects themselves are gone. On a covered-up file it is all there. This single check would have saved every organization that ever made redaction headlines.",
        ],
      },
    ],
  },
  {
    slug: "extract-text-from-any-pdf",
    title: "How to extract text from a PDF (and what to do with scanned pages)",
    description:
      "Pull the text layer out of any PDF as clean, readable text in your browser — plus the honest reason scanned pages come back empty and what to do instead.",
    published: "2026-11-08",
    minutes: 4,
    toolId: "extract-text",
    sections: [
      {
        heading: "A PDF is not a text file",
        paragraphs: [
          "Internally, a PDF stores instructions like “draw these glyph shapes at these coordinates in this font” — not paragraphs. Extracting text means replaying those instructions and reconstructing reading order: which glyphs form lines, which lines form paragraphs, where columns break. Get it right and you recover clean, copy-ready text; get it wrong and you get alphabet soup.",
          "The Extract Text tool groups text items by their vertical position into lines, orders lines top to bottom, and stitches items into words using the gaps between them — the same reconstruction logic the PDF-to-Word converter uses, without the document formatting.",
        ],
        image: {
          src: "/blog/extract-text-1.png",
          alt: "PrivyPDF Extract Text tool with page markers option enabled",
        },
      },
      {
        heading: "The scanned-page honesty clause",
        paragraphs: [
          "A scanned PDF is a photograph of paper — there are no text objects to extract, so extraction returns nothing. Some tools quietly hand you an empty file and let you figure that out. This one tells you the page has no text layer and suggests what actually helps: OCR, which is on the roadmap, or working from the rendered images meanwhile.",
          "Quick way to tell which kind of PDF you have: try to select text in your viewer. Selection that works means a text layer exists; no selection means it is a scan and extraction (and PDF-to-Word) will come back empty.",
        ],
        steps: [
          "Open Extract Text and drop your PDF.",
          "Leave page markers on if the document has more than a few pages — they keep sections findable.",
          "Press Run and open the .txt result.",
          "If you get the no-text-layer message, the PDF is scanned: use PDF to JPG to get the page images, or wait for OCR.",
        ],
        image: {
          src: "/blog/extract-text-2-result.png",
          alt: "PrivyPDF results screen showing an extracted .txt file ready to download",
        },
      },
      {
        heading: "Where extraction shines",
        paragraphs: [
          "Contracts for searchability, meeting notes into plain text, invoices into a spreadsheet via the Excel tool, papers into a quote manager — anywhere you need the words without the layout. Text extraction also travels well: a .txt file opens identically on every device ever made, and it is instantly greppable, indexable and quotable.",
        ],
      },
    ],
  },
  {
    slug: "convert-images-to-webp",
    title: "Convert images to WebP (or JPG, or PNG) without uploading them",
    description:
      "WebP typically halves image weight — which means faster sites and easier uploads. How to convert in the browser, and the transparency rules that trip people up.",
    published: "2026-11-08",
    minutes: 5,
    toolId: "convert-image",
    sections: [
      {
        heading: "Why WebP keeps winning",
        paragraphs: [
          "For photographs, WebP routinely produces files 25–50% smaller than an equivalent-quality JPG; for graphics with flat colors, it competes well with PNG. Smaller images mean faster page loads, cheaper bandwidth and friendlier upload limits — which is why every major platform accepts WebP now.",
          "Conversion is pure math on pixels, which makes it a perfect local-first job: decode the image in your browser, re-encode it, download. The image never has to travel to a “free converter” that might log, retain or train on it.",
        ],
        image: {
          src: "/blog/convert-1-panel.png",
          alt: "PrivyPDF Convert Image tool with the WebP output format selected",
        },
      },
      {
        heading: "The transparency rule that trips everyone",
        paragraphs: [
          "JPG has no alpha channel. Convert a transparent PNG to JPG and the transparency has to go somewhere — this tool fills it white, which is what you want for product shots and documents, and wrong for anything you will layer on colored backgrounds. PNG keeps transparency perfectly; WebP keeps it too, at a fraction of PNG's size. If you see a black box where your logo's background should be, you converted a transparent PNG to JPG somewhere.",
          "For GIFs, be aware that a conversion takes the first frame — animated GIFs become single images. That is usually what you want for thumbnails, and surprising when it is not.",
        ],
        steps: [
          "Open Convert Image and drop one or more images — JPG, PNG, WebP all work.",
          "Pick the output format: WebP for the web, PNG to keep transparency, JPG for maximum compatibility.",
          "For JPG and WebP, adjust the quality slider — 85% is the sweet spot for photos.",
          "Press Run Convert Image and download the results. Names are preserved, extensions change.",
        ],
        image: {
          src: "/blog/convert-2-done.png",
          alt: "PrivyPDF results screen showing converted WebP images ready to download",
        },
      },
      {
        heading: "Batch reality check",
        paragraphs: [
          "Everything runs on your CPU, so fifty photos take noticeably longer than five — progress is per-file and honest. For site owners converting whole galleries regularly, the realistic workflow is batches of a few dozen at a time, quality 85, WebP. The file-size savings compound fast at that scale.",
        ],
      },
    ],
  },
  {
    slug: "remove-password-from-pdf-you-own",
    title: "How to remove a password from a PDF you own",
    description:
      "You know the password — you just don't want to type it forever. Here's the honest way to save an unlocked copy, locally, in under a minute.",
    published: "2026-11-08",
    minutes: 4,
    toolId: "unlock",
    sections: [
      {
        heading: "Password removal ≠ password cracking",
        paragraphs: [
          "Bank statements, payslips and insurance documents arrive password-protected because the sender never asked how often you would need to open them. Typing the same password for the tenth time into a tax portal, you might be tempted by “PDF password remover” sites promising to crack anything. Real cracking is slow, unreliable, and — for a file you do not own — illegal in most jurisdictions.",
          "The legitimate job is different and easy: for any PDF you can already open, save an unlocked copy. The encryption layer is removed on write; the content never changes. That is what the Unlock PDF tool does, entirely in your browser, using the password you supply in memory.",
        ],
        image: {
          src: "/blog/unlock-1.png",
          alt: "PrivyPDF Unlock PDF tool with the current password field ready for input",
        },
      },
      {
        heading: "The steps, and what happens to your password",
        paragraphs: [
          "Type the password once, get an unlocked file. The password exists in the browser tab's memory for the few seconds the decryption takes — it is never written to storage, never sent anywhere, and forgotten when the tab closes. You can verify the no-upload claim the usual way: load the page, disconnect the network, unlock a file. It works.",
        ],
        steps: [
          "Open Unlock PDF and drop the protected file.",
          "Enter the password you already use to open it.",
          "Press Run Unlock PDF.",
          "Download the unlocked copy — it now opens in any viewer with no password.",
        ],
        image: {
          src: "/blog/unlock-2-done.png",
          alt: "PrivyPDF results screen showing the unlocked PDF ready to download",
        },
      },
      {
        heading: "Two distinctions worth knowing",
        paragraphs: [
          "User password versus owner password: the user password opens the file; the owner password only restricts printing or editing on top of an openable file. If a document opens freely but blocks changes, the restriction lives in permissions — and removing restrictions from a document you own is an ownership decision, not a bypass.",
          "And one habit worth keeping: keep the original locked file until you have confirmed the unlocked copy opens correctly. The tool cannot recover a file for you if the password was mistyped — it will tell you honestly that the password was wrong instead of guessing.",
        ],
      },
    ],
  },
  {
    slug: "add-text-and-images-to-a-pdf",
    title: "How to add text, highlights and images to a PDF — free, in the browser",
    description:
      "Annotate contracts, forms and reports with real, selectable text and crisp vector shapes. No watermarks, no uploads, no “free trial” pop-ups.",
    published: "2026-11-08",
    minutes: 6,
    toolId: "edit-pdf",
    sections: [
      {
        heading: "What “editing a PDF” really means",
        paragraphs: [
          "A PDF is not a Word document — there are no editable paragraphs, just positioned glyphs and drawing instructions. “Editing” therefore means one of two things: overlaying new content (text, highlights, shapes, images) on top of the page, or regenerating the page from scratch. Overlaying is what every sane tool does, including the expensive ones; the differences are in quality and honesty.",
          "The Edit PDF tool draws real objects into the page: typed text becomes actual PDF text (selectable, searchable, copyable), highlights become real translucent rectangles, shapes are vector strokes that stay crisp at any zoom. Nothing is flattened unless you ask for it, and nothing gets watermarked — the tool has no reason to stamp your document.",
        ],
        image: {
          src: "/blog/edit-1-editor.png",
          alt: "The PrivyPDF Edit PDF editor with the toolbar and a text item placed on the page",
        },
      },
      {
        heading: "The toolbox, briefly",
        paragraphs: [
          "Text: click where the text should start, type in the side inspector, pick font, size and color. Helvetica, Times and Courier cover most document cultures. Highlights: drag over the target line — the yellow lands under the text, not over it. Shapes and lines: drag to draw rectangles, ellipses and straight lines with your chosen stroke color. Freehand: for quick circles-around-things and arrows-that-arent. Images: insert a logo or photo, then drag it into place.",
          "Everything on the page stays draggable until you press Run — rearrange freely, delete with the trash button, undo mistakes with Ctrl+Z. The editor works page by page; navigate with the arrows and the page counter.",
        ],
        image: {
          src: "/blog/edit-2-inspector.png",
          alt: "The text inspector panel in the PrivyPDF editor with font, size and color controls",
        },
      },
      {
        heading: "Rotated pages, honestly handled",
        paragraphs: [
          "Scanned documents are frequently stored rotated — a page that displays sideways. Editors that ignore page rotation put your signature sideways or in the wrong place. This editor maps every placement through the page's actual rotation matrix, so what you draw where you see it is what you get in the output. It is the kind of detail that only matters when it fails, so it is worth testing with a rotated scan before you commit to any tool.",
        ],
        steps: [
          "Open Edit PDF and load your document.",
          "Pick a tool from the toolbar: text, highlight, shapes, freehand or image.",
          "Place and adjust items — drag to move, edit text in the inspector, undo freely.",
          "Press Run Edit PDF and download the annotated file.",
        ],
      },
    ],
  },
];

export const articleBySlug = (slug: string) =>
  ARTICLES.find((a) => a.slug === slug) ?? null;
