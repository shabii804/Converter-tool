"use client";

import { useEffect } from "react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { TOOLS, CATEGORIES } from "@/lib/tools";
import { useStore } from "@/lib/store";
import { useToolNav } from "@/lib/use-tool-nav";
import { useLocale, useLocaleHref } from "@/lib/i18n-hooks";
import { useTheme } from "next-themes";
import { Moon, Sun, Home, Palette } from "lucide-react";

export function CommandPalette() {
  const open = useStore((s) => s.paletteOpen);
  const setPalette = useStore((s) => s.setPalette);
  const goHome = useStore((s) => s.goHome);
  const nav = useToolNav();
  const locale = useLocale();
  const localeHref = useLocaleHref();
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setPalette(!open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [open, setPalette]);

  const run = (fn: () => void) => {
    setPalette(false);
    fn();
  };

  return (
    <CommandDialog open={open} onOpenChange={setPalette}>
      <CommandInput placeholder="Search tools… (e.g. merge, split, compress)" />
      <CommandList>
        <CommandEmpty>No tool found.</CommandEmpty>
        {CATEGORIES.filter((c) => c.id !== "all").map((cat) => (
          <CommandGroup key={cat.id} heading={cat.label}>
            {TOOLS.filter((t) => t.category === cat.id).map((t) => (
              <CommandItem
                key={t.id}
                onSelect={() => run(() => nav(t.id))}
              >
                <t.icon className="mr-2 size-4 text-primary" />
                <span>{t.name}</span>
                <span className="ml-auto text-xs text-fg-faint">{t.tagline}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
        <CommandSeparator />
        <CommandGroup heading="Actions">
          <CommandItem onSelect={() => run(goHome)}>
            <Home className="mr-2 size-4" />
            Go home
          </CommandItem>
          <CommandItem
            onSelect={() =>
              run(() => setTheme(theme === "dark" ? "light" : "dark"))
            }
          >
            {theme === "dark" ? (
              <Sun className="mr-2 size-4" />
            ) : (
              <Moon className="mr-2 size-4" />
            )}
            Toggle theme
          </CommandItem>
          <CommandItem
            onSelect={() => run(() => {
              window.location.assign(localeHref("/design"));
            })}
          >
            <Palette className="mr-2 size-4" />
            Open design system
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
