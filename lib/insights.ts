// Key insights for a comparison, derived from the scores alone: each pillar against the strongest
// competitor (by name, exact scores: nothing averaged or rounded), the strongest signal, and hidden
// assets. Used for researched and demo comparisons alike.
import { PILLAR_LIST } from "./pillars";
import type { CompanyResearch, Insight } from "./types";

/** 77.5 → "77.5", 80 → "80", 6.333 → "6.33"; also removes float noise from differences. */
const fmt = (n: number) => String(Math.round(n * 100) / 100);

export function deriveInsights(subject: CompanyResearch, rivals: CompanyResearch[]): Insight[] {
  const name = subject.company.name;
  // Without scored competitors there is nothing to compare against.
  const insights: Insight[] = rivals.length
    ? PILLAR_LIST.map((def): Insight => {
        const own = subject.pillars[def.id].score;
        const top = rivals.reduce((best, r) => (r.pillars[def.id].score > best.pillars[def.id].score ? r : best));
        const theirs = top.pillars[def.id].score;
        const diff = own - theirs;
        const where = def.phrase;
        const id = `ins-${def.id}`;
        const versus = rivals.length === 1 ? top.company.name : `the strongest competitor, ${top.company.name}`;
        if (diff > 0) return { id, pillar: def.id, trend: "up", title: `Ahead of competitors in ${where}`, detail: `${name} scores ${fmt(own)} on ${def.label}, ${fmt(diff)} points above ${versus} (${fmt(theirs)}).` };
        if (diff === 0) return { id, pillar: def.id, trend: "flat", title: `Level with competitors in ${where}`, detail: `${name} and ${top.company.name} both score ${fmt(own)} on ${def.label}.` };
        if (diff > -8) return { id, pillar: def.id, trend: "flat", title: `Competitive in ${where}`, detail: `${def.label} score of ${fmt(own)} sits ${fmt(-diff)} points below ${versus} (${fmt(theirs)}).` };
        return { id, pillar: def.id, trend: "down", title: `Trailing competitors in ${where}`, detail: `${def.label} score of ${fmt(own)} is ${fmt(-diff)} points behind ${versus} (${fmt(theirs)}).` };
      })
    : [];
  const best = PILLAR_LIST.flatMap((d) => subject.pillars[d.id].subMetrics.map((m) => ({ ...m, pillar: d.id }))).sort((a, b) => b.score - a.score)[0];
  if (best) insights.push({ id: "ins-best", pillar: best.pillar, trend: "up", title: `Strongest signal: ${best.label}`, detail: `${best.label} scores ${fmt(best.score)}, the highest of all twelve measured signals.` });
  if (subject.hiddenAssets.length)
    insights.push({ id: "ins-hidden", pillar: "aeo", trend: "up", title: "Undiscovered content opportunities", detail: subject.hiddenAssets.length === 1 ? "One page is visible to crawlers but not to visitors." : `${subject.hiddenAssets.length} pages are visible to crawlers but not to visitors.` });
  return insights;
}
