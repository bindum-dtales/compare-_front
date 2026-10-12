"use client";

import { AlertTriangle, CheckCircle2, ChevronDown, Info, MinusCircle } from "lucide-react";
import { MetricBarChart } from "@/components/charts/metric-bar-chart";
import { CompanyLogo } from "@/components/ui/company-logo";
import { Delta } from "@/components/ui/delta";
import { PillarBadge } from "@/components/ui/pillar-badge";
import { ScoreRing } from "@/components/ui/score-ring";
import { Tooltip } from "@/components/ui/tooltip";
import { COMPANY_COLORS, PILLARS } from "@/lib/pillars";
import type { Comparison, CompanyResearch, Pillar } from "@/lib/types";
import { AiVisibility } from "./ai-visibility";

const SENTIMENT = {
  positive: { icon: CheckCircle2, cls: "text-good" },
  neutral: { icon: MinusCircle, cls: "text-warn" },
  negative: { icon: AlertTriangle, cls: "text-bad" },
};

function status(score: number) {
  return score >= 85 ? { label: "Strong", cls: "bg-good/10 text-good" } : score >= 70 ? { label: "Fair", cls: "bg-accent-soft text-accent-ink" } : { label: "Weak", cls: "bg-bad/10 text-bad" };
}

export function PillarTab({
  pillar,
  comparison,
  selected,
  onSelect,
}: {
  pillar: Pillar;
  comparison: Comparison;
  selected: CompanyResearch;
  onSelect: (id: string) => void;
}) {
  const def = PILLARS[pillar];
  const data = selected.pillars[pillar];
  const ranked = [...comparison.companies].sort((a, b) => b.pillars[pillar].score - a.pillars[pillar].score);
  const rank = ranked.indexOf(selected) + 1;
  const best = (i: number) => Math.max(...comparison.companies.map((c) => c.pillars[pillar].subMetrics[i].score));

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
        {/* Pillar score */}
        <div className="card relative overflow-hidden p-6">
          <div className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full opacity-60" style={{ background: def.soft }} />
          <div className="relative">
            <p className="eyebrow" style={{ color: def.ink }}>
              {def.label} pillar score
            </p>
            <div className="mt-1 flex items-center gap-2">
              <CompanyLogo company={selected.company} size={22} />
              <p className="text-[14px] font-semibold">{selected.company.name}</p>
            </div>
            <div className="mt-5 flex items-center gap-5">
              <ScoreRing score={data.score} color={def.color} size={112} stroke={9} />
              <div className="space-y-2">
                <Delta value={data.delta} />
                <p className="text-[13px] text-ink-2">
                  Rank <span className="font-bold text-ink">{rank}</span> of {comparison.companies.length}
                </p>
                <span className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-bold ${status(data.score).cls}`}>{status(data.score).label}</span>
              </div>
            </div>
            <p className="mt-5 text-[12.5px] leading-relaxed text-muted">
              {def.name} measures how well {selected.company.name} is set up to be found and chosen in {def.phrase}.
            </p>
          </div>
        </div>

        {/* Sub-metrics */}
        <div className="grid gap-3 sm:grid-cols-2">
          {data.subMetrics.map((m, i) => {
            const top = best(i);
            const s = status(m.score);
            return (
              <div key={m.key} className="card p-5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <p className="text-[13px] font-semibold">{m.label}</p>
                    <Tooltip text={def.metrics[i].description}>
                      <button className="text-faint hover:text-ink" aria-label={`About ${m.label}`}>
                        <Info className="size-3.5" />
                      </button>
                    </Tooltip>
                  </div>
                  <span className={`rounded-md px-1.5 py-0.5 text-[10.5px] font-bold ${s.cls}`}>{s.label}</span>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-[28px] font-extrabold tabular-nums tracking-tight">{m.score}</span>
                  <Delta value={m.delta} />
                </div>
                <div className="relative mt-3 h-2 rounded-full bg-canvas">
                  <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${m.score}%`, background: def.color }} />
                  <span className="absolute -top-1 -translate-x-1/2" style={{ left: `${top}%` }}>
                    <Tooltip text={`Best in set: ${top}`}>
                      <span className="block h-4 w-[3px] rounded bg-ink" tabIndex={0} aria-label={`Best in set: ${top}`} />
                    </Tooltip>
                  </span>
                </div>
                <p className="mt-2 text-[11.5px] text-muted">
                  {top === m.score ? "Best in this comparison" : `${top - m.score} pts behind the best in set`}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <div className="card p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-[16px] font-bold">{def.label} sub-metric comparison</h3>
              <p className="mt-0.5 text-[12.5px] text-muted">All companies, scored 0–100</p>
            </div>
            <ul className="flex flex-wrap gap-3">
              {comparison.companies.map((c, i) => (
                <li key={c.company.id} className="flex items-center gap-1.5 text-[11.5px] text-ink-2">
                  <span className="size-2 rounded-full" style={{ background: COMPANY_COLORS[i] }} />
                  {c.company.name}
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-4">
            <MetricBarChart pillar={pillar} companies={comparison.companies} />
          </div>
        </div>

        <div className="card p-5 sm:p-6">
          <h3 className="text-[16px] font-bold">Company ranking</h3>
          <p className="mt-0.5 text-[12.5px] text-muted">Select a company to see its evidence</p>
          <ul className="mt-4 space-y-2">
            {ranked.map((c, i) => {
              const active = c === selected;
              return (
                <li key={c.company.id}>
                  <button
                    onClick={() => onSelect(c.company.id)}
                    aria-pressed={active}
                    className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors ${active ? "border-accent-strong bg-accent-soft" : "border-line hover:border-line-strong hover:bg-canvas/60"}`}
                  >
                    <span className="w-4 text-center text-[12px] font-bold text-muted">{i + 1}</span>
                    <CompanyLogo company={c.company} size={30} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-semibold">
                        {c.company.name}
                        {c.company.id === comparison.subjectId && <span className="ml-1.5 rounded bg-accent px-1 text-[10px] font-bold text-white">You</span>}
                      </span>
                      <span className="mt-1 flex gap-1">
                        {c.pillars[pillar].subMetrics.map((m) => (
                          <Tooltip key={m.key} text={`${m.label}: ${m.score}`}>
                            <span className="block h-1.5 w-8 overflow-hidden rounded-full bg-canvas sm:w-10">
                              <span className="block h-full rounded-full" style={{ width: `${m.score}%`, background: def.color }} />
                            </span>
                          </Tooltip>
                        ))}
                      </span>
                    </span>
                    <span className="text-[18px] font-extrabold tabular-nums">{c.pillars[pillar].score}</span>
                    <Delta value={c.pillars[pillar].delta} className="hidden sm:inline-flex" />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <details className="card group/ev overflow-hidden">
        <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 p-5 transition-colors hover:bg-canvas/50 sm:px-6 [&::-webkit-details-marker]:hidden">
          <span className="flex flex-wrap items-center gap-2">
            <PillarBadge pillar={pillar} />
            <span className="text-[15px] font-bold">Evidence · {selected.company.name}</span>
            <span className="text-[12.5px] text-muted">
              {data.evidence.length} observation{data.evidence.length === 1 ? "" : "s"}
            </span>
          </span>
          <span className="flex items-center gap-1.5 text-[12.5px] font-semibold text-ink-2">
            <span className="group-open/ev:hidden">Show</span>
            <span className="hidden group-open/ev:inline">Hide</span>
            <ChevronDown className="size-4 transition-transform group-open/ev:rotate-180" />
          </span>
        </summary>
        <ul className="grid gap-2.5 border-t border-line p-4 sm:p-5 md:grid-cols-2">
          {data.evidence.map((e, i) => {
            const S = SENTIMENT[e.sentiment];
            const metric = data.subMetrics.find((m) => m.key === e.metricKey)?.label ?? def.metrics[i]?.label;
            return (
              <li key={e.id} className="flex gap-3 rounded-xl bg-canvas/70 p-3.5">
                <S.icon className={`mt-0.5 size-4 shrink-0 ${S.cls}`} />
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-muted">
                    {def.label}
                    {metric && ` · ${metric}`}
                  </p>
                  <p className="mt-1 text-[13px] leading-relaxed text-ink-2 [overflow-wrap:anywhere]">{e.text}</p>
                </div>
              </li>
            );
          })}
          {!data.evidence.length && <li className="py-4 text-center text-[13px] text-muted md:col-span-2">No evidence was recorded for {def.label}.</li>}
        </ul>
      </details>

      {pillar === "geo" && <AiVisibility comparison={comparison} />}
    </div>
  );
}
