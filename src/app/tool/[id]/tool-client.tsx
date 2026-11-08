"use client";

import { AppShell } from "@/components/app-shell";

export function ToolPageClient({ id }: { id: string }) {
  return <AppShell deepLinkToolId={id} />;
}
