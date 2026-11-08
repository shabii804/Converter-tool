import type { MetadataRoute } from "next";
import { TOOLS } from "@/lib/tools";
import { LOCALES } from "@/lib/i18n";
import { SITE_URL } from "@/lib/seo";

/** Sitemap with per-locale URLs + hreflang alternates (xhtml:link). */
export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];

  const localized = (path: string, priority: number, changeFrequency: "weekly" | "monthly" | "yearly") =>
    LOCALES.map((l) => ({
      url: `${SITE_URL}/${l.id}${path === "/" ? "" : path}`,
      lastModified: new Date(),
      changeFrequency,
      priority,
      alternates: {
        languages: Object.fromEntries([
          ...LOCALES.map((l2) => [l2.hreflang, `${SITE_URL}/${l2.id}${path === "/" ? "" : path}`]),
          ["x-default", `${SITE_URL}/en${path === "/" ? "" : path}`],
        ]),
      },
    }));

  // home — fully localized chrome
  entries.push(...localized("/", 1, "weekly"));
  // tool pages — localized chrome + per-tool how-to
  for (const t of TOOLS) {
    entries.push(...localized(`/tool/${t.id}`, t.badge === "Popular" ? 0.9 : 0.8, "monthly"));
  }
  // blog index — localized chrome, English articles
  entries.push(...localized("/blog", 0.6, "weekly"));

  // English-only content pages
  entries.push(
    {
      url: `${SITE_URL}/en/design`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
  );
  for (const slug of INTENT_SLUGS) {
    entries.push({
      url: `${SITE_URL}/en/${slug}`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.85,
    });
  }
  for (const a of BLOG_ARTICLES) {
    entries.push({
      url: `${SITE_URL}/en/blog/${a.slug}`,
      lastModified: new Date(a.published),
      changeFrequency: "monthly",
      priority: 0.7,
    });
  }

  return entries;
}

/* imported lazily to keep this file self-contained for the sitemap format */
import { INTENT_SLUGS } from "@/lib/intent-pages";
import { ARTICLES as BLOG_ARTICLES } from "@/lib/blog-articles";
