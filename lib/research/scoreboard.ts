// What the results page reads off a comparison: per-pillar leaders and margins, and the sub-metrics
// where two companies differ most. Only compares the backend's own scores; nothing is averaged,
// rounded into the data or made up. Framework-free so it can be tested.

import { PILLAR_LIST } from "../pillars";
import type { CompanyResearch, Pillar } from "../types";

/** Rounds away float noise from a subtraction (84.75 - 81.75) without hiding real decimals. */
const clean = (n: number) => Math.round(n * 100) / 100;

/** A backend score as text, exactly (77.5 → "77.5", 85 → "85"). */
export const formatScore = (n: number) => String(clean(n));

/** "84.75" → { whole: "84", fraction: ".75" }; "85" → { whole: "85", fraction: "" }. For display hierarchy only. */
export function splitScore(n: number): { whole: string; fraction: string } {
  const [whole, fraction] = formatScore(n).split(".");
  return { whole: whole!, fraction: fraction ? `.${fraction}` : "" };
}

/** The absolute difference between two scores, as shown ("7.5", "3"). */
export const formatGap = (a: number, b: number) => formatScore(Math.abs(a - b));

export interface PillarStanding {
  pillar: Pillar;
  /** Every company's score for the pillar, in comparison order. */
  scores: { company: CompanyResearch["company"]; score: number }[];
  /** Index (in `scores`) of the single highest score; null when the top score is shared, or with one company. */
  leader: number | null;
  /** Leader's score minus the next best; null without a leader. */
  margin: number | null;
}

export function pillarStandings(companies: CompanyResearch[]): PillarStanding[] {
  return PILLAR_LIST.map(({ id }) => {
    const scores = companies.map((c) => ({ company: c.company, score: c.pillars[id].score }));
    const sorted = [...scores].sort((x, y) => y.score - x.score);
    const unique = scores.length > 1 && sorted[0]!.score !== sorted[1]!.score;
    return {
      pillar: id,
      scores,
      leader: unique ? scores.indexOf(sorted[0]!) : null,
      margin: unique ? clean(sorted[0]!.score - sorted[1]!.score) : null,
    };
  });
}

/** How many pillars each company leads (index-aligned with the comparison's companies). */
export const pillarWins = (standings: PillarStanding[], companies: number) =>
  Array.from({ length: companies }, (_, i) => standings.filter((s) => s.leader === i).length);

export interface MetricGap {
  pillar: Pillar;
  key: string;
  label: string;
  a: number;
  b: number;
  /** |a − b|. */
  gap: number;
  /** 0 when A is higher, 1 when B is. */
  leader: 0 | 1;
}

/** Sub-metrics both companies were scored on, largest difference first; equal scores are left out. */
export function largestGaps(a: CompanyResearch, b: CompanyResearch, limit: number): MetricGap[] {
  return PILLAR_LIST.flatMap(({ id }) =>
    a.pillars[id].subMetrics.flatMap((m) => {
      const other = b.pillars[id].subMetrics.find((x) => x.key === m.key);
      return other && other.score !== m.score
        ? [{ pillar: id, key: m.key, label: m.label, a: m.score, b: other.score, gap: clean(Math.abs(m.score - other.score)), leader: (m.score > other.score ? 0 : 1) as 0 | 1 }]
        : [];
    }),
  )
    .sort((x, y) => y.gap - x.gap)
    .slice(0, limit);
}
