// The backend API contract (back/src/types/research.ts, back/src/types/company.ts). Responses are
// `{ success: true, data }` or `{ success: false, error: { code, message, details? } }`.
// Kept separate from lib/types.ts: the API allows nulls (unscored values) that the UI types don't;
// lib/research/comparison.ts converts between them.

import type { Pillar } from "../types";

/** research_jobs.status, in pipeline order (failed can follow any of them). */
export const JOB_STATUSES = [
  "queued",
  "resolving",
  "researching",
  "detecting_category",
  "finding_competitors",
  "scoring",
  "synthesizing",
  "completed",
  "failed",
] as const;

export type JobStatus = (typeof JOB_STATUSES)[number];

export interface ResearchJob {
  id: string;
  companyName: string;
  /** Normalized by the backend, e.g. "dtales.tech". */
  domain: string;
  status: JobStatus;
  /** 0–100. */
  progress: number;
  /** Human-readable step, e.g. "Collecting signals for Wix". */
  currentStep: string | null;
  /** Set when status is "failed". Safe to show to users. */
  error: { code: string; message: string } | null;
  companyId: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

export interface ResearchRequest {
  companyName: string;
  domain: string;
  /**
   * Research again even if the company already has a completed result ("Re-run research"). Without
   * it the backend returns the stored result. The last completed result stays until the new run
   * completes; a failed re-run keeps it.
   */
  force?: boolean;
}

/** POST /api/research: 200 when already researched, 202 when a job is queued or already running. */
export type StartResearchResult =
  | { status: "existing"; company: ApiCompanyResearch }
  | { status: "queued" | "in_progress"; job: ResearchJob };

export interface ApiSubMetric {
  key: string;
  label: string;
  score: number | null;
  delta: number;
}

export interface ApiEvidence {
  id: string;
  pillar: Pillar;
  metricKey: string;
  text: string;
  sentiment: "positive" | "neutral" | "negative";
}

export interface ApiRecommendation {
  id: string;
  impact: "high" | "medium" | "low";
  pillar: Pillar;
  title: string;
  explanation: string;
  metric: string;
  current: number;
  target: number;
  action: string;
}

/** GET /api/companies/:id, GET /api/companies. */
export interface ApiCompanyResearch {
  company: {
    id: string;
    name: string;
    domain: string;
    category: string;
    logo: { mark: string; bg: string; fg: string };
    tagline: string | null;
    linkedin: string | null;
    researchedAt: string | null;
  };
  pillars: Record<Pillar, { pillar: Pillar; score: number | null; delta: number; subMetrics: ApiSubMetric[]; evidence: ApiEvidence[] }>;
  aiVisibility: { engine: string; mentionRate: number; citations: number }[];
  hiddenAssets: {
    id: string;
    companyId: string;
    url: string;
    foundIn: string;
    issue: string;
    kind: "hidden-content" | "orphan-page" | "staging-leak" | "noindex-conflict";
    severity: "high" | "medium" | "low";
  }[];
  /** Whether the hidden-assets check ran; when false an empty hiddenAssets means "not checked". */
  hiddenAssetsChecked: boolean;
  sources: { id: string; companyId: string; title: string; domain: string; url: string; type: string; pillar: Pillar }[];
  recommendations: ApiRecommendation[];
  /** Competitors selected when this company was researched. */
  competitors: { name: string; domain: string }[];
}

/**
 * GET /api/companies/:id/comparison: a researched company with its competitors. A competitor's
 * `result` is its own canonical research (basis "canonical"), or scores produced only for this
 * comparison against the subject's category ("comparison"; never stored as that company's result),
 * or null when it couldn't be scored.
 */
export interface ApiCompanyComparison {
  subject: ApiCompanyResearch;
  competitors: { name: string; domain: string; basis: "canonical" | "comparison" | null; result: ApiCompanyResearch | null }[];
}
