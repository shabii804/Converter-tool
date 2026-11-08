"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useStore } from "@/lib/store";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Hero } from "@/components/hero";
import { ToolGrid } from "@/components/tool-grid";
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

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background">
      <Header />
      <main className="flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={views[view]}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            {view === "home" && (
              <>
                <Hero />
                <ToolGrid />
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
