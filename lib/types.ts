// Shapes mirror what the research backend will eventually return.
// Swap the service in lib/services/research.ts; components only see these types.

export type Pillar = "seo" | "aeo" | "geo";
export type Trend = "up" | "flat" | "down";
export type Impact = "high" | "medium" | "low";

export interface Company {
  id: string;
  name: string;
  domain: string;
  category: string;
  logo: { mark: string; bg: string; fg: string };
}

export interface SubMetric {
  key: string;
  label: string;
  score: number;
  /** Change vs. previous research run, in points. */
  delta: number;
}

export interface Evidence {
  id: string;
  pillar: Pillar;
  metricKey: string;
  text: string;
  sentiment: "positive" | "neutral" | "negative";
}

export interface PillarScore {
  pillar: Pillar;
  score: number;
  delta: number;
  subMetrics: SubMetric[];
  evidence: Evidence[];
}

export interface AiEngineVisibility {
  engine: string;
  /** Share of tracked prompts where the brand is mentioned, 0–100. */
  mentionRate: number;
  citations: number;
}

export interface HiddenAsset {
  id: string;
  companyId: string;
  url: string;
  foundIn: string;
  issue: string;
  kind: "hidden-content" | "orphan-page" | "staging-leak" | "noindex-conflict";
  severity: "high" | "medium" | "low";
}

export type SourceType =
  | "Company website"
  | "LinkedIn"
  | "G2"
  | "Clutch"
  | "Search result"
  | "Industry publication"
  | "AI answer";

export interface Source {
  id: string;
  companyId: string;
  title: string;
  domain: string;
  url: string;
  type: SourceType;
  pillar: Pillar;
}

export interface CompanyResearch {
  company: Company;
  pillars: Record<Pillar, PillarScore>;
  aiVisibility: AiEngineVisibility[];
  hiddenAssets: HiddenAsset[];
  /** False when the hidden-assets check couldn't run: then no findings means "not checked", not "none found". */
  hiddenAssetsChecked: boolean;
  sources: Source[];
}

export interface Insight {
  id: string;
  pillar: Pillar;
  trend: Trend;
  title: string;
  detail: string;
}

export interface Recommendation {
  id: string;
  impact: Impact;
  pillar: Pillar;
  title: string;
  explanation: string;
  metric: string;
  /** Current score → realistic target after the fix. */
  current: number;
  target: number;
  action: string;
}

export interface PromptCheck {
  prompt: string;
  engine: string;
  /** Company ids mentioned in the answer, in order of appearance. */
  mentioned: string[];
}

export interface Comparison {
  id: string;
  subjectId: string;
  category: string;
  updatedAt: string;
  companies: CompanyResearch[];
  insights: Insight[];
  recommendations: Recommendation[];
  promptChecks: PromptCheck[];
  /**
   * The competitors each compared company's research selected (from the backend; for a company with
   * competitors in this comparison, the subject's list). Absent in demo data.
   */
  landscape?: { companyId: string; competitors: { name: string; domain: string }[] }[];
}

export interface ComparisonSummary {
  id: string;
  /** Company id of the comparison's subject; opening the comparison loads it. */
  subjectId: string;
  subject: string;
  competitors: string[];
  category: string;
  updatedAt: string;
  status: "complete" | "refreshing";
}

export interface ExportRecord {
  id: string;
  title: string;
  format: "CSV" | "PDF";
  createdAt: string;
  size: string;
}
