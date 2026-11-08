"use client";

/**
 * AppShell — the SPA chrome + view machine shared by the home route (/)
 * and the per-tool deep links (/tool/[id]). With a deepLinkToolId, the
 * shell opens that tool on mount (files already in the store are kept)
 * and returns to "/" when the user navigates home.
 */
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useStore } from "@/lib/store";
import { LocaleProvider } from "@/lib/i18n-hooks";
import { useCopy } from "@/lib/i18n-hooks";
import type { Lang } from "@/lib/i18n";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Hero } from "@/components/hero";
import { ToolGrid } from "@/components/tool-grid";
import { HomeSections } from "@/components/home-sections";
import { Workspace } from "@/components/workspace";
import { Processing } from "@/components/processing";
import { Done } from "@/components/done";
import { CommandPalette } from "@/components/command-palette";

const views = {
  home: "home",
  tool: "tool",
  processing: "processing",
  done: "done",
} as const;

export function AppShell({
  locale,
  deepLinkToolId,
}: {
  locale: Lang;
  deepLinkToolId?: string;
}) {
  const view = useStore((s) => s.view);
  const hydrateLocal = useStore((s) => s.hydrateLocal);
  const t = useCopy();
  const reduce = useReducedMotion();
  const router = useRouter();
  const openedRef = useRef(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  /* restore local-only prefs (language, favorites, recents) after mount */
  useEffect(() => {
    hydrateLocal();
  }, [hydrateLocal]);

  /* deep link: /tool/[id] opens the tool (kept files are preserved) */
  useEffect(() => {
    if (!deepLinkToolId) return;
    const st = useStore.getState();
    if (st.toolId !== deepLinkToolId || st.view === "home") {
      st.openTool(deepLinkToolId);
    }
    openedRef.current = true;
  }, [deepLinkToolId]);

  /* on a tool route, going back to the home VIEW also restores the / URL */
  useEffect(() => {
    if (!deepLinkToolId || !openedRef.current) return;
    return useStore.subscribe((s) => {
      if (s.view === "home") router.replace(`/${locale}/`, { scroll: false });
    });
  }, [deepLinkToolId, router, locale]);

  return (
    <LocaleProvider locale={locale}>
    <div className="flex min-h-[100dvh] flex-col bg-background">
      <a
        href="#tools"
        className="sr-only rounded-control focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:bg-foreground focus:px-4 focus:py-2.5 focus:text-[13px] focus:font-semibold focus:text-background"
      >
        {t.a11y.skip}
      </a>
      <Header />
      <main className="flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={views[view]}
            initial={reduce ? undefined : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, y: -8 }}
            transition={reduce ? { duration: 0 } : { duration: 0.22, ease: "easeOut" }}
          >
            {view === "home" && (!deepLinkToolId || mounted) && (
              <>
                <Hero />
                <ToolGrid />
                <HomeSections />
              </>
            )}
            {view === "home" && deepLinkToolId && !mounted && (
              <div className="min-h-[60dvh]" aria-hidden="true" />
            )}
            {view === "tool" && <Workspace />}
            {view === "processing" && <Processing />}
            {view === "done" && <Done />}
          </motion.div>
        </AnimatePresence>
      </main>
      <Footer />
      <CommandPalette />
    </div>
    </LocaleProvider>
  );
}
