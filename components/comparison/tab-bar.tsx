"use client";

import { useRef } from "react";
import { Bot, EyeOff, LayoutGrid, Library, Lightbulb, MessageSquareText, Search } from "lucide-react";

export const TABS = [
  { id: "overview", label: "Overview", icon: LayoutGrid },
  { id: "seo", label: "SEO", icon: Search },
  { id: "aeo", label: "AEO", icon: MessageSquareText },
  { id: "geo", label: "GEO", icon: Bot },
  { id: "insights", label: "Insights", icon: Lightbulb },
  { id: "hidden", label: "Hidden Assets", icon: EyeOff },
  { id: "sources", label: "Sources", icon: Library },
] as const;

export type TabId = (typeof TABS)[number]["id"];

export function TabBar({ active, onChange, counts }: { active: TabId; onChange: (t: TabId) => void; counts: Partial<Record<TabId, number>> }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  function onKey(e: React.KeyboardEvent, i: number) {
    const dir = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    const next = (i + dir + TABS.length) % TABS.length;
    onChange(TABS[next].id);
    refs.current[next]?.focus();
  }

  return (
    <div className="card overflow-x-auto p-1.5 [scrollbar-width:none]" data-noprint>
      <div role="tablist" aria-label="Comparison views" className="flex min-w-max">
        {TABS.map(({ id, label, icon: Icon }, i) => {
          const selected = id === active;
          return (
            <button
              key={id}
              ref={(el) => {
                refs.current[i] = el;
              }}
              role="tab"
              id={`tab-${id}`}
              aria-selected={selected}
              aria-controls={`panel-${id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(id)}
              onKeyDown={(e) => onKey(e, i)}
              className={`relative flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-[10px] px-4 py-2.5 text-[13px] transition-colors ${
                selected ? "bg-accent-soft font-semibold text-ink" : "font-medium text-muted hover:bg-canvas hover:text-ink"
              }`}
            >
              <Icon className="size-4" strokeWidth={1.9} />
              {label}
              {counts[id] ? (
                <span className={`rounded-full px-1.5 text-[10.5px] font-bold tabular-nums ${selected ? "bg-accent text-white" : "bg-line text-ink-2"}`}>{counts[id]}</span>
              ) : null}
              {selected && <span className="absolute inset-x-5 bottom-0 h-[2.5px] rounded-full bg-accent-strong" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
