"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useCopy } from "@/lib/i18n-hooks";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/kit/accordion";
import { PrivacyIllustration } from "@/components/illustrations";
import {
  FileUp,
  MousePointerClick,
  Download,
  ShieldCheck,
  Zap,
  WifiOff,
  Check,
} from "lucide-react";

const STEP_ICONS = [FileUp, MousePointerClick, Download];
const WHY_ICONS = [ShieldCheck, Zap, WifiOff];
const WHY_CLS = ["text-success", "text-primary", "text-primary"];

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-primary">{children}</p>
  );
}

export function HomeSections() {
  const t = useCopy();
  const reduce = useReducedMotion();

  const rise = (delay = 0) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 16 },
          whileInView: { opacity: 1, y: 0 },
          viewport: { once: true, margin: "-60px" },
          transition: { duration: 0.45, delay, ease: "easeOut" as const },
        };

  const scrollTop = () =>
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });

  const scrollToTools = () =>
    document.getElementById("tools")?.scrollIntoView({ behavior: reduce ? "auto" : "smooth" });

  return (
    <>
      {/* ---------- How it works ---------- */}
      <section id="how" className="mx-auto max-w-6xl scroll-mt-20 px-4 pb-6 pt-6 sm:px-6 sm:pt-10">
        <motion.div {...rise()}>
          <Eyebrow>{t.how.eyebrow}</Eyebrow>
          <h2 className="mt-2 text-h2 font-bold tracking-heading">{t.how.title}</h2>
        </motion.div>
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-5">
          {t.how.steps.map((s, i) => {
            const Icon = STEP_ICONS[i] ?? FileUp;
            return (
              <motion.div
                key={s.t}
                {...rise(i * 0.08)}
                className="rounded-card border border-border bg-surface-2/60 p-6 shadow-xs"
              >
                <div className="flex items-center justify-between">
                  <span
                    className="flex size-11 items-center justify-center rounded-card"
                    style={{
                      background: "var(--cat-core-tint)",
                      color: "var(--cat-core)",
                    }}
                    aria-hidden="true"
                  >
                    <Icon className="size-5" />
                  </span>
                  <span className="text-[26px] font-bold leading-none text-fg-faint/70">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>
                <h3 className="mt-4 text-[15px] font-bold">{s.t}</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-fg-muted">{s.d}</p>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ---------- Why on-device ---------- */}
      <section id="why" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-14 sm:px-6 sm:py-20">
        <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_1fr]">
          <motion.div {...rise()}>
            <Eyebrow>{t.why.eyebrow}</Eyebrow>
            <h2 className="mt-2 text-h2 font-bold tracking-heading">{t.why.title}</h2>
            <p className="mt-3 max-w-xl text-body text-fg-muted">{t.why.sub}</p>
            <ul className="mt-7 space-y-5">
              {t.why.items.map((item, i) => {
                const Icon = WHY_ICONS[i] ?? ShieldCheck;
                return (
                  <li key={item.t} className="flex items-start gap-3.5">
                    <span
                      className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-card"
                      style={{
                        background:
                          i === 0
                            ? "rgb(4 120 87 / 0.10)"
                            : "var(--cat-core-tint)",
                        color:
                          i === 0
                            ? "var(--cat-security)"
                            : "var(--cat-core)",
                      }}
                      aria-hidden="true"
                    >
                      <Icon className="size-4.5" />
                    </span>
                    <div>
                      <p className="text-[15px] font-bold">{item.t}</p>
                      <p className="mt-1 max-w-lg text-[13px] leading-relaxed text-fg-muted">
                        {item.d}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </motion.div>
          <motion.div {...rise(0.1)} className="flex justify-center lg:justify-end">
            <PrivacyIllustration className="h-auto w-full max-w-md opacity-90" />
          </motion.div>
        </div>
      </section>

      {/* ---------- Honest comparison ---------- */}
      <section id="compare" className="mx-auto max-w-6xl scroll-mt-20 px-4 pb-14 sm:px-6 sm:pb-20">
        <motion.div {...rise()}>
          <Eyebrow>{t.cmp.eyebrow}</Eyebrow>
          <h2 className="mt-2 text-h2 font-bold tracking-heading">{t.cmp.title}</h2>
          <p className="mt-3 max-w-xl text-body text-fg-muted">{t.cmp.sub}</p>
        </motion.div>
        <motion.div {...rise(0.08)} className="mt-8">
          <div className="overflow-hidden rounded-card border border-border bg-surface-1/60">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] border-collapse text-[13px] sm:text-sm">
                <caption className="sr-only">{t.cmp.title}</caption>
                <thead>
                  <tr className="border-b border-border bg-surface-2/70">
                    <th scope="col" className="px-4 py-3.5 text-left font-semibold text-fg-faint sm:px-5">
                      <span className="sr-only">Feature</span>
                    </th>
                    <th scope="col" className="px-4 py-3.5 text-left font-bold sm:px-5">
                      {t.cmp.you}
                    </th>
                    <th scope="col" className="px-4 py-3.5 text-left font-semibold text-fg-muted sm:px-5">
                      {t.cmp.them}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {t.cmp.rows.map((r) => (
                    <tr key={r.k} className="border-b border-border-subtle last:border-0">
                      <th scope="row" className="px-4 py-3.5 text-left align-top font-medium sm:px-5">
                        {r.k}
                      </th>
                      <td className="bg-surface-2/40 px-4 py-3.5 align-top font-semibold sm:px-5">
                        <Check className="mr-1.5 inline size-3.5 shrink-0 text-success" aria-hidden="true" />
                        {r.a}
                      </td>
                      <td className="px-4 py-3.5 align-top text-fg-muted sm:px-5">{r.b}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <p className="mt-3 px-1 text-micro leading-relaxed text-fg-faint">
            {t.cmp.them}: {t.cmp.rows[5].b}
          </p>
        </motion.div>
      </section>

      {/* ---------- FAQ ---------- */}
      <section id="faq" className="mx-auto max-w-3xl scroll-mt-20 px-4 pb-14 sm:px-6 sm:pb-20">
        <motion.div {...rise()}>
          <Eyebrow>{t.faq.eyebrow}</Eyebrow>
          <h2 className="mt-2 text-h2 font-bold tracking-heading">{t.faq.title}</h2>
        </motion.div>
        <motion.div {...rise(0.06)} className="mt-6 rounded-card border border-border bg-surface-1/60 px-5 sm:px-7">
          <Accordion type="single" collapsible>
            {t.faq.items.map((item, i) => (
              <AccordionItem key={item.q} value={`faq-${i}`}>
                <AccordionTrigger className="min-h-11 text-[14px] sm:text-[15px]">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="pb-5">
                  <p className="text-[13.5px] leading-relaxed text-fg-muted">{item.a}</p>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </section>

      {/* ---------- Final CTA ---------- */}
      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <motion.div
          {...rise()}
          className="relative overflow-hidden rounded-card bg-gradient-brand px-6 py-12 text-center shadow-glow sm:px-12 sm:py-16"
        >
          <h2 className="text-h2 font-bold tracking-heading text-white">{t.cta.title}</h2>
          <p className="mx-auto mt-3 max-w-xl text-[15px] leading-relaxed text-white/85">{t.cta.sub}</p>
          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <button
              onClick={scrollTop}
              className="inline-flex h-12 min-w-44 items-center justify-center rounded-control bg-white px-6 text-[15px] font-semibold text-[#0b0f1a] shadow-lg outline-none transition-all duration-150 hover:bg-white/90 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
            >
              {t.cta.btn}
            </button>
            <button
              onClick={scrollToTools}
              className="inline-flex h-12 min-w-44 items-center justify-center rounded-control border border-white/40 px-6 text-[15px] font-semibold text-white outline-none transition-colors duration-150 hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white"
            >
              {t.grid.title}
            </button>
          </div>
        </motion.div>
      </section>
    </>
  );
}
