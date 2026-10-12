import { describe, expect, it } from "vitest";
import { formatGap, formatScore, largestGaps, pillarStandings, pillarWins, splitScore } from "./scoreboard";
import type { CompanyResearch, Pillar } from "../types";

/** Wix and Webflow as the backend returned them (2026-10-08). */
const company = (id: string, scores: Record<Pillar, [number, Record<string, number>]>): CompanyResearch => ({
  company: { id, name: id, domain: `${id}.com`, category: "Website Builder", logo: { mark: "W", bg: "#000", fg: "#fff" } },
  pillars: Object.fromEntries(
    (Object.keys(scores) as Pillar[]).map((p) => [
      p,
      { pillar: p, score: scores[p][0], delta: 0, evidence: [], subMetrics: Object.entries(scores[p][1]).map(([key, score]) => ({ key, label: key, score, delta: 0 })) },
    ]),
  ) as unknown as CompanyResearch["pillars"],
  aiVisibility: [],
  hiddenAssets: [],
  hiddenAssetsChecked: false,
  sources: [],
});
const WIX = company("wix", {
  seo: [85, { technical: 100, content: 100, backlinks: 40, ranking: 100 }],
  aeo: [84.75, { structured: 67, directAnswer: 72, snippet: 100, crawlability: 100 }],
  geo: [79.25, { thirdParty: 50, brandScale: 100, freshness: 100, clarity: 67 }],
});
const WEBFLOW = company("webflow", {
  seo: [77.5, { technical: 100, content: 40, backlinks: 70, ranking: 100 }],
  aeo: [81.75, { structured: 33, directAnswer: 94, snippet: 100, crawlability: 100 }],
  geo: [68.75, { thirdParty: 75, brandScale: 100, freshness: 33, clarity: 67 }],
});

describe("score formatting (display only)", () => {
  it("shows backend values exactly, splitting off the decimals", () => {
    expect([85, 84.75, 77.5].map(formatScore)).toEqual(["85", "84.75", "77.5"]);
    expect(splitScore(84.75)).toEqual({ whole: "84", fraction: ".75" });
    expect(splitScore(85)).toEqual({ whole: "85", fraction: "" });
  });

  it("formats gaps without float noise", () => {
    expect(0.3 - 0.1).not.toBe(0.2);
    expect(formatGap(84.75, 81.75)).toBe("3");
    expect(formatGap(68.75, 79.25)).toBe("10.5");
    expect(formatGap(0.3, 0.1)).toBe("0.2");
  });
});

describe("pillarStandings", () => {
  it("names the leader and margin of each pillar from the real scores", () => {
    const s = pillarStandings([WIX, WEBFLOW]);
    expect(s.map((x) => [x.pillar, x.leader, x.margin])).toEqual([
      ["seo", 0, 7.5],
      ["aeo", 0, 3],
      ["geo", 0, 10.5],
    ]);
    expect(s[0]!.scores.map((x) => x.score)).toEqual([85, 77.5]); // untouched
    expect(pillarWins(s, 2)).toEqual([3, 0]);
  });

  it("reports a tie, and no leader for a single company", () => {
    const tied = company("tied", { seo: [85, {}], aeo: [90, {}], geo: [0, {}] });
    const s = pillarStandings([WIX, tied]);
    expect(s.map((x) => [x.leader, x.margin])).toEqual([
      [null, null],
      [1, 5.25],
      [0, 79.25],
    ]);
    expect(pillarStandings([WIX]).every((x) => x.leader === null)).toBe(true);
  });

  it("with several companies, the margin is over the runner-up", () => {
    const third = company("third", { seo: [80, {}], aeo: [90, {}], geo: [70, {}] });
    expect(pillarStandings([WIX, WEBFLOW, third]).map((x) => [x.leader, x.margin])).toEqual([
      [0, 5],
      [2, 5.25],
      [0, 9.25],
    ]);
  });
});

describe("largestGaps", () => {
  it("ranks real sub-metric differences, largest first, skipping equal ones", () => {
    expect(largestGaps(WIX, WEBFLOW, 4)).toEqual([
      { pillar: "geo", key: "freshness", label: "freshness", a: 100, b: 33, gap: 67, leader: 0 },
      { pillar: "seo", key: "content", label: "content", a: 100, b: 40, gap: 60, leader: 0 },
      { pillar: "aeo", key: "structured", label: "structured", a: 67, b: 33, gap: 34, leader: 0 },
      { pillar: "seo", key: "backlinks", label: "backlinks", a: 40, b: 70, gap: 30, leader: 1 },
    ]);
    expect(largestGaps(WIX, WIX, 4)).toEqual([]);
  });
});

describe("insights use exact scores", () => {
  it("compares with the rival by name, without rounding (Wix vs Webflow)", async () => {
    const { deriveInsights } = await import("../insights");
    const details = deriveInsights(WIX, [WEBFLOW]).map((i) => i.detail);
    expect(details.slice(0, 3)).toEqual([
      "wix scores 85 on SEO, 7.5 points above webflow (77.5).",
      "wix scores 84.75 on AEO, 3 points above webflow (81.75).",
      "wix scores 79.25 on GEO, 10.5 points above webflow (68.75).",
    ]);
  });
});
