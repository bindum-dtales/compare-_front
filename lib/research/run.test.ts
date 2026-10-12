import { afterEach, describe, expect, it, vi } from "vitest";
import type { ResearchJob } from "../api/types";
import { loadComparison } from "./comparison";
import { progressPercent, stageIndex, stepText } from "./progress";
import { MAX_CONSECUTIVE_POLL_ERRORS, pollResearchJob, ResearchAbortedError, ResearchFailedError, rerunRequest, runResearch } from "./run";

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const ok = (data: unknown, status = 200) => json(status, { success: true, data });

const job = (patch: Partial<ResearchJob> = {}): ResearchJob => ({
  id: "job-1",
  companyName: "Wix",
  domain: "wix.com",
  status: "queued",
  progress: 0,
  currentStep: null,
  error: null,
  companyId: null,
  createdAt: "2026-10-04T09:42:00Z",
  startedAt: null,
  completedAt: null,
  ...patch,
});

/** Answers POST /api/research with `start`, then each GET with the next queued response. */
function backend(start: Response | null, polls: (Response | Error)[]) {
  let inFlight = 0;
  let maxInFlight = 0;
  const gets: string[] = [];
  const fetch = vi.fn(async (url: string, init: RequestInit = {}) => {
    if (init.method === "POST") return start!;
    gets.push(url);
    inFlight++;
    maxInFlight = Math.max(maxInFlight, inFlight);
    await Promise.resolve();
    inFlight--;
    const next = polls.shift();
    if (!next) throw new Error("unexpected extra poll");
    if (next instanceof Error) throw next;
    return next;
  });
  vi.stubGlobal("fetch", fetch);
  return { fetch, gets, maxInFlight: () => maxInFlight };
}

const sleeps: number[] = [];
const sleep = async (ms: number) => {
  sleeps.push(ms);
};
const opts = (signal = new AbortController().signal) => ({ signal, sleep, pollIntervalMs: 2_000, onJob: vi.fn() });

afterEach(() => {
  vi.unstubAllGlobals();
  sleeps.length = 0;
});

describe("runResearch", () => {
  it("polls a queued job through every backend status until completed, one request at a time", async () => {
    const statuses: Partial<ResearchJob>[] = [
      { status: "resolving", progress: 10, currentStep: "Resolving company" },
      { status: "researching", progress: 20, currentStep: "Fetching wix.com" },
      { status: "detecting_category", progress: 40, currentStep: "Detecting category" },
      { status: "finding_competitors", progress: 55, currentStep: "Searching for competitors" },
      { status: "scoring", progress: 88, currentStep: "Scoring Wix" },
      { status: "synthesizing", progress: 89, currentStep: "Checking hidden assets for Wix" },
      { status: "synthesizing", progress: 99, currentStep: "Generating recommendations" },
      { status: "completed", progress: 100, currentStep: null, companyId: "wix" },
    ];
    const api = backend(ok({ status: "queued", job: job() }, 202), statuses.map((s) => ok(job(s))));
    const o = opts();
    const outcome = await runResearch({ companyName: "Wix", domain: "wix.com" }, o);

    expect(outcome).toMatchObject({ kind: "completed", companyId: "wix" });
    expect(o.onJob.mock.calls.map(([j]) => j.status)).toEqual(["queued", ...statuses.map((s) => s.status)]);
    expect(api.gets.every((u) => u === "/api/research/job-1")).toBe(true);
    expect(api.gets).toHaveLength(statuses.length); // stops after "completed"
    expect(api.maxInFlight()).toBe(1);
    expect(sleeps).toEqual(Array(statuses.length - 1).fill(2_000));
  });

  it("returns an already researched company without polling", async () => {
    const pillar = (p: string) => ({ pillar: p, score: 70, delta: 0, subMetrics: [], evidence: [] });
    const company = {
      company: { id: "wix", name: "Wix", domain: "wix.com", category: "Website Builder", logo: { mark: "W", bg: "#111111", fg: "#FFFFFF" }, tagline: null, linkedin: null, researchedAt: "2026-10-04T09:44:14Z" },
      pillars: { seo: pillar("seo"), aeo: pillar("aeo"), geo: pillar("geo") },
      aiVisibility: [],
      hiddenAssets: [],
    hiddenAssetsChecked: true,
      sources: [],
      recommendations: [],
      competitors: [],
    };
    const api = backend(ok({ status: "existing", company }), []);
    const outcome = await runResearch({ companyName: "Wix", domain: "wix.com" }, opts());
    expect(outcome).toMatchObject({ kind: "existing", companyId: "wix" });
    expect(api.gets).toHaveLength(0);
  });

  it("follows a job already running for the domain (in_progress) instead of starting another", async () => {
    backend(ok({ status: "in_progress", job: job({ id: "job-7", status: "scoring", progress: 88 }) }, 202), [ok(job({ id: "job-7", status: "completed", progress: 100, companyId: "wix" }))]);
    const o = opts();
    expect(await runResearch({ companyName: "Wix", domain: "wix.com" }, o)).toMatchObject({ companyId: "wix" });
    expect(o.onJob.mock.calls[0]![0]).toMatchObject({ id: "job-7", status: "scoring" });
  });

  it("fails with the backend's safe job message", async () => {
    const message = "Scores were saved, but the evidence summary could not be generated. The AI service is busy. Please try again in a minute.";
    backend(ok({ status: "queued", job: job() }, 202), [ok(job({ status: "failed", progress: 88, error: { code: "EVIDENCE_GENERATION_FAILED", message } }))]);
    const e = await runResearch({ companyName: "Wix", domain: "wix.com" }, opts()).catch((x) => x);
    expect(e).toBeInstanceOf(ResearchFailedError);
    expect(e).toMatchObject({ message, code: "EVIDENCE_GENERATION_FAILED", job: { progress: 88 } });
  });

  it("fails with the backend's validation message when the request is rejected", async () => {
    backend(json(400, { success: false, error: { code: "VALIDATION_ERROR", message: "Company name must contain letters or digits." } }), []);
    await expect(runResearch({ companyName: "!!", domain: "wix.com" }, opts())).rejects.toMatchObject({ message: "Company name must contain letters or digits.", code: "VALIDATION_ERROR" });
  });

  it("treats a completed job without a company id as a failure", async () => {
    backend(ok({ status: "queued", job: job() }, 202), [ok(job({ status: "completed", progress: 100 }))]);
    await expect(runResearch({ companyName: "Wix", domain: "wix.com" }, opts())).rejects.toBeInstanceOf(ResearchFailedError);
  });
});

