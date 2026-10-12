// Copy used to turn mock scores into readable evidence and recommendations.
// [strong (≥85), mid (70–84), weak (<70)]
export const EVIDENCE: Record<string, [string, string, string]> = {
  technical: [
    "Core Web Vitals pass on 96% of sampled URLs, with clean canonicals and hreflang.",
    "Most templates pass Core Web Vitals; LCP exceeds 2.5s on blog and case-study pages.",
    "Render-blocking scripts and 4xx redirect chains slow crawling of key service pages.",
  ],
  content: [
    "Deep topic clusters with 40+ interlinked guides per core category.",
    "Service pages are solid, but supporting content is thin on mid-funnel topics.",
    "Few long-form pages; most service pages are under 400 words.",
  ],
  backlinks: [
    "Referring domains include major publications and developer communities.",
    "Steady link growth, mostly from directories and partner pages.",
    "Small referring-domain base with few editorial links from industry publications.",
  ],
  ranking: [
    "Holds top-3 positions for most head terms in its category.",
    "Consistent top-10 positions for branded and service keywords.",
    "Ranks mainly for branded queries; non-branded visibility is low.",
  ],
  structured: [
    "FAQ, HowTo and Organization schema present across templates.",
    "Organization schema present; FAQ markup missing on service pages.",
    "No structured data detected beyond basic meta tags.",
  ],
  directAnswer: [
    "Pages lead with concise 40–60 word answers to the target question.",
    "Some pages answer directly, but key definitions sit below the fold.",
    "Answers are buried in long paragraphs with few question-led headings.",
  ],
  snippet: [
    "Owns featured snippets for most tracked questions in its category.",
    "Appears in a handful of featured snippets and People Also Ask boxes.",
    "Rarely appears in featured snippets or People Also Ask results.",
  ],
  crawlability: [
    "Answer content is server-rendered and reachable within three clicks.",
    "Most answer content is crawlable; some FAQ accordions load client-side.",
    "Key answer content loads via JavaScript only after interaction.",
  ],
  thirdParty: [
    "Frequently cited on review sites, Reddit threads and industry roundups.",
    "Listed on major review sites, with limited editorial coverage.",
    "Few third-party mentions for AI engines to cite.",
  ],
  brandScale: [
    "Well-known brand with strong branded search demand and community.",
    "Recognised in its niche, with growing branded search demand.",
    "Low branded search volume limits how often AI engines surface the brand.",
  ],
  freshness: [
    "Key pages updated within the last 30 days.",
    "Core pages refreshed this quarter; some guides are over a year old.",
    "Many key pages haven't been updated in over 12 months.",
  ],
  clarity: [
    "Consistent one-line positioning across site, profiles and directories.",
    "Positioning is mostly consistent, with some variation across profiles.",
    "Inconsistent descriptions across site and profiles weaken entity matching.",
  ],
};

/** {leader} = best competitor on the metric, {gap} = points behind it. */
export const RECOMMENDATIONS: Record<string, { title: string; explanation: string; action: string }> = {
  technical: {
    title: "Fix LCP on blog and case-study templates",
    explanation: "Hero images on these templates load without priority hints, pushing LCP past 2.5s. {leader} serves similar layouts {gap} points faster on our technical index.",
    action: "View affected URLs",
  },
  content: {
    title: "Build a topic cluster around each core service",
    explanation: "Competitors cover mid-funnel questions your pages skip. Add 6–8 interlinked guides per service to close the {gap}-point gap with {leader}.",
    action: "Draft content plan",
  },
  backlinks: {
    title: "Earn editorial links from industry publications",
    explanation: "Your referring domains trail {leader} by {gap} points, mostly from directories. Pitch data-led case studies to design and marketing publications.",
    action: "See link targets",
  },
  ranking: {
    title: "Target non-branded service keywords",
    explanation: "Most of your top-10 positions are branded. Map one non-branded keyword per service page and align titles and H1s to it.",
    action: "Map keywords",
  },
  structured: {
    title: "Add FAQ and Service schema to service pages",
    explanation: "Answer engines can't parse your Q&A blocks without markup. {leader} marks up every service page and scores {gap} points higher here.",
    action: "Generate schema",
  },
  directAnswer: {
    title: "Open key pages with a 50-word direct answer",
    explanation: "Definitions sit below the fold, so answer engines quote competitors instead. Lead each page with the answer, then expand.",
    action: "View examples",
  },
  snippet: {
    title: "Rewrite top questions for featured snippets",
    explanation: "You appear in few featured snippets for questions you already rank for. Use question-led H2s with list or table answers.",
    action: "Show questions",
  },
  crawlability: {
    title: "Server-render FAQ accordion content",
    explanation: "Some answers load only after a click, so crawlers index an empty accordion. Render the text in the initial HTML.",
    action: "View affected pages",
  },
  thirdParty: {
    title: "Get listed where AI engines look for recommendations",
    explanation: "ChatGPT and Perplexity cite G2, Clutch and industry roundups for category questions. {leader} appears in far more of them — a {gap}-point gap.",
    action: "See citation sources",
  },
  brandScale: {
    title: "Grow branded search demand",
    explanation: "Generative engines favour brands people already search for. Pair thought-leadership content with founder-led distribution to lift branded queries.",
    action: "Plan campaign",
  },
  freshness: {
    title: "Refresh guides older than 12 months",
    explanation: "Stale dates lower the odds of being cited in AI answers. Update statistics, examples and the visible “last updated” date on top guides.",
    action: "List stale pages",
  },
  clarity: {
    title: "Use one positioning line everywhere",
    explanation: "Your site, LinkedIn and directory profiles describe the company differently. AI engines match entities more confidently when descriptions agree.",
    action: "Compare descriptions",
  },
};

export const PROMPTS = [
  { prompt: "Best web design agency for SaaS startups", engine: "ChatGPT", offset: 10 },
  { prompt: "Who builds high-converting marketing websites?", engine: "Perplexity", offset: 4 },
  { prompt: "Webflow vs a custom Next.js site for a B2B brand", engine: "Google AI Overviews", offset: -2 },
  { prompt: "Top platforms for launching a product website", engine: "ChatGPT", offset: 8 },
  { prompt: "How do I improve my brand's visibility in AI search?", engine: "Gemini", offset: 0 },
  { prompt: "Best tools for documentation and knowledge bases", engine: "Claude", offset: -6 },
];

export const AI_ENGINES = [
  { engine: "ChatGPT", offset: 2 },
  { engine: "Perplexity", offset: 6 },
  { engine: "Google AI Overviews", offset: -3 },
  { engine: "Gemini", offset: -6 },
  { engine: "Claude", offset: 0 },
  { engine: "Copilot", offset: -9 },
];
