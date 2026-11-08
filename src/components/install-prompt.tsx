"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { useCopy } from "@/lib/i18n-hooks";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/** Shows the native install prompt when the browser offers one (PWA). */
export function InstallAppButton() {
  const t = useCopy();
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!deferred) return null;

  return (
    <button
      onClick={async () => {
        await deferred.prompt();
        const choice = await deferred.userChoice;
        if (choice.outcome === "accepted") setDeferred(null);
      }}
      className="inline-flex min-h-11 items-center gap-2 rounded-control border border-border px-4 text-[13px] font-semibold text-fg-muted outline-none transition-colors hover:border-border-strong hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Download className="size-4" aria-hidden="true" />
      {t.install.label}
    </button>
  );
}
