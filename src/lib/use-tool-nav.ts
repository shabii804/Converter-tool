"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";

/**
 * useToolNav — every tool entry point (grid, mega menu, palette, footer,
 * suggestions) routes through the real per-tool URL /tool/[id], which
 * opens the tool on mount (keeping any already-dropped files). Gives the
 * browser Back button, crawlable links and per-tool canonical URLs.
 */
export function useToolNav() {
  const router = useRouter();
  return useCallback(
    (id: string) => {
      router.push(`/tool/${id}`);
    },
    [router]
  );
}
