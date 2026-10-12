import { afterEach, describe, expect, it, vi } from "vitest";
import type { ApiCompanyResearch, ResearchJob } from "../api/types";
import { buildHeadToHead, IncompleteResultError, isHeadToHead } from "./comparison";
import { reloadRequests, retryRequests, runHeadToHead, SideFailedError, validatePair } from "./head-to-head";
import { editCompanyName, suggestCompanies } from "./library";
import { isRepeatedDomain } from "./validation";
import { ResearchAbortedError } from "./run";

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const ok = (data: unknown, status = 200) => json(status, { success: true, data });

function api(id: string, domain: string, score: number | null, extra: Partial<ApiCompanyResearch> = {}): ApiCompanyResearch {
  const pillar = (p: "seo" | "aeo" | "geo") => ({ pillar: p, score, delta: 0, subMetrics: [{ key: `${p}-m`, label: "M", score, delta: 0 }], evidence: [] });
  return {
    company: { id, name: id.toUpperCase(), domain, category: "Website Builder", logo: { mark: "W", bg: "#111", fg: "#fff" }, tagline: null, linkedin: null, researchedAt: "2026-10-04T09:44:14.415Z" },
    pillars: { seo: pillar("seo"), aeo: pillar("aeo"), geo: pillar("geo") },
    aiVisibility: [],
    hiddenAssets: [],
    hiddenAssetsChecked: true,
    sources: [],
    recommendations: [],
    competitors: [],
    ...extra,
  };
}

