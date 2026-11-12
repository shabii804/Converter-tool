"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { TOOLS, toolById } from "@/lib/tools";
import { useCopy, useLocaleHref } from "@/lib/i18n-hooks";
import { ToolCard } from "./kit/tool-card";

/**
 * RelatedTools — contextual internal linking between related tools
 * (same category, excluding the current tool; falls back to popular picks).
 */
export function RelatedTools({ toolId }: { toolId: string }) {
  const t = useCopy();
  const localeHref = useLocaleHref();
  const tool = toolById(toolId);
  if (!tool) return null;

  const sameCategory = TOOLS.filter((x) => x.category === tool.category && x.id !== tool.id);
  const popular = TOOLS.filter((x) => x.badge === "Popular" && x.id !== tool.id);
  const seen = new Set<string>();
  const related = [...sameCategory, ...popular].filter((x) => {
    if (seen.has(x.id)) return false;
    seen.add(x.id);
    return true;
  }).slice(0, 4);

  return (
    <section aria-labelledby="related-tools" className="mt-12 border-t border-border-subtle pt-8">
      <h2 id="related-tools" className="text-lg font-bold tracking-heading">
        {t.related.title}
      </h2>
      <p className="mt-1 text-[13px] text-fg-muted">{t.related.sub}</p>
      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {related.map((x, i) => (
          <ToolCard key={x.id} tool={x} index={i} onOpen={() => {}} />
        ))}
      </div>
      <p className="mt-4 text-[13px] text-fg-faint">
        Or go back to{" "}
        <Link href={localeHref("/")} className="font-semibold text-primary underline-offset-4 hover:underline">
          all {TOOLS.length} tools
        </Link>
        .
      </p>
    </section>
  );
}
