"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/kit/button";
import { Card } from "@/components/kit/card";
import { ToolCard } from "@/components/kit/tool-card";
import { Dropzone } from "@/components/kit/dropzone";
import { FileCard } from "@/components/kit/file-card";
import { ProgressBar } from "@/components/kit/progress-bar";
import { ResultCard } from "@/components/kit/result-card";
import { Tabs } from "@/components/kit/tabs";
import {
  Modal,
  ModalContent,
  ModalTrigger,
} from "@/components/kit/modal";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/kit/accordion";
import { IconTile } from "@/components/kit/icon-tile";
import { SuccessCheck } from "@/components/kit/success-check";
import { ProgressRing } from "@/components/progress-ring";
import { MeshBackdrop } from "@/components/kit/mesh-backdrop";
import {
  PrivacyIllustration,
  EmptyPagesIllustration,
  OfflineIllustration,
} from "@/components/illustrations";
import { TOOLS, type ToolCategory } from "@/lib/tools";
import { CATEGORY_META } from "@/components/kit/category";
import { notify } from "@/components/kit/toast";
import { useTheme } from "next-themes";
import { Download } from "lucide-react";

/* ---------- live token swatch ---------- */

function Swatch({
  token,
  name,
  note,
}: {
  token: string;
  name: string;
  note?: string;
}) {
  const [resolved, setResolved] = useState<string>("");
  useEffect(() => {
    setResolved(
      getComputedStyle(document.documentElement).getPropertyValue(token).trim()
    );
  }, []);
  return (
    <div className="flex items-center gap-4">
      <span
        className="size-12 shrink-0 rounded-control border border-border shadow-xs"
        style={{ background: `var(${token})` }}
      />
      <div className="min-w-0">
        <p className="text-[13px] font-bold">{name}</p>
        <p className="truncate font-mono text-micro text-fg-faint">
          var({token}){resolved ? ` = ${resolved}` : ""}
        </p>
        {note && <p className="text-micro text-fg-faint">{note}</p>}
      </div>
    </div>
  );
}

function Section({
  id,
  eyebrow,
  title,
  desc,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  desc?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 py-12 first:pt-4">
      <p className="text-micro font-bold uppercase tracking-widest text-primary">
        {eyebrow}
      </p>
      <h2 className="mt-2 text-h2 font-bold tracking-heading">{title}</h2>
      {desc && <p className="mt-3 max-w-2xl text-body text-fg-muted">{desc}</p>}
      <div className="mt-8">{children}</div>
    </section>
  );
}

const NAV = [
  ["colors", "Colors"],
  ["typography", "Typography"],
  ["spacing", "Spacing & radius"],
  ["shadows", "Shadows"],
  ["categories", "Category accents"],
  ["components", "Components"],
  ["icons", "Iconography"],
  ["illustrations", "Illustrations"],
  ["motion", "Motion"],
] as const;

