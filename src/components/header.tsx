"use client";

import { useStore } from "@/lib/store";
import { Button } from "@/components/kit/button";
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
    <header className="sticky top-0 z-40 border-b border-border-subtle bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
        <button
          onClick={goHome}
          className="flex items-center gap-2.5 rounded-control outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="SwiftPDF home"
        >
          <Logo className="size-8" />
          <span className="text-[17px] font-bold tracking-tight">
            Swift<span className="text-gradient">PDF</span>
          </span>
        </button>

        <span className="ml-1 hidden text-caption text-fg-faint md:inline">
          {view === "tool" && toolId
            ? "· local workspace"
            : "· PDF tools that never upload"}
        </span>

        <div className="ml-auto flex items-center gap-2">
          {/* privacy badge */}
          <div
            className="group relative flex items-center gap-1.5 whitespace-nowrap rounded-chip border border-success/25 bg-success/10 px-2.5 py-1.5 sm:px-3"
            title="Your files are processed on your device. Nothing is uploaded, ever."
          >
            <ShieldCheck className="size-3.5 text-success" />
            <span className="text-[11px] font-semibold text-success sm:text-micro">
              0 bytes uploaded
            </span>
            <span className="pointer-events-none absolute -bottom-10 right-0 hidden whitespace-nowrap rounded-control border border-border bg-popover px-2.5 py-1.5 text-micro text-popover-foreground shadow-md group-hover:block sm:hidden">
              Files are processed on-device — works offline too
            </span>
          </div>

          <Button
            variant="secondary"
            size="icon"
            onClick={() => setPalette(true)}
            aria-label="Open command palette (Ctrl+K)"
            className="rounded-chip"
          >
            <Command />
          </Button>

          <Button
            variant="secondary"
            size="icon"
            className="rounded-chip"
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            aria-label="Toggle theme"
          >
            <Sun className="hidden dark:block" />
            <Moon className="block dark:hidden" />
          </Button>
        </div>
      </div>
    </header>
  );
}
