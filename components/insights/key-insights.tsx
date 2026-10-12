"use client";

import { useState } from "react";
import { ArrowDown, ArrowRight, ArrowUp, ChevronRight } from "lucide-react";
import { PILLAR_LIST } from "@/lib/pillars";
import type { Insight, Pillar } from "@/lib/types";

const TREND = {
  up: { icon: ArrowUp, cls: "bg-good/10 text-good", label: "Strength" },
  flat: { icon: ArrowRight, cls: "bg-accent-soft text-accent-ink", label: "Watch" },
  down: { icon: ArrowDown, cls: "bg-bad/10 text-bad", label: "Risk" },
};

export function KeyInsights({ insights, onOpen }: { insights: Insight[]; onOpen: (pillar: Pillar) => void }) {
  const [filter, setFilter] = useState<Pillar | "all">("all");
  const shown = insights.filter((i) => filter === "all" || i.pillar === filter);

  return (
    <div className="card flex h-full flex-col p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-[16px] font-bold">Key Insights</h3>
          <p className="mt-0.5 text-[12.5px] text-muted">Top findings from the analysis.</p>
        </div>
        <div className="flex rounded-full bg-canvas p-1" role="group" aria-label="Filter insights by pillar">
          {(["all", ...PILLAR_LIST.map((p) => p.id)] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              aria-pressed={filter === f}
              className={`rounded-full px-3 py-1 text-[11.5px] font-semibold uppercase transition-colors ${
                filter === f ? "bg-accent-soft text-ink shadow-card" : "text-muted hover:text-ink"
              }`}
            >
              {f === "all" ? "All" : f}
            </button>
          ))}
        </div>
      </div>

      <ul className="mt-4 flex-1 divide-y divide-line">
        {shown.map((ins) => {
          const t = TREND[ins.trend];
          return (
            <li key={ins.id}>
              <button
                onClick={() => onOpen(ins.pillar)}
                className="group flex w-full items-center gap-3.5 rounded-lg py-3.5 text-left transition-colors hover:bg-canvas/70 sm:px-2"
              >
                <span className={`grid size-8 shrink-0 place-items-center rounded-full ${t.cls}`} title={t.label}>
                  <t.icon className="size-4" strokeWidth={2.2} />
                  <span className="sr-only">{t.label}</span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13.5px] font-semibold">{ins.title}</span>
                  <span className="mt-0.5 block text-[12.5px] leading-snug text-muted">{ins.detail}</span>
                </span>
                <ChevronRight className="size-4 shrink-0 text-faint transition-transform group-hover:translate-x-0.5 group-hover:text-ink" />
              </button>
            </li>
          );
        })}
        {!shown.length && <li className="py-10 text-center text-[13px] text-muted">No {filter.toUpperCase()} findings in this run.</li>}
      </ul>
    </div>
  );
}
