import type { Pillar } from "./types";

export interface MetricDef {
  key: string;
  label: string;
  description: string;
}

export interface PillarDef {
  id: Pillar;
  label: string;
  name: string;
  engines: string;
  /** What the pillar measures, as a subtitle. */
  visibility: string;
  /** Lower-case form for use mid-sentence. */
  phrase: string;
  color: string;
  /** Darker tone for text on the soft background. */
  ink: string;
  soft: string;
  metrics: MetricDef[];
}

export const PILLARS: Record<Pillar, PillarDef> = {
  seo: {
    id: "seo",
    label: "SEO",
    name: "Search Engine Optimization",
    engines: "Search engines",
    visibility: "Search engine visibility",
    phrase: "search engines",
    color: "#2F6BFF",
    ink: "#1F4FD1",
    soft: "#EAF0FF",
    metrics: [
      { key: "technical", label: "Technical", description: "Speed, Core Web Vitals, indexability and site architecture." },
      { key: "content", label: "Content", description: "Depth and coverage of topics your buyers search for." },
      { key: "backlinks", label: "Backlinks", description: "Quality and breadth of referring domains." },
      { key: "ranking", label: "Ranking", description: "Positions held for branded and non-branded keywords." },
    ],
  },
  aeo: {
    id: "aeo",
    label: "AEO",
    name: "Answer Engine Optimization",
    engines: "Answer engines",
    visibility: "Answer engine visibility",
    phrase: "answer engines",
    color: "#0891B2",
    ink: "#0E7490",
    soft: "#E6F7FB",
    metrics: [
      { key: "structured", label: "Structured", description: "FAQ, HowTo, Organization and Product schema coverage." },
      { key: "directAnswer", label: "Direct Answer", description: "Pages that answer the question in the first lines." },
      { key: "snippet", label: "Snippet", description: "Featured snippet and People Also Ask presence." },
      { key: "crawlability", label: "Crawlability", description: "Answer content reachable without JavaScript or clicks." },
    ],
  },
  geo: {
    id: "geo",
    label: "GEO",
    name: "Generative Engine Optimization",
    engines: "Generative AI",
    visibility: "Generative AI visibility",
    phrase: "generative AI",
    color: "#7C4DFF",
    ink: "#5B2EE0",
    soft: "#F1EBFF",
    metrics: [
      { key: "thirdParty", label: "3rd-party Presence", description: "Mentions on review sites, forums and roundups AI engines cite." },
      { key: "brandScale", label: "Brand Scale", description: "Branded search demand and overall brand footprint." },
      { key: "freshness", label: "Freshness", description: "How recently key pages were updated." },
      { key: "clarity", label: "Brand Clarity", description: "Consistency of how the brand is described across the web." },
    ],
  },
};

export const PILLAR_LIST = [PILLARS.seo, PILLARS.aeo, PILLARS.geo];

/** Series colours for companies, by position in the comparison (subject first). */
export const COMPANY_COLORS = ["#2F6BFF", "#1E293B", "#7C4DFF", "#8E8E93"];