describe("pollResearchJob", () => {
  it("retries transient errors with backoff and recovers", async () => {
    backend(null, [new TypeError("offline"), json(502, { nope: 1 }), ok(job({ status: "completed", progress: 100, companyId: "wix" }))]);
    expect(await pollResearchJob("job-1", opts())).toMatchObject({ companyId: "wix" });
    expect(sleeps).toEqual([4_000, 6_000]);
  });

  it(`gives up after ${MAX_CONSECUTIVE_POLL_ERRORS} consecutive transient errors`, async () => {
    const api = backend(null, Array.from({ length: MAX_CONSECUTIVE_POLL_ERRORS }, () => new TypeError("offline")));
    await expect(pollResearchJob("job-1", opts())).rejects.toMatchObject({ message: expect.stringMatching(/^Lost connection to the research service/) });
    expect(api.gets).toHaveLength(MAX_CONSECUTIVE_POLL_ERRORS);
  });

  it("stops at once on a 4xx such as an unknown job", async () => {
    const api = backend(null, [json(404, { success: false, error: { code: "JOB_NOT_FOUND", message: "Research job was not found." } })]);
    await expect(pollResearchJob("job-1", opts())).rejects.toMatchObject({ message: "Research job was not found.", code: "JOB_NOT_FOUND" });
    expect(api.gets).toHaveLength(1);
  });

  it("stops polling when aborted (e.g. the app unmounts)", async () => {
    const ctrl = new AbortController();
    const api = backend(null, [ok(job({ status: "scoring", progress: 88 })), ok(job({ status: "scoring", progress: 88 }))]);
    const o = { ...opts(ctrl.signal), sleep: async () => ctrl.abort() };
    await expect(pollResearchJob("job-1", o)).rejects.toBeInstanceOf(ResearchAbortedError);
    expect(api.gets).toHaveLength(1);
  });

  it("uses real timers by default and the abort cancels the pending wait", async () => {
    vi.useFakeTimers();
    try {
      const ctrl = new AbortController();
      const api = backend(null, [ok(job({ status: "scoring", progress: 88 }))]);
      const p = pollResearchJob("job-1", { signal: ctrl.signal, pollIntervalMs: 2_000 });
      const settled = p.catch((e) => e);
      await vi.advanceTimersByTimeAsync(500);
      ctrl.abort();
      expect(await settled).toBeInstanceOf(ResearchAbortedError);
      await vi.advanceTimersByTimeAsync(10_000);
      expect(api.gets).toHaveLength(1);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("Re-run research (force)", () => {
  const pillar = (p: string, score: number) => ({ pillar: p, score, delta: 0, subMetrics: [{ key: `${p}-m`, label: "M", score, delta: 0 }], evidence: [] });
  const company = (score: number, researchedAt: string) => ({
    company: { id: "wix", name: "Wix", domain: "wix.com", category: "Website Builder", logo: { mark: "W", bg: "#111111", fg: "#FFFFFF" }, tagline: null, linkedin: null, researchedAt },
    pillars: { seo: pillar("seo", score), aeo: pillar("aeo", score), geo: pillar("geo", score) },
    aiVisibility: [],
    hiddenAssets: [],
    hiddenAssetsChecked: true,
    sources: [],
    recommendations: [],
    competitors: [],
  });

  /** A backend with Wix already researched (score 50). A forced POST queues one job; a second while it runs re-joins it. */
  function rerunBackend(finalJob: Partial<ResearchJob>) {
    const posts: unknown[] = [];
    let active: ResearchJob | null = null;
    let polls = 0;
    const stages: Partial<ResearchJob>[] = [
      { status: "resolving", progress: 10, currentStep: "Resolving company" },
      { status: "finding_competitors", progress: 55, currentStep: "Searching for competitors" },
      { status: "synthesizing", progress: 90, currentStep: "Generating evidence for Wix" },
      finalJob,
    ];
    let stored = company(50, "2026-10-04T09:44:14Z");
    const fetch = vi.fn(async (url: string, init: RequestInit = {}) => {
      if (init.method === "POST") {
        const body = JSON.parse(String(init.body));
        posts.push(body);
        if (!body.force) return ok({ status: "existing", company: stored });
        if (active) return ok({ status: "in_progress", job: active }, 202);
        active = job({ id: "job-rerun" });
        return ok({ status: "queued", job: active }, 202);
      }
      if (url === "/api/research/job-rerun") {
        await Promise.resolve();
        const next = job({ id: "job-rerun", ...stages[Math.min(polls++, stages.length - 1)] });
        if (next.status === "completed") stored = company(80, "2026-10-08T07:06:45Z");
        return ok(next);
      }
      if (url === "/api/companies/wix/comparison") return ok({ subject: stored, competitors: [] });
      throw new Error(`unexpected request ${url}`);
    });
    vi.stubGlobal("fetch", fetch);
    return { posts, fetch, polls: () => polls };
  }

  it("the Re-run button's request asks the backend for a fresh job (force: true)", async () => {
    expect(rerunRequest({ name: "Wix", domain: "wix.com" })).toEqual({ companyName: "Wix", domain: "wix.com", force: true });
    const api = rerunBackend({ status: "completed", progress: 100, companyId: "wix" });
    const outcome = await runResearch(rerunRequest({ name: "Wix", domain: "wix.com" }), opts());
    expect(api.posts).toEqual([{ companyName: "Wix", domain: "wix.com", force: true }]);
    expect(outcome).toMatchObject({ kind: "completed", companyId: "wix", job: { id: "job-rerun" } }); // not the stored result
  });

  it("a normal request for the same company still returns the stored result without a job", async () => {
    const api = rerunBackend({ status: "completed", progress: 100, companyId: "wix" });
    expect(await runResearch({ companyName: "Wix", domain: "wix.com" }, opts())).toMatchObject({ kind: "existing", company: { pillars: { seo: { score: 50 } } } });
    expect(api.polls()).toBe(0);
  });

  it("reports progress through the research stages", async () => {
    rerunBackend({ status: "completed", progress: 100, companyId: "wix" });
    const o = opts();
    await runResearch(rerunRequest({ name: "Wix", domain: "wix.com" }), o);
    const jobs = o.onJob.mock.calls.map(([j]) => j as ResearchJob);
    expect(jobs.map((j) => j.status)).toEqual(["queued", "resolving", "finding_competitors", "synthesizing", "completed"]);
    const stages = jobs.map(stageIndex);
    expect(stages).toEqual([...stages].sort((a, b) => a - b)); // never moves backwards
    expect(stepText(jobs[3]!)).toBe("Generating evidence for Wix");
    expect(progressPercent(jobs.at(-1)!)).toBe(100);
  });

  it("after a successful re-run the refreshed result is loaded from the backend, not the old one", async () => {
    rerunBackend({ status: "completed", progress: 100, companyId: "wix" });
    const outcome = await runResearch(rerunRequest({ name: "Wix", domain: "wix.com" }), opts());
    const comparison = await loadComparison(outcome.companyId);
    expect(comparison.companies[0]!.pillars.seo.score).toBe(80);
    expect(comparison.updatedAt).toBe("2026-10-08");
  });

  it("a failed re-run surfaces the backend's safe message (the previous result was kept)", async () => {
    const message = "The research could not be refreshed, so the previous results were kept. The AI service is busy. Please try again in a minute.";
    rerunBackend({ status: "failed", progress: 90, error: { code: "EVIDENCE_GENERATION_FAILED", message } });
    const e = await runResearch(rerunRequest({ name: "Wix", domain: "wix.com" }), opts()).catch((x) => x);
    expect(e).toBeInstanceOf(ResearchFailedError);
    expect(e).toMatchObject({ message, code: "EVIDENCE_GENERATION_FAILED" });
    expect(e.message).not.toMatch(/Groq|429|org_/);
  });

  it("two re-runs started together follow one job: the second joins it instead of creating another", async () => {
    const api = rerunBackend({ status: "completed", progress: 100, companyId: "wix" });
    const [a, b] = await Promise.all([runResearch(rerunRequest({ name: "Wix", domain: "wix.com" }), opts()), runResearch(rerunRequest({ name: "Wix", domain: "wix.com" }), opts())]);
    expect(api.posts).toHaveLength(2);
    expect(a).toMatchObject({ kind: "completed", job: { id: "job-rerun" } });
    expect(b).toMatchObject({ kind: "completed", job: { id: "job-rerun" } });
    const followed = new Set(api.fetch.mock.calls.map(([u]) => String(u)).filter((u) => u.startsWith("/api/research/")));
    expect(followed).toEqual(new Set(["/api/research/job-rerun"]));
  });
});
