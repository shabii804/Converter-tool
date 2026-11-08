"use client";

import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import { Moon, Sun, ShieldCheck, Command } from "lucide-react";
import { Logo } from "./logo";

export function Header() {
  const { resolvedTheme, setTheme } = useTheme();
  const setPalette = useStore((s) => s.setPalette);
  const goHome = useStore((s) => s.goHome);
  const view = useStore((s) => s.view);
  const toolId = useStore((s) => s.toolId);

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 sm:px-6">
        <button
          onClick={goHome}
          className="flex items-center gap-2 rounded-lg outline-none ring-primary/40 focus-visible:ring-2"
          aria-label="SwiftPDF home"
        >
          <Logo className="h-7 w-7" />
          <span className="text-[17px] font-bold tracking-tight">
            Swift
            <span className="text-primary">PDF</span>
          </span>
        </button>

        <span className="ml-1 hidden text-xs font-medium text-muted-foreground md:inline">
          {view === "tool" && toolId
            ? "· local workspace"
            : "· PDF tools that never upload"}
        </span>

        {/* privacy badge */}
        <div className="ml-auto flex items-center gap-2">
          <div
            className="group relative flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5"
            title="Your files are processed on your device. Nothing is uploaded, ever."
          >
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 sm:text-xs">
              0 bytes uploaded
            </span>
            <span className="pointer-events-none absolute -bottom-9 right-0 hidden whitespace-nowrap rounded-md border bg-popover px-2.5 py-1.5 text-[11px] text-popover-foreground shadow-md group-hover:block">
              Files are processed on-device — works offline too
            </span>
          </div>

          <Button
            variant="outline"
            size="icon"
            className="hidden h-9 w-9 rounded-full sm:inline-flex"
            onClick={() => setPalette(true)}
            aria-label="Open command palette (Ctrl+K)"
          >
            <Command className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 rounded-full"
            onClick={() =>
              setTheme(resolvedTheme === "dark" ? "light" : "dark")
            }
            aria-label="Toggle theme"
          >
            <Sun className="hidden h-4 w-4 dark:block" />
            <Moon className="block h-4 w-4 dark:hidden" />
          </Button>
        </div>
      </div>
    </header>
  );
}
