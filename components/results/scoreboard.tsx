"use client";

import { useEffect, useState } from "react";
import { Equal, Trophy } from "lucide-react";
import { ScoreBar, ScoreFigure } from "@/components/ui/score-figure";
import { COMPANY_COLORS, PILLARS } from "@/lib/pillars";
import { formatScore, pillarStandings, pillarWins, type PillarStanding } from "@/lib/research/scoreboard";
import type { Comparison } from "@/lib/types";

/** Bars grow in from zero once mounted (and whenever the comparison changes). */
export function useShown(key: string) {
  const [shown, setShown] = useState<string | null>(null);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(key));
    return () => cancelAnimationFrame(id);
  }, [key]);
  return shown === key;
}

const color = (i: number) => COMPANY_COLORS[i % COMPANY_COLORS.length];

/** "Wix leads by 7.5" / "Tie": in words and an icon, never by colour alone. */
function Verdict({ standing }: { standing: PillarStanding }) {
  const { leader, margin, scores } = standing;
  if (scores.length < 2) return null;
  if (leader === null)
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-canvas px-2.5 py-1 text-[12px] font-bold text-ink-2">
        <Equal className="size-3.5" strokeWidth={2.5} aria-hidden /> Tie
      </span>
    );
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5 rounded-full bg-ink px-2.5 py-1 text-[12px] font-bold text-white">
      <Trophy className="size-3.5 shrink-0 text-accent" strokeWidth={2.2} aria-hidden />
      <span className="min-w-0 [overflow-wrap:anywhere]">
        {scores[leader]!.company.name} leads by {formatScore(margin!)}
      </span>
    </span>
  );
}

function PillarCard({ standing, shown, index }: { standing: PillarStanding; shown: boolean; index: number }) {
  const def = PILLARS[standing.pillar];
  const { scores, leader } = standing;
  const pair = scores.length === 2;

  return (
    <article className="card flex animate-rise flex-col overflow-hidden" style={{ animationDelay: `${80 + index * 70}ms` }} aria-labelledby={`pillar-${def.id}-title`}>
      <div className="h-1" style={{ background: def.color }} aria-hidden />
      <div className="flex flex-1 flex-col p-5 sm:p-6 md:p-5 xl:p-6">
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
          <div>
            <h3 id={`pillar-${def.id}-title`} className="text-[20px] font-extrabold leading-none tracking-[-0.02em]" style={{ color: def.ink }}>
              {def.label}
            </h3>
            <p className="mt-1.5 text-[12.5px] text-muted">{def.visibility}</p>
          </div>
          <Verdict standing={standing} />
        </div>

        {pair ? (
          <>
            <div className="mt-6 grid grid-cols-2 gap-4">
              {scores.map((s, i) => (
                <div key={s.company.id} className={`min-w-0 ${i === 1 ? "text-right" : ""}`}>
                  <p className={`flex min-w-0 items-center gap-1.5 text-[12.5px] font-semibold text-ink-2 ${i === 1 ? "flex-row-reverse" : ""}`}>
                    <span className="size-2 shrink-0 rounded-full" style={{ background: color(i) }} aria-hidden />
                    <span className="min-w-0 [overflow-wrap:anywhere]">{s.company.name}</span>
                  </p>
                  <ScoreFigure value={s.score} muted={leader !== null && leader !== i} className="mt-2 text-[44px] sm:text-[52px] md:text-[38px] xl:text-[52px]" />
                </div>
              ))}
            </div>
            <div className="mt-5 space-y-2">
              {scores.map((s, i) => (
                <ScoreBar key={s.company.id} score={s.score} color={color(i)} shown={shown} className="h-2.5" />
              ))}
            </div>
          </>
        ) : (
          <ul className="mt-5 space-y-3.5">
            {scores.map((s, i) => (
              <li key={s.company.id}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className={`flex min-w-0 items-center gap-1.5 text-[13px] ${leader === i ? "font-bold text-ink" : "font-medium text-ink-2"}`}>
                    <span className="size-2 shrink-0 rounded-full" style={{ background: color(i) }} aria-hidden />
                    <span className="min-w-0 [overflow-wrap:anywhere]">{s.company.name}</span>
                    {leader === i && <span className="rounded bg-accent px-1 text-[10px] font-bold text-white">Leads</span>}
                  </span>
                  <ScoreFigure value={s.score} muted={leader !== null && leader !== i} className="text-[22px]" />
                </div>
                <ScoreBar score={s.score} color={color(i)} shown={shown} className="mt-1.5 h-2" />
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  );
}

/** The three pillar scores side by side: who leads each, and by how much. The backend has no overall score, so none is shown. */
export function Scoreboard({ comparison }: { comparison: Comparison }) {
  const { companies } = comparison;
  const standings = pillarStandings(companies);
  const wins = pillarWins(standings, companies.length);
  const most = Math.max(...wins);
  const top = wins.filter((w) => w === most).length === 1 ? wins.indexOf(most) : null;
  const shown = useShown(comparison.id);

  const headline =
    companies.length < 2
      ? `${companies[0]!.company.name} across SEO, AEO and GEO`
      : top !== null && most > 0
        ? `${companies[top]!.company.name} leads ${most} of 3 pillars`
        : "No single company leads overall";

  return (
    <section aria-labelledby="scoreboard-title" className="space-y-4">
      <div className="flex flex-col gap-3 px-1 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="eyebrow">Scoreboard</p>
          <h2 id="scoreboard-title" className="mt-1.5 text-[24px] font-extrabold leading-tight tracking-[-0.03em] sm:text-[28px]">
            {headline}
          </h2>
          <p className="mt-1 text-[13px] text-muted">Each pillar is scored 0–100 on its own; DTales doesn&apos;t combine them into one overall score.</p>
        </div>
        {companies.length > 1 && (
          <ul className="flex flex-wrap gap-2" aria-label="Pillar leaders">
            {standings.map((s) => {
              const def = PILLARS[s.pillar];
              return (
                <li key={s.pillar} className="flex items-center gap-2 rounded-full border border-line bg-surface py-1 pl-2.5 pr-3 text-[12.5px] shadow-card">
                  <span className="font-extrabold" style={{ color: def.ink }}>
                    {def.label}
                  </span>
                  <span className="text-faint" aria-hidden>
                    ·
                  </span>
                  <span className="font-semibold">{s.leader === null ? "Tie" : s.scores[s.leader]!.company.name}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {standings.map((s, i) => (
          <PillarCard key={s.pillar} standing={s} shown={shown} index={i} />
        ))}
      </div>
    </section>
  );
}
