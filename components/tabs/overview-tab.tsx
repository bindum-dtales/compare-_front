"use client";

import { Fragment } from "react";
import { CompanyLogo } from "@/components/ui/company-logo";
import { ScoreBar } from "@/components/ui/score-figure";
import { COMPANY_COLORS, PILLAR_LIST } from "@/lib/pillars";
import { formatScore } from "@/lib/research/scoreboard";
import type { Comparison } from "@/lib/types";

/** Every sub-metric for every company, as scored. The highest score on each row is marked. */
export function OverviewTab({ comparison }: { comparison: Comparison }) {
  const { companies } = comparison;
  const color = (i: number) => COMPANY_COLORS[i % COMPANY_COLORS.length]!;

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-end justify-between gap-2 px-5 pb-4 pt-5 sm:px-6">
        <div>
          <h3 className="text-[16px] font-bold">All signals</h3>
          <p className="mt-0.5 text-[12.5px] text-muted">The four sub-metrics behind each pillar score, 0–100. The best score on each row is in bold.</p>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className={`w-full table-fixed border-collapse text-left ${companies.length > 2 ? "min-w-[640px]" : ""}`}>
          <thead>
            <tr className="border-y border-line bg-canvas/60">
              <th scope="col" className="w-[30%] px-4 sm:w-[26%] sm:px-6 py-2.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
                Signal
              </th>
              {companies.map((c, i) => (
                <th key={c.company.id} scope="col" className="px-3 py-2.5 text-[12.5px] font-semibold sm:px-4">
                  <span className="flex items-center gap-2">
                    <CompanyLogo company={c.company} size={20} />
                    <span className="min-w-0 [overflow-wrap:anywhere]">{c.company.name}</span>
                    <span className="size-1.5 shrink-0 rounded-full" style={{ background: color(i) }} aria-hidden />
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PILLAR_LIST.map((p) => (
              <Fragment key={p.id}>
                <tr>
                  <th colSpan={companies.length + 1} scope="colgroup" className="px-5 pb-1.5 pt-4 text-left sm:px-6">
                    <span className="text-[12.5px] font-extrabold" style={{ color: p.ink }}>
                      {p.label}
                    </span>
                    <span className="ml-2 text-[12px] font-medium text-muted">{p.visibility}</span>
                  </th>
                </tr>
                {companies[0]!.pillars[p.id].subMetrics.map((m) => {
                  const scores = companies.map((c) => c.pillars[p.id].subMetrics.find((x) => x.key === m.key)?.score ?? null);
                  const real = scores.filter((s): s is number => s !== null);
                  const best = real.length > 1 && new Set(real).size > 1 ? Math.max(...real) : null;
                  return (
                    <tr key={m.key} className="border-b border-line/70 last:border-0 hover:bg-canvas/40">
                      <th scope="row" className="px-4 py-3 text-[13px] font-medium text-ink-2 sm:px-6">
                        {m.label}
                      </th>
                      {scores.map((s, i) => (
                        <td key={companies[i]!.company.id} className="px-3 py-3 sm:px-4">
                          {s === null ? (
                            <span className="text-[12px] text-faint">Not scored</span>
                          ) : (
                            <div className="flex items-center gap-3">
                              <span className={`w-8 shrink-0 text-right text-[14px] tabular-nums ${s === best ? "font-extrabold text-ink" : "font-medium text-ink-2"}`}>{formatScore(s)}</span>
                              <ScoreBar score={s} color={color(i)} className="h-1.5 max-w-[160px] flex-1" />
                            </div>
                          )}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
