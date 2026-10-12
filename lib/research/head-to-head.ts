// "Company A vs company B": the backend researches one company per request (POST /api/research), so
// a head-to-head is two research runs side by side, each through runResearch / pollResearchJob, and
// the comparison is built from the two real results. Framework-free, like run.ts.

import { ApiError } from "../api/client";
import { getCompany } from "../api/research";
import type { ApiCompanyResearch, ResearchJob, ResearchRequest } from "../api/types";
import { pollResearchJob, ResearchAbortedError, ResearchFailedError, runResearch, type RunOptions } from "./run";
import { normalizeDomain, validateResearchInput, type ResearchInput, type ResearchInputErrors } from "./validation";

export type Side = 0 | 1;
export type Pair<T> = [T, T];

const SAME_COMPANY = "Choose two different companies to compare.";
const FAILED = "The research could not be completed. Please try again.";
const WRONG_COMPANY = "The research service returned a result for a different website. Please try again.";

/** One side's research ended without a result. `message` is safe to show. */
export class SideFailedError extends ResearchFailedError {
  constructor(
    readonly side: Side,
    cause: ResearchFailedError,
  ) {
    super(cause.message, cause.code, cause.job);
    this.name = "SideFailedError";
  }
}

/** Both inputs checked like the single research form, plus: they must be two different websites. */
export function validatePair(
  inputs: Pair<ResearchInput>,
): { errors: Pair<ResearchInputErrors>; value: null } | { errors: null; value: Pair<ResearchInput> } {
  const [a, b] = inputs.map(validateResearchInput);
  if (a.value && b.value) {
    if (a.value.domain !== b.value.domain) return { errors: null, value: [a.value, b.value] };
    return { errors: [{}, { domain: SAME_COMPANY }], value: null };
  }
  return { errors: [a.errors ?? {}, b.errors ?? {}], value: null };
}

export interface HeadToHeadOptions extends Pick<RunOptions, "signal" | "pollIntervalMs" | "sleep"> {
  /** A job to keep following for a side (after a page reload) instead of starting its research again. */
  jobIds?: Pair<string | null>;
  onJob?: (side: Side, job: ResearchJob) => void;
  /** A side's result is in; `existing` when it was already researched (no job ran). */
  onReady?: (side: Side, existing: boolean) => void;
}

/**
 * Researches both companies at once and resolves with both results (A first). If one side fails,
 * the other stops being followed (its backend job keeps running) and a SideFailedError is thrown.
 */
export async function runHeadToHead(requests: Pair<ResearchRequest>, opts: HeadToHeadOptions): Promise<Pair<ApiCompanyResearch>> {
  const inner = new AbortController();
  const stop = () => inner.abort();
  if (opts.signal.aborted) throw new ResearchAbortedError();
  opts.signal.addEventListener("abort", stop, { once: true });

  async function side(s: Side): Promise<ApiCompanyResearch> {
    const run: RunOptions = { signal: inner.signal, pollIntervalMs: opts.pollIntervalMs, sleep: opts.sleep, onJob: (job) => opts.onJob?.(s, job) };
    try {
      const jobId = opts.jobIds?.[s];
      const outcome = jobId ? await pollResearchJob(jobId, run) : await runResearch(requests[s], run);
      const company = outcome.kind === "existing" ? outcome.company : await getCompany(outcome.companyId, { signal: inner.signal });
      // Never show another company's research under this side's name.
      if (company.company.domain !== normalizeDomain(requests[s].domain)) throw new ResearchFailedError(WRONG_COMPANY);
      opts.onReady?.(s, outcome.kind === "existing");
      return company;
    } catch (e) {
      if (e instanceof ResearchAbortedError || inner.signal.aborted) throw new ResearchAbortedError();
      stop();
      if (e instanceof ResearchFailedError) throw new SideFailedError(s, e);
      throw new SideFailedError(s, new ResearchFailedError(e instanceof ApiError ? e.message : FAILED, e instanceof ApiError ? e.code : null));
    }
  }

  try {
    const results = await Promise.allSettled([side(0), side(1)]);
    if (opts.signal.aborted) throw new ResearchAbortedError();
    const failed = results.find((r): r is PromiseRejectedResult => r.status === "rejected" && r.reason instanceof SideFailedError);
    if (failed) throw failed.reason;
    const [a, b] = results;
    if (a.status === "rejected") throw a.reason;
    if (b.status === "rejected") throw b.reason;
    return [a.value, b.value];
  } finally {
    opts.signal.removeEventListener("abort", stop);
  }
}

/**
 * What "Try again" sends after a failed head-to-head: the same companies, but a side whose result
 * already came in is never forced again (a failed re-run must not research the other side twice).
 * Without `force` the backend returns its stored result, or the still-running job to follow.
 */
export function retryRequests(sides: Pair<{ request: ResearchRequest; ready: boolean }>): Pair<ResearchRequest> {
  return sides.map(({ request, ready }) => (ready ? withoutForce(request) : request)) as Pair<ResearchRequest>;
}

/** What a shown head-to-head saves for a page reload: both are researched, so never `force`. */
export const reloadRequests = (requests: Pair<ResearchRequest>): Pair<ResearchRequest> => requests.map(withoutForce) as Pair<ResearchRequest>;

const withoutForce = ({ companyName, domain }: ResearchRequest): ResearchRequest => ({ companyName, domain });
