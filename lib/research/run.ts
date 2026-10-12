// Runs one research request against the backend: POST /api/research, then poll
// GET /api/research/:jobId until the job completes or fails. Framework-free (the React state lives in
// components/layout/app-state.tsx) so it can be tested without a DOM.
//
// Polling: one request at a time; the next is scheduled only after the previous one settled, so
// polls never overlap. Stops on completed / failed, or when the caller aborts. A few consecutive
// transient errors (network, 5xx, unreadable body) are retried with backoff before giving up.

import { ApiError } from "../api/client";
import { getResearchJob, startResearch } from "../api/research";
import type { ApiCompanyResearch, ResearchJob, ResearchRequest } from "../api/types";

export const POLL_INTERVAL_MS = 2_000;
export const MAX_CONSECUTIVE_POLL_ERRORS = 4;

const CONNECTION_LOST = "Lost connection to the research service. The research may still be running; try again in a moment to pick it up.";
const NO_RESULT = "The research finished, but no result was returned. Please try again.";
const FAILED = "The research could not be completed. Please try again.";

/** The research ended without a result. `message` is safe to show (the backend's job error when it gave one). */
export class ResearchFailedError extends Error {
  constructor(
    message: string,
    readonly code: string | null = null,
    readonly job: ResearchJob | null = null,
  ) {
    super(message);
    this.name = "ResearchFailedError";
  }
}

export class ResearchAbortedError extends Error {
  constructor() {
    super("Research tracking was cancelled.");
    this.name = "ResearchAbortedError";
  }
}

export type ResearchOutcome =
  /** Researched before: the backend returned the stored result immediately. */
  | { kind: "existing"; companyId: string; company: ApiCompanyResearch }
  | { kind: "completed"; companyId: string; job: ResearchJob };

export interface RunOptions {
  signal: AbortSignal;
  /** Every job state received, including the first (queued / already running). */
  onJob?: (job: ResearchJob) => void;
  pollIntervalMs?: number;
  /** Injectable for tests. */
  sleep?: (ms: number, signal: AbortSignal) => Promise<void>;
}

function abortableSleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) return reject(new ResearchAbortedError());
    const t = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(t);
      reject(new ResearchAbortedError());
    };
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

const aborted = (e: unknown, signal: AbortSignal) => signal.aborted || (e instanceof ApiError && e.kind === "aborted");

function finished(job: ResearchJob): ResearchOutcome {
  if (job.status === "failed") throw new ResearchFailedError(job.error?.message ?? FAILED, job.error?.code ?? null, job);
  if (!job.companyId) throw new ResearchFailedError(NO_RESULT, null, job);
  return { kind: "completed", companyId: job.companyId, job };
}

/** Polls a job until it completes (resolves) or fails (throws ResearchFailedError). */
export async function pollResearchJob(jobId: string, opts: RunOptions): Promise<ResearchOutcome> {
  const { signal, onJob, pollIntervalMs = POLL_INTERVAL_MS, sleep = abortableSleep } = opts;
  let errors = 0;
  for (;;) {
    if (signal.aborted) throw new ResearchAbortedError();
    let job: ResearchJob;
    try {
      job = await getResearchJob(jobId, { signal });
      errors = 0;
    } catch (e) {
      if (aborted(e, signal)) throw new ResearchAbortedError();
      // 4xx (e.g. JOB_NOT_FOUND) won't fix itself; the backend's message is safe to show.
      if (e instanceof ApiError && e.kind === "http" && e.status !== null && e.status < 500) throw new ResearchFailedError(e.message, e.code);
      if (++errors >= MAX_CONSECUTIVE_POLL_ERRORS) throw new ResearchFailedError(CONNECTION_LOST);
      await sleep(pollIntervalMs * (errors + 1), signal);
      continue;
    }
    onJob?.(job);
    if (job.status === "completed" || job.status === "failed") return finished(job);
    await sleep(pollIntervalMs, signal);
  }
}

/** The request behind "Re-run research": a fresh job even though the company already has a result. */
export const rerunRequest = (company: { name: string; domain: string }): ResearchRequest => ({ companyName: company.name, domain: company.domain, force: true });

/**
 * Starts (or joins) research for a company and follows it to the end. With `req.force` the backend
 * always runs a new job (or, while one is running for the domain, returns that job to follow).
 */
export async function runResearch(req: ResearchRequest, opts: RunOptions): Promise<ResearchOutcome> {
  let started;
  try {
    started = await startResearch(req, { signal: opts.signal });
  } catch (e) {
    if (aborted(e, opts.signal)) throw new ResearchAbortedError();
    throw new ResearchFailedError(e instanceof ApiError ? e.message : FAILED, e instanceof ApiError ? e.code : null);
  }
  if (started.status === "existing") return { kind: "existing", companyId: started.company.company.id, company: started.company };
  // "queued": a new job; "in_progress": this domain is already being researched, so we follow that job.
  opts.onJob?.(started.job);
  if (started.job.status === "completed" || started.job.status === "failed") return finished(started.job);
  return pollResearchJob(started.job.id, opts);
}
