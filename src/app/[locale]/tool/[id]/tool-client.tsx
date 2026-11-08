"use client";

import { AppShell } from "@/components/app-shell";
import type { Lang } from "@/lib/i18n";

export function ToolPageClient({ locale, id }: { locale: Lang; id: string }) {
  return <AppShell locale={locale} deepLinkToolId={id} />;
}
