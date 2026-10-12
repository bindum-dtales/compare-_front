import { describe, expect, it } from "vitest";
import type { ApiCompanyResearch, JobStatus } from "../api/types";
import { afterEach, vi } from "vitest";
import { isCompanyComparison, isCompanyResearch } from "../api/research";
import { buildComparison, IncompleteResultError, loadComparison, toCompanyResearch } from "./comparison";
import { RESEARCH_STAGES, stageIndex, stepText, progressPercent } from "./progress";
import { normalizeDomain, validateResearchInput } from "./validation";

describe("validateResearchInput", () => {
  it("accepts a name and any reasonable website form, normalizing the domain like the backend", () => {
    expect(validateResearchInput({ companyName: "  Wix ", domain: "https://www.Wix.com/about?x=1" })).toEqual({ errors: null, value: { companyName: "Wix", domain: "wix.com" } });
    expect(normalizeDomain("dtales.tech")).toBe("dtales.tech");
    expect(normalizeDomain("http://blog.acme.co.uk:8080/")).toBe("blog.acme.co.uk");
  });

  it("returns the backend's messages for missing or invalid input", () => {
    expect(validateResearchInput({ companyName: " ", domain: "" }).errors).toEqual({ companyName: "Company name is required.", domain: "Company URL is required." });
    expect(validateResearchInput({ companyName: "!!!", domain: "wix.com" }).errors).toEqual({ companyName: "Company name must contain letters or digits." });
    for (const bad of ["localhost", "192.168.0.1", "ftp://wix.com", "not a url", "wix", "mailto:a@wix.com"]) {
      expect(validateResearchInput({ companyName: "Wix", domain: bad }).errors?.domain).toBe("Company URL must be a valid http(s) URL, e.g. https://example.com.");
    }
  });
});

describe("progress mapping (real backend statuses and steps)", () => {
  const at = (status: JobStatus, progress: number, currentStep: string | null = null) => stageIndex({ status, progress, currentStep });
  const stage = (i: number) => RESEARCH_STAGES[i];

  it("maps each pipeline position to its stage", () => {
    expect(stage(at("queued", 0))).toBe("Researching the website");
    expect(stage(at("resolving", 10, "Resolving company"))).toBe("Researching the website");
    expect(stage(at("researching", 20, "Fetching wix.com"))).toBe("Researching the website");
    expect(stage(at("detecting_category", 40, "Detecting category"))).toBe("Detecting the category");
    expect(stage(at("finding_competitors", 70, "Selecting competitors"))).toBe("Finding competitors");
    expect(stage(at("researching", 90, "Fetching duda.co"))).toBe("Scoring SEO · AEO · GEO"); // competitor website, scoring phase
    expect(stage(at("scoring", 88, "Scoring Wix"))).toBe("Scoring SEO · AEO · GEO");
    expect(stage(at("synthesizing", 88, "Generating evidence for Wix"))).toBe("Evidence & hidden assets");
    expect(stage(at("synthesizing", 89, "Checking hidden assets for Wix"))).toBe("Evidence & hidden assets");
    expect(stage(at("synthesizing", 99, "Generating recommendations"))).toBe("Recommendations");
    expect(at("completed", 100)).toBe(RESEARCH_STAGES.length);
  });

  it("places a failed job at the stage it reached", () => {
    expect(stage(at("failed", 20))).toBe("Researching the website");
    expect(stage(at("failed", 40))).toBe("Detecting the category");
    expect(stage(at("failed", 88))).toBe("Scoring SEO · AEO · GEO");
    expect(stage(at("failed", 99))).toBe("Recommendations");
    // The backend keeps the step a job failed on; it wins over the progress number.
    expect(stage(at("failed", 87, "Generating evidence for Carrd"))).toBe("Evidence & hidden assets");
    expect(stage(at("failed", 89, "Checking hidden assets for Carrd"))).toBe("Evidence & hidden assets");
    expect(stage(at("failed", 99, "Generating recommendations"))).toBe("Recommendations");
    expect(stage(at("failed", 87, "Collecting signals for Carrd"))).toBe("Scoring SEO · AEO · GEO");
  });

  it("shows the backend's step text, with fallbacks", () => {
    expect(stepText({ status: "scoring", currentStep: "Scoring Wix" })).toBe("Scoring Wix");
    expect(stepText({ status: "queued", currentStep: null })).toBe("Queued, starting shortly…");
    expect(stepText({ status: "finding_competitors", currentStep: null })).toBe("Finding competitors");
    expect(progressPercent({ progress: 88.4 })).toBe(88);
    expect(progressPercent({ progress: 140 })).toBe(100);
  });
});

