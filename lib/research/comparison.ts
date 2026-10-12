// A researched company (and the competitors researched with it) → the Comparison the dashboard renders.
//
// Only real backend data is used. Things the backend doesn't measure stay empty rather than being
// filled in: AI visibility and prompt checks ([]), deltas (0 until runs are kept). Insights are
// derived from the real scores (lib/insights.ts).

import { getCompanyComparison } from "../api/research";
import type { ApiCompanyResearch } from "../api/types";
import { deriveInsights } from "../insights";
import type { Comparison, CompanyResearch, Pillar, PillarScore, Recommendation, Source, SourceType } from "../types";

const PILLARS: Pillar[] = ["seo", "aeo", "geo"];
const SOURCE_TYPES: SourceType[] = ["Company website", "LinkedIn", "G2", "Clutch", "Search result", "Industry publication", "AI answer"];

export class IncompleteResultError extends Error {
  constructor() {
    super("The research finished, but its scores are incomplete. Please run the research again.");
    this.name = "IncompleteResultError";
  }
}

/** API company → UI company; null when it hasn't been fully scored (the UI needs every score). */
export function toCompanyResearch(api: ApiCompanyResearch): CompanyResearch | null {
  const pillars = {} as Record<Pillar, PillarScore>;
  for (const p of PILLARS) {
    const data = api.pillars[p];
    if (data.score === null || data.subMetrics.some((m) => m.score === null)) return null;
    pillars[p] = {
      pillar: p,
      score: data.score,
      delta: data.delta,
      subMetrics: data.subMetrics.map((m) => ({ key: m.key, label: m.label, score: m.score!, delta: m.delta })),
      evidence: data.evidence,
    };
  }
  return {
    company: { id: api.company.id, name: api.company.name, domain: api.company.domain, category: api.company.category, logo: api.company.logo },
    pillars,
    aiVisibility: api.aiVisibility,
    hiddenAssets: api.hiddenAssets,
    hiddenAssetsChecked: api.hiddenAssetsChecked,
    sources: api.sources.map((s): Source => ({ ...s, type: SOURCE_TYPES.includes(s.type as SourceType) ? (s.type as SourceType) : "Search result" })),
  };
}

/** Subject first, then its researched competitors in the order the research selected them. */
export function buildComparison(subject: ApiCompanyResearch, researched: ApiCompanyResearch[]): Comparison {
  const own = toCompanyResearch(subject);
  if (!own) throw new IncompleteResultError();
  const byDomain = new Map(researched.map((c) => [c.company.domain, c]));
  const rivals = subject.competitors
    .map((c) => byDomain.get(c.domain))
    .filter((c): c is ApiCompanyResearch => !!c && c.company.id !== subject.company.id)
    .map(toCompanyResearch)
    .filter((c): c is CompanyResearch => !!c);

  return {
    id: `cmp-${subject.company.id}`,
    subjectId: subject.company.id,
    category: subject.company.category,
    updatedAt: (subject.company.researchedAt ?? new Date().toISOString()).slice(0, 10),
    companies: [own, ...rivals],
    insights: deriveInsights(own, rivals),
    recommendations: toRecommendations(subject),
    promptChecks: [],
    landscape: [toLandscape(subject)],
  };
}

const toLandscape = (api: ApiCompanyResearch) => ({ companyId: api.company.id, competitors: api.competitors.map(({ name, domain }) => ({ name, domain })) });

const toRecommendations = (subject: ApiCompanyResearch) =>
  subject.recommendations.map((r): Recommendation => ({
    id: r.id,
    impact: r.impact,
    pillar: r.pillar,
    title: r.title,
    explanation: r.explanation,
    metric: r.metric,
    current: r.current,
    target: r.target,
    action: r.action,
  }));

const HEAD_TO_HEAD = "h2h-";

/** A comparison the user picked as "company A vs company B" (rather than a company with its found competitors). */
export const isHeadToHead = (c: Pick<Comparison, "id">) => c.id.startsWith(HEAD_TO_HEAD);

/**
 * Two companies the user chose, each with its own research: A is the subject (its recommendations
 * are shown), B the one rival. Both must be fully scored.
 */
export function buildHeadToHead(a: ApiCompanyResearch, b: ApiCompanyResearch): Comparison {
  const own = toCompanyResearch(a);
  const rival = toCompanyResearch(b);
  if (!own || !rival) throw new IncompleteResultError();
  const categories = [...new Set([a.company.category, b.company.category])];
  // The older of the two results is how fresh the comparison is.
  const dates = [a.company.researchedAt, b.company.researchedAt].filter((d): d is string => !!d).sort();
  return {
    id: `${HEAD_TO_HEAD}${a.company.id}--${b.company.id}`,
    subjectId: a.company.id,
    category: categories.join(" · "),
    updatedAt: (dates[0] ?? new Date().toISOString()).slice(0, 10),
    companies: [own, rival],
    insights: deriveInsights(own, [rival]),
    recommendations: toRecommendations(a),
    promptChecks: [],
    landscape: [toLandscape(a), toLandscape(b)],
  };
}

/**
 * Loads a researched company and its competitors from the backend and builds the comparison. Each
 * competitor is its own research, or the scores produced for this comparison; competitors that
 * couldn't be scored are left out.
 */
export async function loadComparison(companyId: string, opts: { signal?: AbortSignal } = {}): Promise<Comparison> {
  const { subject, competitors } = await getCompanyComparison(companyId, { signal: opts.signal });
  return buildComparison(subject, competitors.flatMap((c) => (c.result ? [c.result] : [])));
}
