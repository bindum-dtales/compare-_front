"use client";

import { useState } from "react";
import { ArrowRight, Check, Plus } from "lucide-react";
import { useAppState } from "@/components/layout/app-state";
import { PILLAR_LIST } from "@/lib/pillars";
import type { Comparison, Impact, Recommendation } from "@/lib/types";

const IMPACT: Record<Impact, { label: string; chip: string }> = {
  high: { label: "High impact", chip: "bg-bad/10 text-bad" },
  medium: { label: "Medium impact", chip: "bg-warn/10 text-warn" },
  low: { label: "Low impact", chip: "bg-good/10 text-good" },
};
const ORDER: Impact[] = ["high", "medium", "low"];

function RecommendationCard({ r, planned, onToggle }: { r: Recommendation; planned: boolean; onToggle: () => void }) {
  const impact = IMPACT[r.impact];
  return (
    <article className="rounded-[14px] border border-line bg-surface p-4 transition-shadow hover:shadow-lift sm:p-5">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className={`rounded-md px-1.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wide ${impact.chip}`}>{impact.label}</span>
        <span className="text-[11.5px] text-muted">{r.metric}</span>
      </div>
      <h4 className="mt-2.5 text-[14.5px] font-bold leading-snug [overflow-wrap:anywhere]">{r.title}</h4>
      <p className="mt-1.5 text-[13px] leading-relaxed text-ink-2 [overflow-wrap:anywhere]">{r.explanation}</p>
      {r.action && (
        <p className="mt-3 rounded-[10px] bg-canvas px-3 py-2.5 text-[12.5px] leading-relaxed text-ink-2 [overflow-wrap:anywhere]">
          <span className="font-bold text-ink">Next step: </span>
          {r.action}
        </p>
      )}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-[12px] text-muted">
          Score
          <span className="font-bold tabular-nums text-ink">{r.current}</span>
          <ArrowRight className="size-3.5" aria-label="to" />
          <span className="font-bold tabular-nums text-good">{r.target}</span>
        </p>
        <button
          type="button"
          onClick={onToggle}
          aria-pressed={planned}
          className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] font-semibold transition-colors ${
            planned ? "border-good/30 bg-good/10 text-good" : "border-line text-ink hover:border-accent-strong hover:bg-accent-soft"
          }`}
        >
          {planned ? <Check className="size-3.5" strokeWidth={3} /> : <Plus className="size-3.5" strokeWidth={3} />}
          {planned ? "In plan" : "Add to plan"}
        </button>
      </div>
    </article>
  );
}

/** The subject's real recommendations (from its own research), by pillar, highest impact first. */
export function ImproveNext({ comparison }: { comparison: Comparison }) {
  const { notify } = useAppState();
  const [planned, setPlanned] = useState<string[]>([]);
  const subject = comparison.companies[0]!.company.name;
  const recs = comparison.recommendations;

  function toggle(r: Recommendation) {
    const adding = !planned.includes(r.id);
    setPlanned((p) => (adding ? [...p, r.id] : p.filter((x) => x !== r.id)));
    if (adding) notify(`Added to action plan: ${r.title}`);
  }

  return (
    <section aria-labelledby="improve-title" className="space-y-4">
      <div className="flex flex-col gap-1 px-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Recommendations</p>
          <h2 id="improve-title" className="mt-1.5 text-[24px] font-extrabold tracking-[-0.03em] sm:text-[28px]">
            What to improve next
          </h2>
          <p className="mt-1 text-[13px] text-muted">
            For {subject}, from its research. {planned.length > 0 && <span className="font-semibold text-ink">{planned.length} in your action plan.</span>}
          </p>
        </div>
      </div>

      {recs.length ? (
        <div className="grid gap-4 xl:grid-cols-3">
          {PILLAR_LIST.map((p) => {
            const group = recs.filter((r) => r.pillar === p.id).sort((a, b) => ORDER.indexOf(a.impact) - ORDER.indexOf(b.impact));
            return (
              <div key={p.id} className="card flex flex-col overflow-hidden" aria-labelledby={`improve-${p.id}`}>
                <div className="h-1" style={{ background: p.color }} aria-hidden />
                <div className="flex items-baseline justify-between gap-2 px-5 pb-3 pt-4">
                  <h3 id={`improve-${p.id}`} className="text-[16px] font-extrabold" style={{ color: p.ink }}>
                    {p.label} <span className="text-[12.5px] font-medium text-muted">· {p.visibility}</span>
                  </h3>
                  <span className="rounded-full bg-canvas px-2 py-0.5 text-[11.5px] font-bold tabular-nums text-ink-2">{group.length}</span>
                </div>
                <div className="flex-1 space-y-3 bg-canvas/40 p-3 sm:p-4">
                  {group.length ? (
                    group.map((r) => <RecommendationCard key={r.id} r={r} planned={planned.includes(r.id)} onToggle={() => toggle(r)} />)
                  ) : (
                    <p className="px-2 py-6 text-center text-[13px] text-muted">No {p.label} recommendations in this research.</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card p-10 text-center">
          <p className="text-[14px] font-semibold">No recommendations were produced for {subject}&apos;s research.</p>
          <p className="mt-1 text-[13px] text-muted">Re-run the research to generate them from its latest checks.</p>
        </div>
      )}
    </section>
  );
}
