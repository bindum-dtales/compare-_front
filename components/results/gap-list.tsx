"use client";

import { PillarBadge } from "@/components/ui/pillar-badge";
import { ScoreBar } from "@/components/ui/score-figure";
import { COMPANY_COLORS } from "@/lib/pillars";
import { formatScore, largestGaps } from "@/lib/research/scoreboard";
import type { CompanyResearch } from "@/lib/types";
import { useShown } from "./scoreboard";

const SHOWN = 4;

/** The sub-metrics where two companies differ most, from their real sub-metric scores. */
export function GapList({ a, b, id }: { a: CompanyResearch; b: CompanyResearch; id: string }) {
  const gaps = largestGaps(a, b, SHOWN);
  const shown = useShown(id);
  if (!gaps.length) return null;
  const pair = [a, b] as const;

  return (
    <section className="card p-5 sm:p-7" aria-labelledby="gaps-title">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Biggest gaps</p>
          <h2 id="gaps-title" className="mt-1.5 text-[20px] font-extrabold tracking-[-0.025em] sm:text-[22px]">
            Where the gap is largest
          </h2>
        </div>
        <p className="text-[12.5px] text-muted sm:text-right">Sub-metric scores, largest difference first</p>
      </div>

      <ol className="mt-5 grid gap-3 md:grid-cols-2">
        {gaps.map((g, i) => {
          const leader = pair[g.leader].company;
          return (
            <li key={`${g.pillar}-${g.key}`} className="animate-rise rounded-[14px] border border-line bg-canvas/40 p-4 transition-colors hover:border-line-strong hover:bg-surface sm:p-5" style={{ animationDelay: `${i * 60}ms` }}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-ink text-[11px] font-bold text-white" aria-hidden>
                    {i + 1}
                  </span>
                  <span className="min-w-0 text-[15px] font-bold [overflow-wrap:anywhere]">{g.label}</span>
                  <PillarBadge pillar={g.pillar} />
                </div>
                <span className="shrink-0 text-right">
                  <span className="block text-[18px] font-extrabold leading-none tabular-nums tracking-[-0.02em]">+{formatScore(g.gap)}</span>
                  <span className="mt-1 block max-w-[9rem] text-[11.5px] font-semibold text-muted [overflow-wrap:anywhere]">{leader.name}</span>
                </span>
              </div>
              <dl className="mt-4 space-y-2.5">
                {pair.map((c, side) => {
                  const score = side === 0 ? g.a : g.b;
                  return (
                    <div key={c.company.id} className="grid grid-cols-[minmax(0,7.5rem)_minmax(0,1fr)_2.5rem] items-center gap-3">
                      <dt className={`flex min-w-0 items-center gap-1.5 text-[12.5px] ${g.leader === side ? "font-bold text-ink" : "text-ink-2"}`}>
                        <span className="size-2 shrink-0 rounded-full" style={{ background: COMPANY_COLORS[side] }} aria-hidden />
                        <span className="min-w-0 [overflow-wrap:anywhere]">{c.company.name}</span>
                      </dt>
                      <ScoreBar score={score} color={COMPANY_COLORS[side]!} shown={shown} />
                      <dd className={`text-right text-[14px] tabular-nums ${g.leader === side ? "font-extrabold" : "font-semibold text-muted"}`}>{formatScore(score)}</dd>
                    </div>
                  );
                })}
              </dl>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
