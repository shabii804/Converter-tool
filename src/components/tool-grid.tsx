"use client";

import { useEffect, useMemo, useState } from "react";
import {
  TOOLS,
  MOST_USED_COUNT,
  rankTools,
  type ToolCategory,
} from "@/lib/tools";
import { useStore } from "@/lib/store";
import { useToolNav } from "@/lib/use-tool-nav";
import { useCopy } from "@/lib/i18n-hooks";
import { ToolCard } from "@/components/kit/tool-card";
import { Tabs } from "@/components/kit/tabs";
import { categoryMeta } from "@/components/kit/category";
import { iconTileSurface } from "@/components/kit/icon-tile";
import { Button } from "@/components/kit/button";
import {
  Search,
  X,
  SearchX,
  SlidersHorizontal,
  RotateCcw,
  Check,
  GripVertical,
} from "lucide-react";

const CAT_ORDER: ToolCategory[] = ["core", "convert", "edit", "security"];

const Grid = ({ children }: { children: React.ReactNode }) => (
  <div className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-4">{children}</div>
);

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
  const customOrder = useStore((s) => s.customOrder);
  const setCustomOrder = useStore((s) => s.setCustomOrder);
  const resetCustomOrder = useStore((s) => s.resetCustomOrder);
  const [query, setQuery] = useState("");
  const [customizing, setCustomizing] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  /* flat editable order while customizing (seeded from the current view) */
  const [editOrder, setEditOrder] = useState<string[]>([]);

  const ql = query.trim().toLowerCase();

  const ranked = useMemo(() => rankTools(TOOLS, customOrder), [customOrder]);

  useEffect(() => {
    if (customizing) setEditOrder(ranked.map((tool) => tool.id));
    // seed once per customize session — in-progress edits live in editOrder
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customizing]);

  const commitOrder = (ids: string[]) => {
    setEditOrder(ids);
    setCustomOrder(ids);
  };

  const move = (id: string, dir: -1 | 1) => {
    const i = editOrder.indexOf(id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= editOrder.length) return;
    const next = [...editOrder];
    next.splice(i, 1);
    next.splice(j, 0, id);
    commitOrder(next);
  };

  const dragEnterCard = (overId: string) => {
    if (!dragId || dragId === overId) return;
    const next = editOrder.filter((x) => x !== dragId);
    next.splice(next.indexOf(overId), 0, dragId);
    commitOrder(next);
  };

  /* flat lists for search / category / favorites views — always in the
     user's effective order (custom first, research rank as default) */
  const flatList = useMemo(() => {
    if (ql)
      return rankTools(
        TOOLS.filter((tool) =>
          `${tool.name} ${tool.tagline} ${tool.description} ${tool.keywords ?? ""}`
            .toLowerCase()
            .includes(ql)
        ),
        customOrder
      );
    if (filter === "favorites")
      return ranked.filter((tool) => favorites.includes(tool.id));
    if (filter !== "all") return ranked.filter((tool) => tool.category === filter);
    return ranked;
  }, [ql, filter, favorites, ranked, customOrder]);

  const tabItems = [
    { id: "all", label: t.cats.all },
    ...CAT_ORDER.map((c) => ({ id: c, label: t.cats[c] })),
    ...(favorites.length > 0 ? [{ id: "favorites", label: `${t.grid.tabFavs} (${favorites.length})` }] : []),
  ];

  const recentTools = recent
    .map((id) => TOOLS.find((x) => x.id === id))
    .filter((x): x is (typeof TOOLS)[number] => Boolean(x));

  /* grouped structure for the default "All" view */
  const showSections = !ql && filter === "all" && !customizing;
  const mostUsed = ranked.slice(0, MOST_USED_COUNT);
  const rest = ranked.slice(MOST_USED_COUNT);

  const cardProps = (toolId: string) => ({
    favorite: favorites.includes(toolId),
    onToggleFavorite: () => toggleFavorite(toolId),
    favAddLabel: t.grid.favAdd,
    favRemoveLabel: t.grid.favRemove,
  });

  const customizeCardProps = (toolId: string) => ({
    ...cardProps(toolId),
    customizing: true,
    isDragging: dragId === toolId,
    onDragStart: () => setDragId(toolId),
    onDragEnterCard: () => dragEnterCard(toolId),
    onDragEnd: () => setDragId(null),
    onMove: (dir: -1 | 1) => move(toolId, dir),
    moveUpLabel: t.grid.moveUp,
    moveDownLabel: t.grid.moveDown,
  });

  return (
    <section id="tools" className="mx-auto max-w-7xl scroll-mt-20 px-4 pb-16 pt-8 sm:px-6 sm:pt-10">
      <div className="mb-6 flex flex-col gap-4 sm:mb-8 lg:flex-row lg:items-center lg:justify-between">
        <h2 className="text-h2 font-bold tracking-heading">
          {t.grid.title}
          <span className="ml-2 text-sm font-normal text-fg-faint">{t.grid.count}</span>
        </h2>
        {!customizing && (
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center lg:w-auto">
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
                  className="absolute right-1.5 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-chip text-fg-faint outline-none transition-colors hover:bg-surface-3 focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <X className="size-3.5" aria-hidden="true" />
                </button>
              )}
            </div>
            {/* customize toggle */}
            <Button
              variant="secondary"
              size="md"
              onClick={() => setCustomizing(true)}
              className="shrink-0"
            >
              <SlidersHorizontal className="size-4" aria-hidden="true" />
              {t.grid.customize}
            </Button>
          </div>
        )}
        {customizing && (
          <Button
            variant="primary"
            size="md"
            onClick={() => setCustomizing(false)}
            className="shrink-0"
          >
            <Check className="size-4" aria-hidden="true" />
            {t.grid.done}
          </Button>
        )}
      </div>

      {customizing ? (
        /* ---------- customize mode: one flat list, drag or arrows ---------- */
        <>
          <div className="mb-5 flex flex-col gap-3 rounded-card border border-border-subtle bg-surface-1/60 p-4 sm:flex-row sm:items-center">
            <p className="flex items-center gap-2 text-[13px] text-fg-muted">
              <GripVertical className="size-4 shrink-0" aria-hidden="true" />
              {t.grid.customizeHint}
            </p>
            <div className="flex shrink-0 gap-2 sm:ml-auto">
              {customOrder.length > 0 && (
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => {
                    resetCustomOrder();
                    /* reseed from the research rank, NOT the stale ranked
                       closure (it still reflects the just-cleared order) */
                    setEditOrder(rankTools(TOOLS).map((tool) => tool.id));
                  }}
                >
                  <RotateCcw className="size-4" aria-hidden="true" />
                  {t.grid.resetOrder}
                </Button>
              )}
            </div>
          </div>
          <div
            onDragOver={(e) => e.preventDefault()}
            className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-4"
          >
            {editOrder.map((id, i) => {
              const tool = TOOLS.find((x) => x.id === id);
              if (!tool) return null;
              return (
                <ToolCard
                  key={id}
                  tool={tool}
                  index={i}
                  onOpen={nav}
                  {...customizeCardProps(id)}
                />
              );
            })}
          </div>
        </>
      ) : (
        <>
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

          {showSections ? (
            /* ---------- structured "All" view: most used + category sections ---------- */
            <div onDragOver={(e) => e.preventDefault()}>
              <div className="mb-3 flex items-center gap-2 px-0.5">
                <p className="text-[13px] font-bold">{t.grid.mostUsed}</p>
                <span className="text-micro text-fg-faint">· {t.grid.mostUsedNote}</span>
              </div>
              <Grid>
                {mostUsed.map((tool, i) => (
                  <ToolCard key={tool.id} tool={tool} index={i} onOpen={nav} {...cardProps(tool.id)} />
                ))}
              </Grid>
              {CAT_ORDER.map((cat) => {
                const tools = rest.filter((tool) => tool.category === cat);
                if (!tools.length) return null;
                const meta = categoryMeta(cat);
                return (
                  <div key={cat} className="mt-9">
                    <div className="mb-3 flex items-center gap-2 px-0.5">
                      <span
                        className="size-2 rounded-full"
                        style={{ background: `var(${meta.accentVar})` }}
                        aria-hidden="true"
                      />
                      <h3 className="text-[13px] font-bold uppercase tracking-wide">
                        {t.cats[cat]}
                      </h3>
                      <span className="text-micro text-fg-faint">{tools.length}</span>
                    </div>
                    <Grid>
                      {tools.map((tool, i) => (
                        <ToolCard key={tool.id} tool={tool} index={i} onOpen={nav} {...cardProps(tool.id)} />
                      ))}
                    </Grid>
                  </div>
                );
              })}
            </div>
          ) : flatList.length > 0 ? (
            /* ---------- flat views: search / category / favorites ---------- */
            <Grid>
              {flatList.map((tool, i) => (
                <ToolCard key={tool.id} tool={tool} index={i} onOpen={nav} {...cardProps(tool.id)} />
              ))}
            </Grid>
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
        </>
      )}
    </section>
  );
}
