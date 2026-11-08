"use client";

import { useEffect, useRef } from "react";
import { useStore } from "@/lib/store";
import { Workspace } from "./workspace";

/**
 * IntentTool — embeds a real working tool inside an intent page.
 * Seeds the store with the page's preset (user-adjustable) and hides the
 * duplicate workspace header — the intent page provides the H1.
 */
export function IntentTool({
  toolId,
  preset,
}: {
  toolId: string;
  preset?: { key: string; value: unknown };
}) {
  const seeded = useRef(false);

  useEffect(() => {
    if (seeded.current) return;
    seeded.current = true;
    const st = useStore.getState();
    st.pendingPreset = preset ?? null;
    st.openTool(toolId);
  }, [toolId, preset]);

  return (
    <div className="rounded-card border border-border bg-surface-1/40 p-4 sm:p-6">
      <Workspace hideHeader />
    </div>
  );
}
