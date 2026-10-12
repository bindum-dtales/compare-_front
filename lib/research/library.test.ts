import { afterEach, describe, expect, it, vi } from "vitest";
import type { ApiCompanyResearch } from "../api/types";
import { getComparison, getLibrary, initialComparison, initialExports } from "../services/research";
import { parseExports, sizeLabel } from "./exports";
import { findLibraryCompany, latestSubjectId, toComparisonSummaries, toLibrary } from "./library";

function company(id: string, domain: string, opts: { score?: number | null; researchedAt?: string | null; competitors?: { name: string; domain: string }[] } = {}): ApiCompanyResearch {
  const score = opts.score === undefined ? 70 : opts.score;
  const pillar = (p: "seo" | "aeo" | "geo") => ({ pillar: p, score, delta: 0, subMetrics: [{ key: `${p}-m`, label: "M", score, delta: 0 }], evidence: [] });
  return {
    company: {
      id,
      name: id[0]!.toUpperCase() + id.slice(1),
      domain,
      category: "Website Builder",
      logo: { mark: id[0]!.toUpperCase(), bg: "#111111", fg: "#FFFFFF" },
      tagline: null,
      linkedin: null,
      researchedAt: opts.researchedAt === undefined ? "2026-10-04T09:00:00.000Z" : opts.researchedAt,
    },
    pillars: { seo: pillar("seo"), aeo: pillar("aeo"), geo: pillar("geo") },
    aiVisibility: [],
    hiddenAssets: [],
    hiddenAssetsChecked: true,
    sources: [],
    recommendations: [],
    competitors: opts.competitors ?? [],
  };
}

const WIX = company("wix", "wix.com", { researchedAt: "2026-10-04T09:44:14Z", competitors: [{ name: "Duda", domain: "duda.co" }, { name: "Squarespace", domain: "squarespace.com" }] });
const FRAMER = company("framer", "framer.com", { researchedAt: "2026-10-04T08:07:46Z", competitors: [{ name: "Webflow", domain: "webflow.com" }] });
const DUDA = company("duda", "duda.co", { researchedAt: "2026-10-04T09:44:17Z" });
const CARRD = company("carrd", "carrd.co", { researchedAt: null, score: 60, competitors: [{ name: "Wix", domain: "wix.com" }] }); // evidence failed: not complete
const HALF = company("half", "half.io", { score: null, researchedAt: "2026-10-04T10:00:00Z" });
const ALL = [FRAMER, DUDA, CARRD, WIX, HALF];

describe("library derivations (GET /api/companies)", () => {
  it("lists only fully researched companies, newest first", () => {
    expect(toLibrary(ALL).map((c) => c.company.id)).toEqual(["duda", "wix", "framer"]);
  });

  it("forms a comparison for each researched company that had competitors, newest first", () => {
    expect(toComparisonSummaries(ALL)).toEqual([
      { id: "cmp-wix", subjectId: "wix", subject: "Wix", competitors: ["Duda", "Squarespace"], category: "Website Builder", updatedAt: "2026-10-04", status: "complete" },
      { id: "cmp-framer", subjectId: "framer", subject: "Framer", competitors: ["Webflow"], category: "Website Builder", updatedAt: "2026-10-04", status: "complete" },
    ]);
  });

  it("picks the most recent comparison for the dashboard, or none", () => {
    expect(latestSubjectId(ALL)).toBe("wix");
    expect(latestSubjectId([DUDA, CARRD])).toBeNull();
    expect(toLibrary([])).toEqual([]);
  });
});

describe("services/research in normal mode (real backend data)", () => {
  afterEach(() => vi.unstubAllGlobals());
  const serve = (routes: Record<string, unknown>) =>
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        const data = routes[url];
        return data === undefined ? new Response(JSON.stringify({ success: false, error: { code: "NOT_FOUND", message: "Not found." } }), { status: 404 }) : new Response(JSON.stringify({ success: true, data }), { status: 200 });
      }),
    );

  it("starts empty: no sample comparison, exports or companies", () => {
    expect(initialComparison).toBeNull();
    expect(initialExports).toEqual([]);
  });

  it("builds the library snapshot from one GET /api/companies", async () => {
    serve({ "/api/companies": ALL });
    const lib = await getLibrary();
    expect(lib.companies.map((c) => c.company.id)).toEqual(["duda", "wix", "framer"]);
    expect(lib.comparisons.map((c) => c.subjectId)).toEqual(["wix", "framer"]);
    expect(lib.latestSubjectId).toBe("wix");
  });

  it("opens a comparison with the real subject and its researched competitors", async () => {
    serve({
      "/api/companies/wix/comparison": {
        subject: WIX,
        competitors: [
          { name: "Duda", domain: "duda.co", basis: "canonical", result: DUDA },
          { name: "Squarespace", domain: "squarespace.com", basis: null, result: null }, // not scored
        ],
      },
    });
    const c = await getComparison({ id: "wix", name: "Wix" });
    expect(c.companies.map((x) => x.company.id)).toEqual(["wix", "duda"]);
  });

  it("surfaces the backend's message when a company is missing", async () => {
    serve({});
    await expect(getComparison({ id: "nope", name: "Nope" })).rejects.toMatchObject({ message: "Not found." });
  });
});

describe("export history (this browser)", () => {
  const rec = (id: string, createdAt: string) => ({ id, title: "Wix vs 2 competitors", format: "CSV", createdAt, size: "4 KB" });

  it("keeps valid records newest first and drops anything unreadable", () => {
    const raw = JSON.stringify([rec("a", "2026-10-01T10:00:00Z"), { id: "b", format: "DOCX" }, rec("c", "2026-10-04T10:00:00Z"), rec("d", "not a date"), null]);
    expect(parseExports(raw).map((r) => r.id)).toEqual(["c", "a"]);
    expect(parseExports("{broken")).toEqual([]);
    expect(parseExports(null)).toEqual([]);
    expect(parseExports('{"not":"an array"}')).toEqual([]);
  });

  it("labels sizes without inventing one for printed PDFs", () => {
    expect(sizeLabel(18_500)).toBe("18 KB");
    expect(sizeLabel(10)).toBe("1 KB");
    expect(sizeLabel(null)).toBe("—");
  });
});

describe("findLibraryCompany", () => {
  const library = toLibrary([company("vercel", "vercel.com"), company("webflow", "webflow.com")]);

  it("matches when both the name and the website are that company's", () => {
    expect(findLibraryCompany(library, { companyName: " vercel ", domain: "https://www.vercel.com/" })?.company.id).toBe("vercel");
  });

  it("never pairs a company with another one's website", () => {
    expect(findLibraryCompany(library, { companyName: "Vercel", domain: "webflow.com" })).toBeNull();
    expect(findLibraryCompany(library, { companyName: "Webflow", domain: "vercel.com" })).toBeNull();
    expect(findLibraryCompany(library, { companyName: "", domain: "vercel.com" })).toBeNull();
  });
});