function api(id: string, domain: string, score: number | null, extra: Partial<ApiCompanyResearch> = {}): ApiCompanyResearch {
  const pillar = (p: "seo" | "aeo" | "geo") => ({
    pillar: p,
    score,
    delta: 0,
    subMetrics: [{ key: `${p}-m`, label: "M", score, delta: 0 }],
    evidence: [{ id: `${id}-${p}-ev-0`, pillar: p, metricKey: `${p}-m`, text: "Observed.", sentiment: "neutral" as const }],
  });
  return {
    company: { id, name: id.toUpperCase(), domain, category: "Website Builder", logo: { mark: "W", bg: "#111111", fg: "#FFFFFF" }, tagline: null, linkedin: null, researchedAt: "2026-10-04T09:44:14.415Z" },
    pillars: { seo: pillar("seo"), aeo: pillar("aeo"), geo: pillar("geo") },
    aiVisibility: [],
    hiddenAssets: [],
    hiddenAssetsChecked: true,
    sources: [{ id: `${id}-src-0`, companyId: id, title: "Home", domain, url: `https://${domain}/`, type: "Company website", pillar: "seo" }],
    recommendations: [],
    competitors: [],
    ...extra,
  };
}

describe("buildComparison", () => {
  it("puts the subject first, then researched competitors in selection order, with real recommendations", async () => {
    const rec = { id: "wix-rec-0", impact: "high" as const, pillar: "seo" as const, title: "Earn citations", explanation: "x", metric: "SEO · Backlinks", current: 10, target: 100, action: "y" };
    const subject = api("wix", "wix.com", 80, {
      competitors: [
        { name: "Squarespace", domain: "squarespace.com" },
        { name: "Duda", domain: "duda.co" },
        { name: "Skipped", domain: "skipped.io" }, // not scored during research
      ],
      recommendations: [rec],
    });
    const c = buildComparison(subject, [api("duda", "duda.co", 60), api("squarespace", "squarespace.com", 70), api("skipped", "skipped.io", null)]);
    expect(c.companies.map((x) => x.company.id)).toEqual(["wix", "squarespace", "duda"]);
    expect(c).toMatchObject({ id: "cmp-wix", subjectId: "wix", category: "Website Builder", updatedAt: "2026-10-04", promptChecks: [] });
    expect(c.recommendations).toEqual([rec]);
    expect(c.insights.map((i) => i.title)).toContain("Ahead of competitors in search engines");
    expect(c.companies[0].aiVisibility).toEqual([]); // not measured, never invented
    // The subject's selected competitors, as the backend listed them (including one that couldn't be scored).
    expect(c.landscape).toEqual([{ companyId: "wix", competitors: subject.competitors }]);
  });

  it("works without competitors", () => {
    const c = buildComparison(api("solo", "solo.io", 50), []);
    expect(c.companies).toHaveLength(1);
    expect(c.insights.every((i) => !/competitor/i.test(i.title))).toBe(true);
  });

  it("rejects a subject that isn't fully scored", () => {
    expect(() => buildComparison(api("wix", "wix.com", null), [])).toThrow(IncompleteResultError);
    expect(toCompanyResearch(api("wix", "wix.com", null))).toBeNull();
  });

  it("maps an unknown source type to a generic one", () => {
    const c = toCompanyResearch(api("wix", "wix.com", 80, { sources: [{ id: "s", companyId: "wix", title: "t", domain: "d", url: "u", type: "Capterra", pillar: "geo" }] }));
    expect(c?.sources[0].type).toBe("Search result");
  });
});

