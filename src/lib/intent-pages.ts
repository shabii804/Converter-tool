/**
 * Intent pages — built ONLY where the user need is genuinely different from
 * the generic tool page, each with a working tool and unique, honest text
 * (no templated filler). English-only content; chrome is translated.
 */

export interface IntentFaq {
  q: string;
  a: string;
}

export interface IntentPage {
  slug: string;
  /** the working tool this page embeds */
  toolId: string;
  /** preset lock applied to the tool on this page */
  preset?: { key: string; value: unknown };
  h1: string;
  title: string;
  description: string;
  /** unique intro paragraphs (2) — what makes this intent different */
  intro: [string, string];
  /** intent-specific steps (3) for HowTo JSON-LD + on-page steps */
  steps: { name: string; text: string }[];
  /** intent-specific FAQs, written for this need (not recycled) */
  faqs: IntentFaq[];
}

export const INTENT_SLUGS = [
  "compress-pdf-to-100kb",
  "compress-pdf-to-200kb",
  "merge-pdf-on-phone",
  "remove-pdf-password",
] as const;

export const INTENT_PAGES: IntentPage[] = [
  {
    slug: "compress-pdf-to-100kb",
    toolId: "compress-target",
    preset: { key: "targetKB", value: 100 },
    h1: "Compress a PDF to 100KB — right in your browser",
    title: "Compress PDF to 100KB — Free, Private, No Upload",
    description:
      "Shrink a PDF to a 100KB target without uploading it. Pick the quality ladder, see honest results, keep every byte on your device.",
    intro: [
      "Job portals, exam forms and university application sites often reject anything over 100KB. Most “compress PDF” sites hit that number by shipping your document — sometimes a passport scan or a marked-up contract — to a server you know nothing about. The compression itself takes seconds; the trust decision lasts years.",
      "This page runs the same compression entirely in your browser. A lossless re-save is tried first, then pages are re-encoded as images along a quality ladder until the file fits the 100KB target. If the target is physically unreachable — some text-heavy scans have a hard floor — you get the closest size and a clear explanation, not a fake success.",
    ],
    steps: [
      {
        name: "Drop your PDF",
        text: "Drag it into the drop zone or browse for it. The file never leaves your device — you can even go offline after the page loads.",
      },
      {
        name: "Compress to the 100KB target",
        text: "The 100KB target is pre-selected. Press the run button and watch the progress bar while your device's CPU does the work.",
      },
      {
        name: "Download and verify",
        text: "Check the reported size and download the file. If 100KB was not reachable, the note tells you the closest size achieved.",
      },
    ],
    faqs: [
      {
        q: "Why can't every PDF reach exactly 100KB?",
        a: "Because compression has physical limits. A one-page text PDF rasterized at the lowest sane quality still carries the pixel data of a full page image. When the ladder bottoms out above your target, the tool reports the closest achievable size instead of pretending otherwise.",
      },
      {
        q: "Will the text still be selectable after compressing to 100KB?",
        a: "If the lossless re-save alone reaches 100KB — yes, completely. If image re-encoding is needed, pages become images and text stops being selectable. The result note always tells you which path was used.",
      },
      {
        q: "Is my document uploaded anywhere?",
        a: "No. This page has no upload endpoint at all. Load it, disconnect your Wi-Fi, and it keeps working — that is the proof.",
      },
      {
        q: "What quality can I expect at 100KB?",
        a: "For a few pages of text or a light scan, quality stays respectable. For dense scans the re-encoder will trade visible quality for size — inspect the result and pick a higher target if it hurts.",
      },
    ],
  },
  {
    slug: "compress-pdf-to-200kb",
    toolId: "compress-target",
    preset: { key: "targetKB", value: 200 },
    h1: "Compress a PDF to 200KB — without uploading it",
    title: "Compress PDF to 200KB — Free, Private, No Upload",
    description:
      "Hit a 200KB limit for email attachments, visa portals and application forms. Runs entirely in your browser — no uploads, no sign-up.",
    intro: [
      "The 200KB ceiling shows up everywhere: email attachment guards, visa application portals, scholarship forms, vendor onboarding pages. It is large enough that quality can stay genuinely good — most text documents compress to 200KB with the readable-text path intact, and scans stay sharp.",
      "Unlike upload-based compressors, this page processes your file on your own device. Your bank statements, contracts or identity scans never touch a server. A lossless attempt comes first; if that cannot reach 200KB, a quality ladder re-encodes pages until it fits — and if the file has a hard floor above 200KB, you get the honest closest result.",
    ],
    steps: [
      {
        name: "Drop your PDF",
        text: "Add the file by drag, paste or browse. Processing is local — no account, no upload, works offline.",
      },
      {
        name: "Run with the 200KB target",
        text: "The target is pre-set to 200KB. One click starts the lossless attempt and, if needed, the image re-encode ladder.",
      },
      {
        name: "Save the result",
        text: "The note tells you exactly how the size was reached. Download and attach with confidence.",
      },
    ],
    faqs: [
      {
        q: "Is 200KB better than 100KB for quality?",
        a: "Usually, clearly. Twice the budget means the re-encoder can use higher quality settings, and text documents more often fit without rasterization at all.",
      },
      {
        q: "How many pages can a 200KB PDF hold?",
        a: "Depends on content: a text report can reach dozens of pages; a photo scan usually fits two to five pages at good quality. The tool optimizes whatever you give it and reports the outcome.",
      },
      {
        q: "Do I need to install anything?",
        a: "No. Everything runs in your browser — Chrome, Edge, Firefox or Safari — on desktop and phone alike.",
      },
      {
        q: "What happens to metadata and attachments?",
        a: "When pages are re-encoded as images, the page contents are rebuilt as a fresh, smaller PDF — the original embedded objects are gone with the rasterization. When the lossless path succeeds, the document is re-saved but its content objects are preserved.",
      },
    ],
  },
  {
    slug: "merge-pdf-on-phone",
    toolId: "merge",
    h1: "Merge PDF files on your phone — no app install",
    title: "Merge PDF on Phone — In the Browser, Nothing Uploaded",
    description:
      "Combine PDFs on Android or iPhone right in the mobile browser. No app store, no upload, no sign-up — files stay on your phone.",
    intro: [
      "Merging PDFs on a phone usually means one of two bad options: install an app full of ads that gets access to your documents, or upload them to a website and hope the server's retention policy is friendly. Both spend your privacy to save you a tap.",
      "Your phone's browser is more capable than most people assume. This page runs the full merge — reading, ordering and writing PDFs — inside that browser tab, on the phone's own processor. Android and iOS both work, with a touch-first interface: tap to pick files, drag to reorder, then download the combined PDF to your device.",
    ],
    steps: [
      {
        name: "Add your PDFs",
        text: "Tap the drop zone to pick files from your phone's file manager or cloud drive. Add at least two PDFs.",
      },
      {
        name: "Set the order",
        text: "The files merge top to bottom — use the list to confirm the order before running.",
      },
      {
        name: "Tap Run, then download",
        text: "The merge runs on your phone's CPU in seconds for typical documents. Save the combined PDF from the results screen.",
      },
    ],
    faqs: [
      {
        q: "Does it work on iPhone?",
        a: "Yes. Safari on iOS 14+ runs the whole tool locally. The merged PDF lands in your Downloads via the share sheet.",
      },
      {
        q: "Will it drain my battery or use mobile data?",
        a: "Processing uses your CPU briefly — a normal merge takes seconds. Mobile data is only used to load this page once; after that it works offline, so the merge itself uses zero data.",
      },
      {
        q: "Why not just install a merger app?",
        a: "Apps ask for broad file access and often monetize your documents. A browser page that works offline cannot exfiltrate anything by design — there is nothing to send your files to.",
      },
      {
        q: "Is there a page or size limit on phones?",
        a: "No artificial limit — your phone's memory is the real one. Typical contracts, statements and reports merge instantly; huge scans benefit from closing other apps first.",
      },
    ],
  },
  {
    slug: "remove-pdf-password",
    toolId: "unlock",
    h1: "Remove a password from a PDF you own",
    title: "Remove PDF Password — For Files You Can Open",
    description:
      "Take the password off a PDF you own and keep a free, unlocked copy. Works entirely in your browser — your file and password never leave the device.",
    intro: [
      "You know the password. The bank statement opens fine — but every time you want to print it, attach it to a tax form or archive it properly, you retype that password. What you need is not “cracking”: you need to save an unlocked copy of a file you can already open.",
      "That is exactly what this page does — honestly and locally. It cannot open a PDF you cannot open (there is no decryption of unknown passwords, and nothing here pretends otherwise), but for any file whose password you know, it removes the encryption from the saved copy in seconds, entirely on your device. The password you type is used in memory and never stored or sent.",
    ],
    steps: [
      {
        name: "Add the locked PDF",
        text: "Drop the password-protected file into the zone. Nothing is uploaded — the file stays in your browser.",
      },
      {
        name: "Enter the current password",
        text: "Type the password you already use to open the file. It is used in memory only — never stored, never transmitted.",
      },
      {
        name: "Download the unlocked copy",
        text: "Save the new PDF. It opens without a password from now on — keep both files until you confirm.",
      },
    ],
    faqs: [
      {
        q: "Can this crack a PDF whose password I forgot?",
        a: "No, and nothing honest can promise that instantly. Real password recovery is either brute-force (slow, uncertain) or exploits (unreliable). This tool does the legitimate thing: removing encryption from files you can already open.",
      },
      {
        q: "What is the difference between user and owner passwords?",
        a: "A user password opens the file; an owner password only restricts editing or printing. If a file opens without a password but blocks changes, that restriction lives in the permissions — removing it from a copy of a document you own is your call as the owner.",
      },
      {
        q: "Where does my password go when I type it?",
        a: "Nowhere. It stays in the browser tab's memory for the few seconds the tool needs, then it is gone. There is no server to send it to, and it is never written to storage.",
      },
      {
        q: "Will the unlocked file work everywhere?",
        a: "Yes — the saved copy is a standard unencrypted PDF that opens in Adobe Reader, Preview, browsers and phone viewers alike.",
      },
    ],
  },
];

export const intentBySlug = (slug: string) =>
  INTENT_PAGES.find((p) => p.slug === slug) ?? null;
