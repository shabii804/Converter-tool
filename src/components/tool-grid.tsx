"use client";

import { useMemo, useState } from "react";
import { TOOLS, type ToolCategory } from "@/lib/tools";
import { useStore } from "@/lib/store";
import { useToolNav } from "@/lib/use-tool-nav";
import { useCopy } from "@/lib/i18n-hooks";
import { ToolCard } from "@/components/kit/tool-card";
import { Tabs } from "@/components/kit/tabs";
import { categoryMeta } from "@/components/kit/category";
import { iconTileSurface } from "@/components/kit/icon-tile";
import { Button } from "@/components/kit/button";
import { Search, X, SearchX } from "lucide-react";

const CAT_ORDER: ToolCategory[] = ["core", "convert", "edit", "security"];

export function ToolGrid() {
  const t = useCopy();
  const filter = useStore((s) => s.toolFilter);
  const setFilter = useStore((s) => s.setToolFilter);
  const favorites = useStore((s) => s.favorites);
  const toggleFavorite = useStore((s) => s.toggleFavorite);
  const recent = useStore((s) => s.recent);
  const clearRecent = useStore((s) => s.clearRecent);
  const nav = useToolNav();
  const setPalette = useStore((s) => s.setPalette);
  const [query, setQuery] = useState("");

  const ql = query.trim().toLowerCase();

  const visible = useMemo(() => {
    if (ql) {
      return TOOLS.filter((tool) =>
        `${tool.name} ${tool.tagline} ${tool.description} ${tool.keywords ?? ""}`
          .toLowerCase()
          .includes(ql)
      );
    }
    if (filter === "favorites") return TOOLS.filter((tool) => favorites.includes(tool.id));
    if (filter === "all") return TOOLS;
    return TOOLS.filter((tool) => tool.category === filter);
  }, [ql, filter, favorites]);

  const tabItems = [
    { id: "all", label: t.cats.all },
    ...CAT_ORDER.map((c) => ({ id: c, label: t.cats[c] })),
    ...(favorites.length > 0 ? [{ id: "favorites", label: `${t.grid.tabFavs} (${favorites.length})` }] : []),
  ];

  const recentTools = recent
    .map((id) => TOOLS.find((x) => x.id === id))
    .filter((x): x is (typeof TOOLS)[number] => Boolean(x));

  return (
    <section id="tools" className="mx-auto max-w-6xl scroll-mt-20 px-4 pb-16 pt-8 sm:px-6 sm:pt-10">
      <div className="mb-6 flex flex-col gap-4 sm:mb-8 lg:flex-row lg:items-center lg:justify-between">
        <h2 className="text-h2 font-bold tracking-heading">
          {t.grid.title}
          <span className="ml-2 text-sm font-normal text-fg-faint">{t.grid.count}</span>
        </h2>
        {/* local search */}
        <div className="relative w-full lg:w-72">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-faint"
            aria-hidden="true"
          />
          <input
            id="tool-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.grid.searchPh}
            aria-label={t.grid.searchAria}
            className="h-11 w-full rounded-control border border-border bg-surface-2 pl-9 pr-10 text-sm text-foreground outline-none transition-colors placeholder:text-fg-faint focus-visible:border-border-strong focus-visible:ring-2 focus-visible:ring-ring"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="absolute right-1.5 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-chip text-fg-muted outline-none transition-colors hover:bg-surface-3 focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="size-3.5" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {!ql && (
        <div className="mb-6">
          <Tabs
            ariaLabel={t.grid.title}
            value={filter}
            onChange={(v) => setFilter(v as ToolCategory | "all" | "favorites")}
            items={tabItems}
          />
        </div>
      )}

      {/* recently used — local only */}
      {recentTools.length > 0 && !ql && filter !== "favorites" && (
        <div className="mb-7 rounded-card border border-border-subtle bg-surface-1/60 p-4">
          <div className="mb-2.5 flex items-center gap-2 px-1">
            <p className="text-[13px] font-bold">{t.grid.recent}</p>
            <span className="text-micro text-fg-faint">· {t.grid.recentNote}</span>
            <button
              onClick={clearRecent}
              className="ml-auto rounded-chip px-2.5 py-1 text-micro font-medium text-fg-faint outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              {t.grid.clear}
            </button>
          </div>
          <div className="flex snap-x gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]">
            {recentTools.map((tool) => {
              const meta = categoryMeta(tool.category);
              return (
                <button
                  key={tool.id}
                  onClick={() => nav(tool.id)}
                  className="flex min-h-11 shrink-0 snap-start items-center gap-2 rounded-chip border border-border bg-surface-2 py-1.5 pl-1.5 pr-4 outline-none transition-colors hover:border-border-strong focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span
                    className="flex size-7 items-center justify-center rounded-[9px]"
                    style={iconTileSurface(meta)}
                    aria-hidden="true"
                  >
                    <tool.icon className="size-3.5" strokeWidth={2.2} style={{ color: `var(${meta.accentVar})` }} />
                  </span>
                  <span className="whitespace-nowrap text-[13px] font-semibold">{tool.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {visible.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
          {visible.map((tool, i) => (
            <ToolCard
              key={tool.id}
              tool={tool}
              index={i}
              onOpen={nav}
              favorite={favorites.includes(tool.id)}
              onToggleFavorite={() => toggleFavorite(tool.id)}
              favAddLabel={t.grid.favAdd}
              favRemoveLabel={t.grid.favRemove}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4 rounded-card border border-dashed border-border px-6 py-14 text-center">
          <SearchX className="size-6 text-fg-faint" aria-hidden="true" />
          <p className="text-sm font-semibold">
            {t.grid.noResults}
            {ql && <span className="text-fg-muted"> “{query.trim()}”</span>}
          </p>
          <p className="max-w-sm text-[13px] text-fg-muted">{t.grid.noResultsHint}</p>
          <Button variant="secondary" size="md" onClick={() => setPalette(true)}>
            {t.grid.noResultsCta}
          </Button>
        </div>
      )}
    </section>
  );
}