describe("isCompanyResearch (API boundary)", () => {
  it("accepts a backend company, including unscored (null) values", () => {
    expect(isCompanyResearch(api("wix", "wix.com", 80, { competitors: [{ name: "Duda", domain: "duda.co" }] }))).toBe(true);
    expect(isCompanyResearch({ ...api("carrd", "carrd.co", null), company: { ...api("carrd", "carrd.co", null).company, researchedAt: null } })).toBe(true);
  });

  it("rejects a response missing fields the library and comparisons read", () => {
    const ok = api("wix", "wix.com", 80);
    const { competitors: _c, ...noCompetitors } = ok;
    void _c;
    for (const bad of [
      noCompetitors,
      { ...ok, competitors: [{ name: "Duda" }] },
      { ...ok, company: { ...ok.company, category: null } },
      { ...ok, company: { ...ok.company, logo: undefined } },
      { ...ok, pillars: { ...ok.pillars, geo: { ...ok.pillars.geo, score: "80" } } },
      { ...ok, pillars: { ...ok.pillars, seo: { ...ok.pillars.seo, evidence: [{ text: "x" }] } } },
      { ...ok, sources: [{ title: "Home" }] },
      { ...ok, aiVisibility: undefined },
      { ...ok, hiddenAssetsChecked: undefined },
      { ...ok, hiddenAssetsChecked: "yes" },
    ]) {
      expect(isCompanyResearch(bad)).toBe(false);
    }
  });
});

describe("comparison from GET /api/companies/:id/comparison", () => {
  afterEach(() => vi.unstubAllGlobals());

  const wix = api("wix", "wix.com", 80, {
    competitors: [
      { name: "Carrd", domain: "carrd.co" },
      { name: "Duda", domain: "duda.co" },
      { name: "Gone", domain: "gone.io" },
    ],
  });
  const carrd = api("carrd", "carrd.co", 40, { company: { ...api("carrd", "carrd.co", 40).company, category: "Landing Page Builder" } });
  const duda = api("wix--duda-co", "duda.co", 60);
  const body = {
    subject: wix,
    competitors: [
      { name: "Carrd", domain: "carrd.co", basis: "canonical", result: carrd },
      { name: "Duda", domain: "duda.co", basis: "comparison", result: duda },
      { name: "Gone", domain: "gone.io", basis: null, result: null },
    ],
  };

  it("validates the response at the boundary", () => {
    expect(isCompanyComparison(body)).toBe(true);
    expect(isCompanyComparison({ ...body, competitors: [{ ...body.competitors[0], basis: "guess" }] })).toBe(false);
    expect(isCompanyComparison({ ...body, competitors: [{ ...body.competitors[0], result: null }] })).toBe(false); // canonical without a result
    expect(isCompanyComparison({ ...body, competitors: [{ ...body.competitors[2], result: carrd }] })).toBe(false); // a result for an unscored competitor
    expect(isCompanyComparison({ ...body, subject: { company: {} } })).toBe(false);
    expect(isCompanyComparison({ subject: wix })).toBe(false);
  });

  it("shows canonical and comparison-only competitors in selection order; an unscored one is left out, not filled in", async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify({ success: true, data: body }), { status: 200, headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", fetch);
    const c = await loadComparison("wix");
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(String((fetch.mock.calls[0] as unknown[])[0])).toBe("/api/companies/wix/comparison");
    expect(c.companies.map((x) => [x.company.domain, x.company.category, x.pillars.seo.score])).toEqual([
      ["wix.com", "Website Builder", 80],
      ["carrd.co", "Landing Page Builder", 40], // Carrd's own research
      ["duda.co", "Website Builder", 60], // scored for Wix's comparison
    ]);
    expect(new Set(c.companies.map((x) => x.company.id)).size).toBe(3); // distinct ids for chart/list keys
  });

  it("keeps 'hidden assets not checked' distinct from 'none found'", () => {
    const c = buildComparison({ ...wix, competitors: [{ name: "Duda", domain: "duda.co" }] }, [{ ...duda, hiddenAssetsChecked: false }]);
    expect(c.companies.map((x) => [x.company.domain, x.hiddenAssets.length, x.hiddenAssetsChecked])).toEqual([
      ["wix.com", 0, true],
      ["duda.co", 0, false],
    ]);
  });
});
