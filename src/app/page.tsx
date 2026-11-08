"use client";

import { useEffect } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useStore } from "@/lib/store";
import { useCopy } from "@/lib/i18n";
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

export default function Page() {
  const view = useStore((s) => s.view);
  const lang = useStore((s) => s.lang);
  const hydrateLocal = useStore((s) => s.hydrateLocal);
  const t = useCopy();
  const reduce = useReducedMotion();

  /* restore local-only prefs (language, favorites, recents) after mount */
  useEffect(() => {
    hydrateLocal();
  }, [hydrateLocal]);

  /* keep <html lang> in sync for screen readers */
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  return (
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
            {view === "home" && (
              <>
                <Hero />
                <ToolGrid />
                <HomeSections />
              </>
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
  );
}
