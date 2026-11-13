"use client";

import { Share2, Check } from "lucide-react";
import { useState } from "react";
import { useCopy } from "@/lib/i18n-hooks";
import { notify } from "@/components/kit/toast";

/** Native share sheet with clipboard fallback — no tracking involved. */
export function ShareButton({ title, url }: { title: string; url: string }) {
  const t = useCopy();
  const [copied, setCopied] = useState(false);

  const onShare = async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      notify.success(t.share.copied);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* user dismissed the share sheet — nothing to do */
    }
  };

  return (
    <button
      onClick={onShare}
      className="ml-auto inline-flex min-h-11 items-center gap-1.5 rounded-chip border border-border px-3 text-[12px] font-semibold text-fg-muted outline-none transition-colors hover:border-border-strong hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
      aria-label={`${t.share.label}: ${title}`}
    >
      {copied ? <Check className="size-3.5 text-success" aria-hidden="true" /> : <Share2 className="size-3.5" aria-hidden="true" />}
      {t.share.label}
    </button>
  );
}
