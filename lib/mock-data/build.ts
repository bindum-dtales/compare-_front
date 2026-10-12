import { deriveInsights } from "../insights";
import { PILLARS, PILLAR_LIST } from "../pillars";
import type {
  Comparison,
  CompanyResearch,
  Impact,
  Insight,
  Pillar,
  PillarScore,
  Recommendation,
} from "../types";
import { COMPANY_SEEDS, CURATED_INSIGHTS, DEFAULT_CATEGORY, DEFAULT_UPDATED_AT, type CompanySeed } from "./companies";
import { AI_ENGINES, EVIDENCE, PROMPTS, RECOMMENDATIONS } from "./templates";

const clamp = (n: number) => Math.max(8, Math.min(99, Math.round(n)));

/** Small deterministic hash so generated companies look the same on every run. */
function hash(s: string) {
  let h = 2166136261;
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "");

export function findSeed(query: string) {
  const q = slug(query);
  return COMPANY_SEEDS.find((s) => slug(s.name) === q || s.id === q || slug(s.domain) === q || slug(s.name).startsWith(q));
}

/** Builds a plausible seed for a company we have no curated data for. */
function generateSeed(name: string): CompanySeed {
  const h = hash(name.toLowerCase());
  const base = 58 + (h % 22);
  const sub = (i: number): [number, number, number, number] =>
    [0, 1, 2, 3].map((j) => clamp(base + (((h >>> (i * 4 + j)) % 25) - 12))) as [number, number, number, number];
  const pillar = (i: number, lift: number): [number, [number, number, number, number]] => {
    const s = sub(i);
    return [clamp(s.reduce((a, b) => a + b, 0) / 4 + lift), s];
  };
  const palette = ["#111111", "#0F766E", "#B45309", "#1D4ED8", "#9D174D", "#4338CA"];
  const domain = `${slug(name) || "company"}.com`;
  return {
    id: `custom-${slug(name)}`,
    name: name.trim(),
    domain,
    category: "Technology company",
    logo: { mark: name.trim()[0]?.toUpperCase() ?? "?", bg: palette[h % palette.length], fg: "#FFFFFF" },
    scores: { seo: pillar(0, 4), aeo: pillar(1, 0), geo: pillar(2, -4) },
    deltas: { seo: (h % 7) - 2, aeo: ((h >>> 3) % 7) - 2, geo: ((h >>> 6) % 7) - 3 },
    hiddenAssets:
      h % 3 === 0
        ? []
        : [
            {
              url: `${domain}/about#team`,
              foundIn: "About page HTML",
              issue: "Team bios exist in raw markup but are collapsed behind a script that never renders them for visitors.",
              kind: "hidden-content",
              severity: "medium",
            },
          ],
    sources: [
      { title: `${name} — Official website`, domain, url: `https://${domain}`, type: "Company website", pillar: "seo" },
      { title: `${name} | LinkedIn`, domain: "linkedin.com", url: `https://www.linkedin.com/company/${slug(name)}`, type: "LinkedIn", pillar: "geo" },
      { title: `${name} reviews — G2`, domain: "g2.com", url: `https://www.g2.com/search?query=${encodeURIComponent(name)}`, type: "G2", pillar: "geo" },
      { title: `“${name}” — Google search results`, domain: "google.com", url: `https://www.google.com/search?q=${encodeURIComponent(name)}`, type: "Search result", pillar: "seo" },
    ],
  };
}

