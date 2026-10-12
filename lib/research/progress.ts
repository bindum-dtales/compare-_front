// How a backend research job reads in the UI. Built only from the backend's real statuses and the
// progress values / step texts it reports (back/src/services/research.service.ts):
//
//   queued 0 → resolving 10 → researching 20–30 ("Fetching <domain>", "Website research saved")
//   → detecting_category 40 → finding_competitors 55–80
//   → per company 85–98: researching ("Fetching …", "Collecting signals for …") / scoring ("Scoring …")
//     / synthesizing ("Generating evidence for …", "Checking hidden assets for …")
//   → synthesizing 99 "Generating recommendations" → completed 100 | failed

import type { JobStatus, ResearchJob } from "../api/types";

export const RESEARCH_STAGES = [
  "Researching the website",
  "Detecting the category",
  "Finding competitors",
  "Scoring SEO · AEO · GEO",
  "Evidence & hidden assets",
  "Recommendations",
] as const;

export type ResearchStage = (typeof RESEARCH_STAGES)[number];

/** Index into RESEARCH_STAGES for the stage the job is in; RESEARCH_STAGES.length once completed. */
export function stageIndex(job: Pick<ResearchJob, "status" | "progress" | "currentStep">): number {
  const step = job.currentStep ?? "";
  switch (job.status) {
    case "completed":
      return RESEARCH_STAGES.length;
    case "queued":
    case "resolving":
      return 0;
    case "detecting_category":
      return 1;
    case "finding_competitors":
      return 2;
    case "scoring":
      return 3;
    case "synthesizing":
      return /recommendation/i.test(step) ? 5 : 4;
    case "researching":
      // Website research for the target (20–30), or a company being scored (85+).
      return job.progress >= 85 ? 3 : 0;
    case "failed":
      return failedStage(job.progress, step);
  }
}

/** Where a failed job stopped: the step it was on (the backend keeps it), else the progress reached. */
function failedStage(progress: number, step: string): number {
  if (/recommendation/i.test(step)) return 5;
  if (/^(generating evidence|checking hidden assets)/i.test(step)) return 4;
  if (progress < 40) return 0;
  if (progress < 55) return 1;
  if (progress < 85) return 2;
  if (progress < 99) return 3;
  return 5;
}

const STATUS_TEXT: Record<JobStatus, string> = {
  queued: "Waiting to start",
  resolving: "Resolving company",
  researching: "Researching",
  detecting_category: "Detecting category",
  finding_competitors: "Finding competitors",
  scoring: "Scoring",
  synthesizing: "Writing the report",
  completed: "Research complete",
  failed: "Research failed",
};

/** The line shown under the progress bar: the backend's own step text, else a status description. */
export function stepText(job: Pick<ResearchJob, "status" | "currentStep">): string {
  if (job.status === "queued") return "Queued, starting shortly…";
  return job.currentStep?.trim() || STATUS_TEXT[job.status];
}

export const isTerminal = (status: JobStatus) => status === "completed" || status === "failed";

/** 0–100 for the progress bar (the backend's progress, clamped). */
export const progressPercent = (job: Pick<ResearchJob, "progress">) => Math.max(0, Math.min(100, Math.round(job.progress)));
