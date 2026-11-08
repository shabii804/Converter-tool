import type { MetadataRoute } from "next";
import { TOOLS } from "@/lib/tools";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages: MetadataRoute.Sitemap = [
    { url: `${BASE}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE}/blog`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${BASE}/design`, changeFrequency: "yearly", priority: 0.3 },
  ];
  const toolPages: MetadataRoute.Sitemap = TOOLS.map((t) => ({
    url: `${BASE}/tool/${t.id}`,
    changeFrequency: "monthly",
    priority: t.badge === "Popular" ? 0.9 : 0.8,
  }));
  return [...staticPages, ...toolPages];
}