function toResearch(seed: CompanySeed): CompanyResearch {
  const h = hash(seed.id);
  const pillars = Object.fromEntries(
    PILLAR_LIST.map((def, pi): [Pillar, PillarScore] => {
      const [score, subs] = seed.scores[def.id];
      const subMetrics = def.metrics.map((m, i) => ({
        key: m.key,
        label: m.label,
        score: subs[i],
        delta: ((h >>> (pi * 4 + i)) % 9) - 3,
      }));
      return [
        def.id,
        {
          pillar: def.id,
          score,
          delta: seed.deltas[def.id],
          subMetrics,
          evidence: subMetrics.map((m) => {
            const band = m.score >= 85 ? 0 : m.score >= 70 ? 1 : 2;
            return {
              id: `${seed.id}-${m.key}`,
              pillar: def.id,
              metricKey: m.key,
              text: EVIDENCE[m.key][band],
              sentiment: (["positive", "neutral", "negative"] as const)[band],
            };
          }),
        },
      ];
    }),
  ) as Record<Pillar, PillarScore>;

  const geo = seed.scores.geo[0];
  return {
    company: { id: seed.id, name: seed.name, domain: seed.domain, category: seed.category, logo: seed.logo },
    pillars,
    aiVisibility: AI_ENGINES.map((e) => {
      const mentionRate = clamp(geo - 30 + e.offset + (seed.scores.geo[1][0] - 70) / 2);
      return { engine: e.engine, mentionRate, citations: Math.round(mentionRate * 1.7) };
    }),
    hiddenAssets: seed.hiddenAssets.map((a, i) => ({ ...a, id: `${seed.id}-ha-${i}`, companyId: seed.id })),
    hiddenAssetsChecked: true,
    sources: seed.sources.map((s, i) => ({ ...s, id: `${seed.id}-src-${i}`, companyId: seed.id })),
  };
}

function buildInsights(subject: CompanyResearch, rivals: CompanyResearch[]): Insight[] {
  const curated = CURATED_INSIGHTS[subject.company.id];
  if (curated) return curated.map((c, i) => ({ ...c, id: `ins-${i}` }));
  return deriveInsights(subject, rivals);
}

function buildRecommendations(subject: CompanyResearch, rivals: CompanyResearch[]): Recommendation[] {
  const recs: Recommendation[] = [];
  for (const def of PILLAR_LIST) {
    subject.pillars[def.id].subMetrics.forEach((m, i) => {
      const leader = rivals
        .map((r) => ({ name: r.company.name, score: r.pillars[def.id].subMetrics[i].score }))
        .sort((a, b) => b.score - a.score)[0];
      const gap = leader.score - m.score;
      if (gap <= 0) return;
      const t = RECOMMENDATIONS[m.key];
      const impact: Impact = gap >= 20 ? "high" : gap >= 10 ? "medium" : "low";
      recs.push({
        id: `rec-${m.key}`,
        impact,
        pillar: def.id,
        title: t.title,
        explanation: t.explanation.replace("{leader}", leader.name).replace("{gap}", String(gap)),
        metric: `${PILLARS[def.id].label} · ${m.label}`,
        current: m.score,
        target: m.score + Math.round(gap * 0.6),
        action: t.action,
      });
    });
  }
  const rank = { high: 0, medium: 1, low: 2 };
  return recs.sort((a, b) => rank[a.impact] - rank[b.impact] || b.target - b.current - (a.target - a.current));
}

/** Assembles a full comparison: subject first, then up to three library competitors. */
export function buildComparison(query: string): Comparison {
  const subjectSeed = findSeed(query) ?? generateSeed(query);
  const rivalSeeds = COMPANY_SEEDS.filter((s) => s.id !== subjectSeed.id && s.id !== "dtales").slice(0, 3);
  const companies = [subjectSeed, ...rivalSeeds].map(toResearch);
  const [subject, ...rivals] = companies;
  const isDefault = subjectSeed.id === "dtales";

  return {
    id: `cmp-${subjectSeed.id}`,
    subjectId: subjectSeed.id,
    category: DEFAULT_CATEGORY,
    updatedAt: isDefault ? DEFAULT_UPDATED_AT : new Date().toISOString().slice(0, 10),
    companies,
    insights: buildInsights(subject, rivals),
    recommendations: buildRecommendations(subject, rivals),
    promptChecks: PROMPTS.map((p) => ({
      prompt: p.prompt,
      engine: p.engine,
      mentioned: companies
        .filter((c) => c.pillars.geo.score + p.offset > 75)
        .sort((a, b) => b.pillars.geo.score - a.pillars.geo.score)
        .map((c) => c.company.id),
    })),
  };
}
