"use client";

import { AppShell } from "@/components/app-shell";
import type { Lang } from "@/lib/i18n";

export function HomeClient({ locale }: { locale: Lang }) {
  return <AppShell locale={locale} />;
}
