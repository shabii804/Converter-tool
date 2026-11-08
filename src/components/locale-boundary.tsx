"use client";

import { LocaleProvider } from "@/lib/i18n-hooks";
import type { Lang } from "@/lib/i18n";

/** Server pages wrap client chrome (Header/Footer) in the URL locale. */
export function LocaleBoundary({
  locale,
  children,
}: {
  locale: Lang;
  children: React.ReactNode;
}) {
  return <LocaleProvider locale={locale}>{children}</LocaleProvider>;
}
