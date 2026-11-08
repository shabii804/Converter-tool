"use client";

import { useState } from "react";
import { TOOLS, type ToolCategory } from "@/lib/tools";
import { useStore } from "@/lib/store";
import { ToolCard } from "@/components/kit/tool-card";
import { Tabs } from "@/components/kit/tabs";

export function ToolGrid() {
  const [cat, setCat] = useState<ToolCategory | "all">("all");
  const openTool = useStore((s) => s.openTool);
  const tools = TOOLS.filter((t) => cat === "all" || t.category === cat);

  return (
    <section className="mx-auto max-w-6xl px-4 pb-20 pt-16 sm:px-6">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-h2 font-bold tracking-heading">
          All tools
          <span className="ml-2 text-sm font-normal text-fg-faint">
            {TOOLS.length} built-in · more coming
          </span>
        </h2>
        <Tabs
          ariaLabel="Tool categories"
          value={cat}
          onChange={(v) => setCat(v as ToolCategory | "all")}
          items={[
            { id: "all", label: "All tools" },
            { id: "core", label: "Core" },
            { id: "convert", label: "Convert" },
            { id: "edit", label: "Edit" },
            { id: "security", label: "Security" },
          ]}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
        {tools.map((t, i) => (
          <ToolCard key={t.id} tool={t} index={i} onOpen={openTool} />
        ))}
      </div>
    </section>
  );
}