export default function DesignPage() {
  const [demoTab, setDemoTab] = useState("core");
  const { resolvedTheme } = useTheme();

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background">
      <Header />
      <main className="flex-1">
        {/* page hero */}
        <div className="relative overflow-hidden border-b border-border-subtle">
          <MeshBackdrop />
          <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6">
            <p className="text-micro font-bold uppercase tracking-widest text-primary">
              Design system · v1
            </p>
            <h1 className="mt-3 max-w-2xl text-h1 font-bold tracking-heading sm:text-display">
              Minimal, spacious, trustworthy.
            </h1>
            <p className="mt-4 max-w-2xl text-body text-fg-muted sm:text-lg">
              One gradient, four category accents, an 8px grid and layered soft
              shadows. Every color pair passes WCAG AA in both themes. Current
              theme:{" "}
              <b className="text-foreground">{resolvedTheme ?? "—"}</b> — use
              the header toggle to inspect the other one.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {NAV.map(([id, label]) => (
                <a
                  key={id}
                  href={`#${id}`}
                  className="rounded-chip border border-border bg-surface-2/70 px-3 py-1.5 text-[13px] font-medium text-fg-muted shadow-xs backdrop-blur transition-colors hover:border-border-strong hover:text-foreground"
                >
                  {label}
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          {/* COLORS */}
          <Section
            id="colors"
            eyebrow="Foundations"
            title="Colors"
            desc="Dark navy is the brand base (#0b0f1a); light is a fully supported equal. Text tokens are AA-checked against their backgrounds in both themes."
          >
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="p-6">
                <p className="mb-5 text-[13px] font-bold uppercase tracking-wide text-fg-faint">
                  Surfaces & text
                </p>
                <div className="space-y-5">
                  <Swatch token="--navy-950" name="Brand navy (dark background)" />
                  <Swatch token="--background" name="Background" />
                  <Swatch token="--surface-1" name="Surface 1 · sections" />
                  <Swatch token="--surface-2" name="Surface 2 · cards" />
                  <Swatch token="--surface-3" name="Surface 3 · hover/inset" />
                  <Swatch token="--foreground" name="Foreground" />
                  <Swatch token="--foreground-muted" name="Muted text · AA" />
                  <Swatch token="--foreground-faint" name="Faint text · captions only" />
                  <Swatch token="--border" name="Border" />
                  <Swatch token="--border-strong" name="Border strong" />
                </div>
              </Card>
              <Card className="p-6">
                <p className="mb-5 text-[13px] font-bold uppercase tracking-wide text-fg-faint">
                  Brand & feedback
                </p>
                <div className="space-y-5">
                  <Swatch token="--grad-from" name="Gradient · indigo" note="White text on it: 6.3:1" />
                  <Swatch token="--grad-to" name="Gradient · violet" note="White text on it: 5.7:1" />
                  <Swatch token="--primary" name="Primary interactive" />
                  <Swatch token="--success" name="Success / privacy" />
                  <Swatch token="--warning" name="Warning" />
                  <Swatch token="--destructive" name="Destructive" />
                  <div className="flex items-center gap-4 pt-2">
                    <span className="h-12 w-32 shrink-0 rounded-control bg-gradient-brand shadow-glow" />
                    <div>
                      <p className="text-[13px] font-bold">The one gradient</p>
                      <p className="font-mono text-micro text-fg-faint">
                        linear-gradient(100deg, indigo → violet)
                      </p>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </Section>

          {/* TYPOGRAPHY */}
          <Section
            id="typography"
            eyebrow="Foundations"
            title="Typography"
            desc="Inter everywhere, headings fluid via clamp(), tight tracking, balanced wrapping."
          >
            <Card className="divide-y divide-border-subtle">
              {[
                ["Display", "text-display font-bold tracking-heading", "Every PDF tool. None of your files leave this device."],
                ["H1", "text-h1 font-bold tracking-heading", "Done — processed on your device"],
                ["H2", "text-h2 font-bold tracking-heading", "All tools"],
                ["H3", "text-h3 font-bold", "Watermark options"],
                ["Body 15px", "text-body", "Drop a file and SwiftPDF figures out the rest — merge, split, compress, convert and more."],
                ["Caption 13px", "text-caption text-fg-muted", "Processing happens on this device. Nothing is uploaded."],
                ["Micro 12px", "text-micro text-fg-faint", "Files stay on this device · No account · Works offline"],
              ].map(([label, cls, sample]) => (
                <div key={label as string} className="flex flex-col gap-1 p-6 sm:flex-row sm:items-baseline sm:gap-8">
                  <span className="w-28 shrink-0 text-micro font-bold uppercase tracking-wide text-fg-faint">
                    {label}
                  </span>
                  <span className={cls as string}>{sample}</span>
                </div>
              ))}
            </Card>
          </Section>

          {/* SPACING & RADIUS */}
          <Section
            id="spacing"
            eyebrow="Foundations"
            title="Spacing & radius"
            desc="Everything sits on an 8px grid (Tailwind even steps: 2, 4, 6, 8, 12…). Controls 12px, cards 20px, chips fully rounded."
          >
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="p-6">
                <p className="mb-5 text-[13px] font-bold uppercase tracking-wide text-fg-faint">
                  Spacing scale (8px grid)
                </p>
                <div className="space-y-3">
                  {[8, 16, 24, 32, 48, 64].map((px) => (
                    <div key={px} className="flex items-center gap-4">
                      <span className="w-14 font-mono text-micro text-fg-faint">{px}px</span>
                      <span
                        className="h-3 rounded-chip bg-gradient-brand"
                        style={{ width: px * 4 }}
                      />
                    </div>
                  ))}
                </div>
              </Card>
              <Card className="p-6">
                <p className="mb-5 text-[13px] font-bold uppercase tracking-wide text-fg-faint">
                  Radius
                </p>
                <div className="flex flex-wrap gap-5">
                  {[
                    ["control", "rounded-control", "12px"],
                    ["card", "rounded-card", "20px"],
                    ["chip", "rounded-chip", "999px"],
                  ].map(([label, cls, px]) => (
                    <div key={label} className="text-center">
                      <div
                        className={`size-20 border border-border bg-surface-1 ${cls}`}
                      />
                      <p className="mt-2 text-[13px] font-semibold">{label}</p>
                      <p className="font-mono text-micro text-fg-faint">{px}</p>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </Section>

          {/* SHADOWS */}
          <Section
            id="shadows"
            eyebrow="Foundations"
            title="Shadows"
            desc="Two layers each — a tight contact shadow plus a wide, soft lift. Dark mode lowers opacity and leans on borders instead."
          >
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-5">
              {[
                ["xs", "shadow-xs"],
                ["sm", "shadow-sm"],
                ["md", "shadow-md"],
                ["lg", "shadow-lg"],
                ["glow", "shadow-glow"],
              ].map(([s, cls]) => (
                <div key={s} className="text-center">
                  <div
                    className={`grid h-20 place-items-center rounded-card border border-border bg-surface-2 ${cls}`}
                  >
                    <span className="font-mono text-micro text-fg-faint">{s}</span>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          {/* CATEGORY ACCENTS */}
          <Section
            id="categories"
            eyebrow="Foundations"
            title="Category accents"
            desc="Core = indigo, Convert = cyan, Edit = amber, Security = emerald. Text-grade in both themes; tiles use the tinted fill."
          >
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {(Object.keys(CATEGORY_META) as ToolCategory[]).map((c) => {
                const meta = CATEGORY_META[c];
                const rep = TOOLS.find((t) => t.category === c)!;
                return (
                  <Card key={c} className="p-5">
                    <IconTile icon={rep.icon} category={c} size="md" />
                    <p
                      className="mt-3 text-sm font-bold"
                      style={{ color: `var(${meta.accentVar})` }}
                    >
                      {meta.label}
                    </p>
                    <p className="mt-1 text-micro leading-snug text-fg-muted">
                      {meta.description}
                    </p>
                  </Card>
                );
              })}
            </div>
          </Section>

          {/* COMPONENTS */}
          <Section
            id="components"
            eyebrow="Library"
            title="Components"
            desc="Every interactive element on the site comes from this kit. Try them — they are live."
          >
            <div className="space-y-10">
              {/* buttons */}
              <div>
                <p className="mb-4 text-[13px] font-bold uppercase tracking-wide text-fg-faint">Button</p>
                <Card className="space-y-6 p-6">
                  <div className="flex flex-wrap items-center gap-3">
                    <Button variant="primary">Run merge</Button>
                    <Button variant="secondary">Add more files</Button>
                    <Button variant="outline">US Letter</Button>
                    <Button variant="ghost">Home</Button>
                    <Button variant="destructive">Clear</Button>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <Button size="sm">Small</Button>
                    <Button size="md">Medium</Button>
                    <Button size="lg">Large</Button>
                    <Button size="xl">
                      <Download /> Extra large
                    </Button>
                    <Button loading>Working…</Button>
                    <Button disabled>Disabled</Button>
                  </div>
                </Card>
              </div>

              {/* tabs */}
              <div>
                <p className="mb-4 text-[13px] font-bold uppercase tracking-wide text-fg-faint">Tabs</p>
                <Card className="p-6">
                  <Tabs
                    ariaLabel="Demo tabs"
                    value={demoTab}
                    onChange={setDemoTab}
                    items={[
                      { id: "core", label: "Core" },
                      { id: "convert", label: "Convert" },
                      { id: "edit", label: "Edit" },
                      { id: "security", label: "Security" },
                    ]}
                  />
                  <p className="mt-4 text-[13px] text-fg-muted">
                    Selected: <b className="text-foreground">{demoTab}</b>
                  </p>
                </Card>
              </div>

              {/* dropzone + file card */}
              <div>
                <p className="mb-4 text-[13px] font-bold uppercase tracking-wide text-fg-faint">
                  Dropzone · FileCard
                </p>
                <div className="grid gap-5 lg:grid-cols-2">
                  <Card className="p-6">
                    <Dropzone
                      accept="application/pdf,image/jpeg,image/png,.docx"
                      compact
                      onFiles={() => notify.info("Demo dropzone", "Nothing is kept or uploaded")}
                      title="Drop files here (demo)"
                      subtitle="or click to browse"
                    />
                  </Card>
                  <Card className="space-y-2.5 p-6">
                    <FileCard
                      name="quarterly-report.pdf"
                      size={2_411_520}
                      onRemove={() => {}}
                    />
                    <FileCard
                      name="scan-2026-11-05.jpg"
                      size={734_003}
                      onRemove={() => {}}
                    />
                  </Card>
                </div>
              </div>

              {/* progress + result */}
              <div>
                <p className="mb-4 text-[13px] font-bold uppercase tracking-wide text-fg-faint">
                  ProgressBar · ProgressRing · ResultCard · SuccessCheck
                </p>
                <Card className="space-y-5 p-6">
                  <ProgressBar value={0.68} ariaLabel="Demo progress" />
                  <ResultCard
                    name="merged.pdf"
                    size={1_204_224}
                    kind="PDF"
                    onDownload={() => {}}
                  />
                  <div className="flex items-center gap-6">
                    <ProgressRing value={0.68} size={64} stroke={6}>
                      <span className="text-[13px] font-bold">68%</span>
                    </ProgressRing>
                    <SuccessCheck size={64} />
                  </div>
                </Card>
              </div>

              {/* modal + toast */}
              <div>
                <p className="mb-4 text-[13px] font-bold uppercase tracking-wide text-fg-faint">Modal · Toast</p>
                <Card className="flex flex-wrap gap-3 p-6">
                  <Modal>
                    <ModalTrigger asChild>
                      <Button variant="secondary">Open modal</Button>
                    </ModalTrigger>
                    <ModalContent
                      title="Example modal"
                      description="20px radius, layered shadow, blurred scrim, focus-trapped."
                    >
                      <p className="text-sm leading-relaxed text-fg-muted">
                        Modals are built on Radix Dialog so keyboard and screen
                        reader behaviour come for free.
                      </p>
                    </ModalContent>
                  </Modal>
                  <Button variant="secondary" onClick={() => notify.success("Saved locally", "0 bytes uploaded")}>
                    Success toast
                  </Button>
                  <Button variant="secondary" onClick={() => notify.warning("Large file detected", "It may take a while — it runs on your device.")}>
                    Warning toast
                  </Button>
                  <Button variant="secondary" onClick={() => notify.error("Could not read this file", "If it is password-protected, unlock it first.")}>
                    Error toast
                  </Button>
                </Card>
              </div>

              {/* tool cards */}
              <div>
                <p className="mb-4 text-[13px] font-bold uppercase tracking-wide text-fg-faint">ToolCard</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {[TOOLS[0], TOOLS[6], TOOLS[14]].map((t, i) => (
                    <ToolCard
                      key={t.id}
                      tool={t}
                      index={i}
                      onOpen={() => notify.info("Demo card", "Navigation disabled on the style guide")}
                    />
                  ))}
                </div>
              </div>

              {/* accordion */}
              <div>
                <p className="mb-4 text-[13px] font-bold uppercase tracking-wide text-fg-faint">Accordion</p>
                <Card className="px-6 py-2">
                  <Accordion type="single" collapsible>
                    <AccordionItem value="a1">
                      <AccordionTrigger>Where do my files go?</AccordionTrigger>
                      <AccordionContent>
                        Nowhere. All processing runs in your browser tab using
                        WebAssembly libraries; nothing is transmitted to any server.
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="a2">
                      <AccordionTrigger>Is there a file size limit?</AccordionTrigger>
                      <AccordionContent>
                        There is no artificial quota. The practical limit is your
                        device memory — the app shows a friendly warning for very
                        large files.
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </Card>
              </div>
            </div>
          </Section>

          {/* ICONOGRAPHY */}
          <Section
            id="icons"
            eyebrow="Library"
            title="Iconography"
            desc="One set only: Lucide. Every tool has a distinct icon inside a soft gradient tile tinted by its category. No emojis, no mixed styles."
          >
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-8">
              {TOOLS.map((t) => (
                <div
                  key={t.id}
                  className="flex flex-col items-center gap-2.5 rounded-card border border-border bg-surface-2 p-4 text-center shadow-xs"
                >
                  <IconTile icon={t.icon} category={t.category} size="md" />
                  <span className="text-[11px] font-semibold leading-tight">{t.name}</span>
                </div>
              ))}
            </div>
          </Section>

          {/* ILLUSTRATIONS */}
          <Section
            id="illustrations"
            eyebrow="Library"
            title="Illustrations"
            desc="Original SVGs drawn for SwiftPDF — no stock, no hotlinks, theme-aware through tokens, zero network requests."
          >
            <div className="grid gap-5 sm:grid-cols-3">
              <Card className="flex flex-col items-center gap-4 p-6">
                <PrivacyIllustration className="w-full max-w-[220px]" />
                <p className="text-[13px] font-semibold">Privacy (hero)</p>
              </Card>
              <Card className="flex flex-col items-center gap-4 p-6">
                <EmptyPagesIllustration className="w-full max-w-[110px]" />
                <p className="text-[13px] font-semibold">Empty state (workspace)</p>
              </Card>
              <Card className="flex flex-col items-center gap-4 p-6">
                <OfflineIllustration className="w-full max-w-[150px]" />
                <p className="text-[13px] font-semibold">On-device (trust)</p>
              </Card>
            </div>
          </Section>

          {/* MOTION */}
          <Section
            id="motion"
            eyebrow="Principles"
            title="Motion"
            desc="Subtle only — motion explains state, never decorates. Everything collapses to zero under prefers-reduced-motion."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                ["Card hover lift", "−2px translate + border/shadow shift, 150–200ms ease-out"],
                ["Button press", "scale 0.98 on active, instant release"],
                ["Dropzone active", "border/tint change with a gentle icon float while dragging"],
                ["Progress ring", "stroke-dashoffset transition, 300ms ease-out"],
                ["Success check", "path draws once (450ms) with a spring pop — fires once, never loops"],
                ["Skeletons", "shimmer on thumbnails and lists while previews render"],
              ].map(([t, d]) => (
                <Card key={t} className="p-5">
                  <p className="text-sm font-bold">{t}</p>
                  <p className="mt-1 text-[13px] text-fg-muted">{d}</p>
                </Card>
              ))}
            </div>
            <p className="mt-6 rounded-control border border-border bg-surface-1 p-4 text-[13px] text-fg-muted">
              Reduced motion: the global stylesheet pins all durations to
              0.01ms and Framer components check <code className="font-mono">useReducedMotion()</code>.
            </p>
          </Section>

          <div className="py-16 text-center text-micro text-fg-faint">
            SwiftPDF design system · tokens in <code className="font-mono">src/design/tokens.css</code> ·
            kit in <code className="font-mono">src/components/kit/</code>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