const job = (patch: Partial<ResearchJob>): ResearchJob => ({
  id: "job",
  companyName: "X",
  domain: "x.com",
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

/** POST /api/research answers per domain; GETs answer per path, each from a queue. */
function backend(posts: Record<string, Response>, gets: Record<string, Response[]>) {
  const fetch = vi.fn(async (url: string, init: RequestInit = {}) => {
    if (init.method === "POST") return posts[JSON.parse(String(init.body)).domain]!;
    const next = gets[url]?.shift();
    if (!next) throw new Error(`unexpected GET ${url}`);
    return next;
  });
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

const sleep = async () => {};
const WIX = { companyName: "Wix", domain: "wix.com" };
const WEBFLOW = { companyName: "Webflow", domain: "webflow.com" };

afterEach(() => vi.unstubAllGlobals());

describe("validatePair", () => {
  it("validates both sides like the research form and normalizes domains", () => {
    expect(validatePair([{ companyName: " Wix ", domain: "https://www.wix.com" }, WEBFLOW])).toEqual({ errors: null, value: [WIX, WEBFLOW] });
    expect(validatePair([{ companyName: "", domain: "wix.com" }, { companyName: "Webflow", domain: "nope" }]).errors).toEqual([
      { companyName: "Company name is required." },
      { domain: "Company URL must be a valid http(s) URL, e.g. https://example.com." },
    ]);
  });

  it("rejects the same website twice", () => {
    expect(validatePair([WIX, { companyName: "Wix again", domain: "www.wix.com/" }]).errors).toEqual([{}, { domain: "Choose two different companies to compare." }]);
  });
});

describe("buildHeadToHead", () => {
  it("puts A first with B as its only rival, from real scores", () => {
    const c = buildHeadToHead(api("wix", "wix.com", 80), api("webflow", "webflow.com", 70, { company: { ...api("webflow", "webflow.com", 70).company, category: "Design Tool", researchedAt: "2026-09-01T00:00:00Z" } }));
    expect(c.companies.map((x) => [x.company.id, x.pillars.seo.score])).toEqual([
      ["wix", 80],
      ["webflow", 70],
    ]);
    expect(c).toMatchObject({ subjectId: "wix", category: "Website Builder · Design Tool", updatedAt: "2026-09-01" });
    expect(isHeadToHead(c)).toBe(true);
    expect(c.landscape).toEqual([
      { companyId: "wix", competitors: [] },
      { companyId: "webflow", competitors: [] },
    ]);
    expect(isHeadToHead({ id: "cmp-wix" })).toBe(false);
  });

  it("rejects a side that isn't fully scored", () => {
    expect(() => buildHeadToHead(api("wix", "wix.com", 80), api("webflow", "webflow.com", null))).toThrow(IncompleteResultError);
  });
});

describe("runHeadToHead", () => {
  it("uses stored results without polling, and follows a new job to its company", async () => {
    const fetch = backend(
      { "wix.com": ok({ status: "existing", company: api("wix", "wix.com", 80) }), "webflow.com": ok({ status: "queued", job: job({ id: "j2" }) }, 202) },
      {
        "/api/research/j2": [ok(job({ id: "j2", status: "scoring", progress: 88 })), ok(job({ id: "j2", status: "completed", progress: 100, companyId: "webflow" }))],
        "/api/companies/webflow": [ok(api("webflow", "webflow.com", 70))],
      },
    );
    const onJob = vi.fn();
    const onReady = vi.fn();
    const [a, b] = await runHeadToHead([WIX, WEBFLOW], { signal: new AbortController().signal, sleep, onJob, onReady });
    expect([a.company.id, b.company.id]).toEqual(["wix", "webflow"]);
    expect(onReady.mock.calls).toEqual(expect.arrayContaining([[0, true], [1, false]]));
    expect(onJob.mock.calls.map(([side, j]) => [side, j.status])).toEqual([
      [1, "queued"],
      [1, "scoring"],
      [1, "completed"],
    ]);
    expect(fetch.mock.calls.filter(([u]) => u === "/api/research/j2")).toHaveLength(2);
  });

  it("resumes a side from its saved job id instead of starting it again", async () => {
    const fetch = backend(
      { "wix.com": ok({ status: "existing", company: api("wix", "wix.com", 80) }) },
      { "/api/research/j9": [ok(job({ id: "j9", status: "completed", progress: 100, companyId: "webflow" }))], "/api/companies/webflow": [ok(api("webflow", "webflow.com", 70))] },
    );
    await runHeadToHead([WIX, WEBFLOW], { signal: new AbortController().signal, sleep, jobIds: [null, "j9"] });
    expect(fetch.mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(1);
  });

  it("reports which side failed, with the backend's safe message", async () => {
    backend(
      { "wix.com": ok({ status: "queued", job: job({ id: "j1" }) }, 202), "webflow.com": ok({ status: "queued", job: job({ id: "j2" }) }, 202) },
      {
        "/api/research/j1": Array.from({ length: 20 }, () => ok(job({ id: "j1", status: "researching", progress: 20 }))),
        "/api/research/j2": [ok(job({ id: "j2", status: "failed", progress: 20, error: { code: "FETCH_FAILED", message: "We couldn't reach webflow.com." } }))],
      },
    );
    const e = await runHeadToHead([WIX, WEBFLOW], { signal: new AbortController().signal, sleep }).catch((x) => x);
    expect(e).toBeInstanceOf(SideFailedError);
    expect(e).toMatchObject({ side: 1, message: "We couldn't reach webflow.com.", code: "FETCH_FAILED" });
  });

  it("stops when the caller aborts", async () => {
    backend({ "wix.com": ok({ status: "existing", company: api("wix", "wix.com", 80) }), "webflow.com": ok({ status: "existing", company: api("webflow", "webflow.com", 70) }) }, {});
    const ctrl = new AbortController();
    ctrl.abort();
    await expect(runHeadToHead([WIX, WEBFLOW], { signal: ctrl.signal, sleep })).rejects.toBeInstanceOf(ResearchAbortedError);
  });
});

const posts = (fetch: ReturnType<typeof backend>) => fetch.mock.calls.filter(([, init]) => init?.method === "POST").map(([, init]) => JSON.parse(String(init!.body)));
const polls = (fetch: ReturnType<typeof backend>) => fetch.mock.calls.filter(([u, init]) => init?.method !== "POST" && String(u).startsWith("/api/research/")).length;
const SQUARESPACE = { companyName: "Squarespace", domain: "squarespace.com" };
const DUDA = { companyName: "Duda", domain: "duda.co" };

describe("head-to-head of any two companies", () => {
  it("two researched companies: reuses both stored results, no job is created or polled", async () => {
    const fetch = backend({ "wix.com": ok({ status: "existing", company: api("wix", "wix.com", 80) }), "webflow.com": ok({ status: "existing", company: api("webflow", "webflow.com", 70) }) }, {});
    const onJob = vi.fn();
    const [a, b] = await runHeadToHead([WIX, WEBFLOW], { signal: new AbortController().signal, sleep, onJob });
    expect([a.company.id, b.company.id]).toEqual(["wix", "webflow"]);
    expect(onJob).not.toHaveBeenCalled();
    expect(polls(fetch)).toBe(0);
    expect(posts(fetch)).toEqual([WIX, WEBFLOW]); // one POST per side, never forced
  });

  it("one researched + one new: reuses the first, researches the second to completion", async () => {
    const fetch = backend(
      { "wix.com": ok({ status: "existing", company: api("wix", "wix.com", 80) }), "squarespace.com": ok({ status: "queued", job: job({ id: "j2", domain: "squarespace.com" }) }, 202) },
      {
        "/api/research/j2": [ok(job({ id: "j2", status: "researching", progress: 30 })), ok(job({ id: "j2", status: "completed", progress: 100, companyId: "squarespace" }))],
        "/api/companies/squarespace": [ok(api("squarespace", "squarespace.com", 60))],
      },
    );
    const [a, b] = await runHeadToHead([WIX, SQUARESPACE], { signal: new AbortController().signal, sleep });
    expect([a.company.id, b.company.id]).toEqual(["wix", "squarespace"]);
    expect(posts(fetch)).toEqual([WIX, SQUARESPACE]);
  });

  it("two new companies: researches both and resolves only when both are complete", async () => {
    const fetch = backend(
      { "squarespace.com": ok({ status: "queued", job: job({ id: "j1" }) }, 202), "duda.co": ok({ status: "queued", job: job({ id: "j2" }) }, 202) },
      {
        "/api/research/j1": [ok(job({ id: "j1", status: "scoring", progress: 88 })), ok(job({ id: "j1", status: "completed", progress: 100, companyId: "squarespace" }))],
        "/api/research/j2": [ok(job({ id: "j2", status: "completed", progress: 100, companyId: "duda" }))],
        "/api/companies/squarespace": [ok(api("squarespace", "squarespace.com", 60))],
        "/api/companies/duda": [ok(api("duda", "duda.co", 55))],
      },
    );
    const onReady = vi.fn();
    const [a, b] = await runHeadToHead([SQUARESPACE, DUDA], { signal: new AbortController().signal, sleep, onReady });
    expect([a.company.id, b.company.id]).toEqual(["squarespace", "duda"]);
    expect(onReady.mock.calls).toEqual(expect.arrayContaining([[0, false], [1, false]]));
    expect(posts(fetch)).toHaveLength(2);
  });

  it("a company already being researched: follows that job instead of starting another", async () => {
    const fetch = backend(
      { "wix.com": ok({ status: "existing", company: api("wix", "wix.com", 80) }), "duda.co": ok({ status: "in_progress", job: job({ id: "running", status: "scoring", progress: 86 }) }, 202) },
      { "/api/research/running": [ok(job({ id: "running", status: "completed", progress: 100, companyId: "duda" }))], "/api/companies/duda": [ok(api("duda", "duda.co", 55))] },
    );
    const onJob = vi.fn();
    await runHeadToHead([WIX, DUDA], { signal: new AbortController().signal, sleep, onJob });
    expect(posts(fetch)).toHaveLength(2);
    expect(onJob.mock.calls.map(([side, j]) => [side, j.id, j.status])).toEqual([
      [1, "running", "scoring"],
      [1, "running", "completed"],
    ]);
  });

  it("one side fails while the other succeeds: reports the failed side, shows nothing", async () => {
    backend(
      { "wix.com": ok({ status: "existing", company: api("wix", "wix.com", 80) }), "duda.co": ok({ status: "queued", job: job({ id: "j2" }) }, 202) },
      { "/api/research/j2": [ok(job({ id: "j2", status: "failed", progress: 20, error: { code: "WEBSITE_RESEARCH_FAILED", message: "We couldn't read duda.co." } }))] },
    );
    const e = await runHeadToHead([WIX, DUDA], { signal: new AbortController().signal, sleep }).catch((x) => x);
    expect(e).toBeInstanceOf(SideFailedError);
    expect(e).toMatchObject({ side: 1, message: "We couldn't read duda.co." });
  });

  it("never shows another website's research under a side (canonical records stay with their own domain)", async () => {
    backend(
      { "wix.com": ok({ status: "existing", company: api("wix", "wix.com", 80) }), "duda.co": ok({ status: "queued", job: job({ id: "j2" }) }, 202) },
      { "/api/research/j2": [ok(job({ id: "j2", status: "completed", progress: 100, companyId: "webflow" }))], "/api/companies/webflow": [ok(api("webflow", "webflow.com", 70))] },
    );
    const e = await runHeadToHead([WIX, DUDA], { signal: new AbortController().signal, sleep }).catch((x) => x);
    expect(e).toMatchObject({ side: 1, message: "The research service returned a result for a different website. Please try again." });
  });
});

describe("retry and reload", () => {
  it("retry re-sends the failed side; a side that finished is never forced again", () => {
    const forced = (r: { companyName: string; domain: string }) => ({ ...r, force: true });
    expect(retryRequests([{ request: forced(WIX), ready: true }, { request: forced(DUDA), ready: false }])).toEqual([WIX, forced(DUDA)]);
    expect(retryRequests([{ request: WIX, ready: true }, { request: DUDA, ready: false }])).toEqual([WIX, DUDA]);
  });

  it("retry after a failure joins the failed side's research again and reuses the finished side", async () => {
    const fetch = backend(
      { "wix.com": ok({ status: "existing", company: api("wix", "wix.com", 80) }), "duda.co": ok({ status: "queued", job: job({ id: "j3" }) }, 202) },
      { "/api/research/j3": [ok(job({ id: "j3", status: "completed", progress: 100, companyId: "duda" }))], "/api/companies/duda": [ok(api("duda", "duda.co", 55))] },
    );
    const [a, b] = await runHeadToHead(retryRequests([{ request: WIX, ready: true }, { request: DUDA, ready: false }]), { signal: new AbortController().signal, sleep });
    expect([a.company.id, b.company.id]).toEqual(["wix", "duda"]);
    expect(posts(fetch)).toEqual([WIX, DUDA]);
  });

  it("reloading a shown comparison asks for stored results only: no force, no new jobs", async () => {
    const saved = reloadRequests([{ ...WIX, force: true }, { ...DUDA, force: true }]);
    expect(saved).toEqual([WIX, DUDA]);
    const fetch = backend({ "wix.com": ok({ status: "existing", company: api("wix", "wix.com", 80) }), "duda.co": ok({ status: "existing", company: api("duda", "duda.co", 55) }) }, {});
    await runHeadToHead(saved, { signal: new AbortController().signal, sleep });
    expect(posts(fetch).every((b) => !("force" in b))).toBe(true);
    expect(polls(fetch)).toBe(0);
  });
});

describe("compare form inputs", () => {
  const lib = [api("wix", "wix.com", 80), api("webflow", "webflow.com", 70)].map((c) => buildHeadToHead(c, api("x", "x.com", 1)).companies[0]);

  it("a new company with no autocomplete matches is still valid to compare", () => {
    expect(suggestCompanies(lib, "Squarespace", null)).toEqual([]);
    expect(validatePair([WIX, SQUARESPACE])).toEqual({ errors: null, value: [WIX, SQUARESPACE] });
    expect(validatePair([SQUARESPACE, DUDA]).value).toEqual([SQUARESPACE, DUDA]);
  });

  it("suggests by name or website and leaves out the other side's company", () => {
    expect(suggestCompanies(lib, "web", null).map((c) => c.company.id)).toEqual(["webflow"]);
    expect(suggestCompanies(lib, "", "wix.com").map((c) => c.company.id)).toEqual(["webflow"]);
  });

  it("treats the same website in any format as the same company", () => {
    for (const d of [" https://www.wix.com/ ", "http://WIX.com", "wix.com/pricing", "www.wix.com."]) {
      expect(validatePair([WIX, { companyName: "Other", domain: d }]).errors).toEqual([{}, { domain: "Choose two different companies to compare." }]);
    }
  });

  it("rejects malformed and accidentally repeated websites, keeps real ones", () => {
    const err = (domain: string) => validatePair([WIX, { companyName: "Acme", domain }]).errors?.[1].domain;
    for (const d of ["wix.comwix.com", "wix.comwww.wix.com", "https://wix.comhttps://wix.com", "www.wix.com.wix.com"]) {
      expect(isRepeatedDomain(d)).toBe(true);
      expect(err(d)).toBe("This website looks like it was entered twice. Enter it once, e.g. example.com.");
    }
    for (const d of ["wix", "wix..com", "-wix.com", "http://", "wix com"]) expect(err(d)).toBe("Company URL must be a valid http(s) URL, e.g. https://example.com.");
    for (const d of ["squarespace.com", "blog.acme.co.uk", "coca-cola.com", "comcom.com", "wixwix.com", "abc.abc.xyz"]) {
      expect(isRepeatedDomain(d)).toBe(false);
      expect(err(d)).toBeUndefined();
    }
  });

  it("a new name clears only a website filled by a library pick, never one the user typed", () => {
    const pick = { companyName: "Wix", domain: "wix.com" };
    expect(editCompanyName(pick, "Wix Studio", pick)).toEqual({ companyName: "Wix Studio", domain: "" });
    expect(editCompanyName({ companyName: "Wi", domain: "wix.com" }, "Wix", null)).toEqual({ companyName: "Wix", domain: "wix.com" });
    expect(editCompanyName({ companyName: "Wix", domain: "wixstudio.com" }, "Wix Studio", pick)).toEqual({ companyName: "Wix Studio", domain: "wixstudio.com" });
  });
});
