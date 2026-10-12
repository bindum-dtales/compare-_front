import type { Company, HiddenAsset, Pillar, Source } from "../types";

export interface CompanySeed extends Company {
  /** Pillar score and its four sub-metric scores, in PILLARS metric order. */
  scores: Record<Pillar, [number, [number, number, number, number]]>;
  deltas: Record<Pillar, number>;
  hiddenAssets: Omit<HiddenAsset, "id" | "companyId">[];
  sources: Omit<Source, "id" | "companyId">[];
}

export const DEFAULT_CATEGORY = "Technology & Digital Agency";
export const DEFAULT_UPDATED_AT = "2026-09-28";

export const COMPANY_SEEDS: CompanySeed[] = [
  {
    id: "dtales",
    name: "DTales Tech",
    domain: "dtales.tech",
    category: "Digital agency",
    logo: { mark: "D", bg: "#111111", fg: "#FFFFFF" },
    scores: {
      seo: [78, [84, 76, 64, 81]],
      aeo: [72, [70, 66, 61, 88]],
      geo: [68, [58, 54, 82, 78]],
    },
    deltas: { seo: 3, aeo: 5, geo: -2 },
    hiddenAssets: [
      {
        url: "dtales.tech/#testimonials-acme",
        foundIn: "Homepage HTML",
        issue: "A client testimonial exists in the raw markup but is hidden with display:none, so visitors never see it while crawlers do.",
        kind: "hidden-content",
        severity: "high",
      },
      {
        url: "staging.dtales.tech/services/seo-audit",
        foundIn: "Footer links · sitemap.xml",
        issue: "A staging subdomain is linked from production and indexable, duplicating the live SEO audit service page.",
        kind: "staging-leak",
        severity: "high",
      },
      {
        url: "dtales.tech/case-studies/fintech-dashboard",
        foundIn: "sitemap.xml",
        issue: "An indexed case study with no internal links. Visitors can't reach it from navigation or related work.",
        kind: "orphan-page",
        severity: "medium",
      },
      {
        url: "dtales.tech/blog/aeo-checklist",
        foundIn: "Blog index HTML",
        issue: "Linked from the blog index but carries a noindex tag, so search engines drop a page you promote.",
        kind: "noindex-conflict",
        severity: "medium",
      },
    ],
    sources: [
      { title: "DTales Tech — Digital product & growth studio", domain: "dtales.tech", url: "https://dtales.tech", type: "Company website", pillar: "seo" },
      { title: "Services: SEO, AEO & AI visibility", domain: "dtales.tech", url: "https://dtales.tech/services", type: "Company website", pillar: "aeo" },
      { title: "DTales Tech | LinkedIn", domain: "linkedin.com", url: "https://www.linkedin.com/company/dtales", type: "LinkedIn", pillar: "geo" },
      { title: "DTales Tech reviews — Clutch", domain: "clutch.co", url: "https://clutch.co/profile/dtales-tech", type: "Clutch", pillar: "geo" },
      { title: "“web design agency for SaaS” — Google, position 7", domain: "google.com", url: "https://www.google.com/search?q=web+design+agency+for+saas", type: "Search result", pillar: "seo" },
    ],
  },
  {
    id: "webflow",
    name: "Webflow",
    domain: "webflow.com",
    category: "Website builder",
    logo: { mark: "W", bg: "#4353FF", fg: "#FFFFFF" },
    scores: {
      seo: [92, [94, 93, 95, 90]],
      aeo: [85, [88, 84, 80, 90]],
      geo: [80, [84, 90, 72, 76]],
    },
    deltas: { seo: 1, aeo: 2, geo: 4 },
    hiddenAssets: [
      {
        url: "webflow.com/legacy/pricing-2023",
        foundIn: "sitemap.xml",
        issue: "An outdated pricing page is still indexed with no internal links, competing with the current pricing page.",
        kind: "orphan-page",
        severity: "low",
      },
    ],
    sources: [
      { title: "Webflow: Create a custom website", domain: "webflow.com", url: "https://webflow.com", type: "Company website", pillar: "seo" },
      { title: "Webflow reviews 2026 — G2", domain: "g2.com", url: "https://www.g2.com/products/webflow/reviews", type: "G2", pillar: "geo" },
      { title: "The best website builders for marketing teams", domain: "theverge.com", url: "https://www.theverge.com", type: "Industry publication", pillar: "geo" },
      { title: "Perplexity: “best no-code website builder”", domain: "perplexity.ai", url: "https://www.perplexity.ai", type: "AI answer", pillar: "geo" },
    ],
  },
  {
    id: "notion",
    name: "Notion",
    domain: "notion.so",
    category: "Productivity software",
    logo: { mark: "N", bg: "#FFFFFF", fg: "#111111" },
    scores: {
      seo: [88, [86, 92, 91, 85]],
      aeo: [82, [80, 86, 78, 84]],
      geo: [76, [82, 88, 64, 72]],
    },
    deltas: { seo: 0, aeo: 3, geo: 1 },
    hiddenAssets: [],
    sources: [
      { title: "Notion — The all-in-one workspace", domain: "notion.so", url: "https://www.notion.so", type: "Company website", pillar: "seo" },
      { title: "Notion Help Center: Templates", domain: "notion.so", url: "https://www.notion.so/help", type: "Company website", pillar: "aeo" },
      { title: "Notion | LinkedIn", domain: "linkedin.com", url: "https://www.linkedin.com/company/notionhq", type: "LinkedIn", pillar: "geo" },
      { title: "Notion reviews 2026 — G2", domain: "g2.com", url: "https://www.g2.com/products/notion/reviews", type: "G2", pillar: "geo" },
    ],
  },
  {
    id: "vercel",
    name: "Vercel",
    domain: "vercel.com",
    category: "Developer platform",
    logo: { mark: "▲", bg: "#000000", fg: "#FFFFFF" },
    scores: {
      seo: [90, [97, 88, 92, 85]],
      aeo: [78, [84, 74, 70, 86]],
      geo: [74, [78, 80, 76, 62]],
    },
    deltas: { seo: 2, aeo: -1, geo: 3 },
    hiddenAssets: [
      {
        url: "vercel.com/templates/next-commerce",
        foundIn: "Template page HTML",
        issue: "Tabbed feature panels are present in markup but render empty until a tab is clicked, so visitors skim past them.",
        kind: "hidden-content",
        severity: "low",
      },
    ],
    sources: [
      { title: "Vercel: Build and deploy the best web experiences", domain: "vercel.com", url: "https://vercel.com", type: "Company website", pillar: "seo" },
      { title: "Vercel Docs — Deployments overview", domain: "vercel.com", url: "https://vercel.com/docs", type: "Company website", pillar: "aeo" },
      { title: "Vercel reviews 2026 — G2", domain: "g2.com", url: "https://www.g2.com/products/vercel/reviews", type: "G2", pillar: "geo" },
      { title: "“Next.js hosting” — Google, position 1", domain: "google.com", url: "https://www.google.com/search?q=next.js+hosting", type: "Search result", pillar: "seo" },
    ],
  },
  {
    id: "hubspot",
    name: "HubSpot",
    domain: "hubspot.com",
    category: "CRM & marketing software",
    logo: { mark: "H", bg: "#FF7A59", fg: "#FFFFFF" },
    scores: {
      seo: [94, [93, 95, 97, 92]],
      aeo: [88, [92, 88, 86, 86]],
      geo: [83, [86, 94, 80, 74]],
    },
    deltas: { seo: 1, aeo: 1, geo: 2 },
    hiddenAssets: [
      {
        url: "offers.hubspot.com/thank-you/seo-guide",
        foundIn: "sitemap.xml",
        issue: "A gated-content thank-you page is indexed, exposing the download without the form.",
        kind: "noindex-conflict",
        severity: "medium",
      },
    ],
    sources: [
      { title: "HubSpot | Software & tools for your business", domain: "hubspot.com", url: "https://www.hubspot.com", type: "Company website", pillar: "seo" },
      { title: "HubSpot Blog — Marketing", domain: "blog.hubspot.com", url: "https://blog.hubspot.com/marketing", type: "Company website", pillar: "aeo" },
      { title: "HubSpot reviews 2026 — G2", domain: "g2.com", url: "https://www.g2.com/products/hubspot-marketing-hub/reviews", type: "G2", pillar: "geo" },
      { title: "The CRM market in 2026", domain: "forbes.com", url: "https://www.forbes.com", type: "Industry publication", pillar: "geo" },
    ],
  },
];

/** Hand-written insights for the default demo subject. Others are generated. */
export const CURATED_INSIGHTS: Record<string, { pillar: Pillar; trend: "up" | "flat" | "down"; title: string; detail: string }[]> = {
  dtales: [
    { pillar: "seo", trend: "up", title: "Strong brand visibility in traditional search", detail: "Ranks well for key service-related searches with consistent top 10 positions." },
    { pillar: "aeo", trend: "flat", title: "Limited presence in AI answer engines", detail: "Low appearance in featured snippets and direct-answer boxes." },
    { pillar: "geo", trend: "down", title: "Minimal citations on generative AI platforms", detail: "Rarely mentioned in ChatGPT, Perplexity and Google AI Overviews." },
    { pillar: "seo", trend: "flat", title: "Good technical foundation", detail: "Fast loading speeds and clean site structure." },
    { pillar: "aeo", trend: "up", title: "Undiscovered content opportunities", detail: "Several valuable pages are crawlable but not indexed." },
  ],
};
