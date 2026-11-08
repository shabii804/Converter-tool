"use client";

/**
 * Locale runtime — the active locale comes from the URL ([locale] segment,
 * passed down by the server layout) and is provided through React context
 * so every prerendered page renders the right language in its HTML.
 */
import { createContext, useContext, useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { dictionaries, DEFAULT_LOCALE, localeMeta, type Copy, type Lang } from "./i18n";
import { useStore } from "./store";

const LocaleContext = createContext<Lang>(DEFAULT_LOCALE);

export function LocaleProvider({
  locale,
  children,
}: {
  locale: Lang;
  children: React.ReactNode;
}) {
  /* keep the legacy store lang in sync (harmless consumers) */
  const setLang = useStore((s) => s.setLang);
  useEffect(() => {
    setLang(locale);
  }, [locale, setLang]);

  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

/** Reactive copy hook — dictionary for the URL locale. */
export function useCopy(): Copy {
  const locale = useContext(LocaleContext);
  return useMemo(() => dictionaries[locale] ?? dictionaries.en, [locale]);
}

/** Current locale (from URL). */
export function useLocale(): Lang {
  return useContext(LocaleContext);
}

/** Build an href inside the current locale segment. */
export function useLocaleHref() {
  const locale = useContext(LocaleContext);
  return (path: string) => `/${locale}${path === "/" ? "" : path}`;
}

/**
 * Link that stays inside the current locale segment.
 * (No need for a wrapper where plain Link already includes the prefix.)
 */
export function LocaleLink({
  href,
  ...rest
}: { href: string } & Omit<React.ComponentProps<typeof Link>, "href">) {
  const locale = useContext(LocaleContext);
  const target = `/${locale}${href === "/" ? "" : href}`;
  return <Link href={target} {...rest} />;
}

/** Locale meta (label/short/dir) for the active locale. */
export function useLocaleMeta() {
  return localeMeta(useContext(LocaleContext));
}
