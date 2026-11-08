"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "@/lib/i18n-hooks";

/**
 * useToolNav — every tool entry point (grid, mega menu, palette, footer,
 * suggestions) routes through the real per-tool URL /<locale>/tool/[id],
 * which opens the tool on mount (keeping any already-dropped files). Gives
 * the browser Back button, crawlable links and per-tool canonical URLs.
 */
export function useToolNav() {
  const router = useRouter();
  const locale = useLocale();
  return useCallback(
    (id: string) => {
      router.push(`/${locale}/tool/${id}`);
    },
    [router, locale]
  );
}
