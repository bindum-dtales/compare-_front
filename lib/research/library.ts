// The company library and the comparisons in it, derived from GET /api/companies. Pure.
//
// A comparison is what a research run produces: a researched company and the competitors selected
// for it (ApiCompanyResearch.competitors). Companies researched only as someone's competitor have no
// competitors of their own, so they appear in the library but don't start a comparison.

import type { ApiCompanyResearch } from "../api/types";
import type { CompanyResearch, ComparisonSummary } from "../types";
import { toCompanyResearch } from "./comparison";
import { normalizeDomain } from "./validation";

const researchedAt = (c: ApiCompanyResearch) => c.company.researchedAt ?? "";
const newestFirst = (a: ApiCompanyResearch, b: ApiCompanyResearch) => researchedAt(b).localeCompare(researchedAt(a));

/** Fully researched companies (researchedAt set, every score present), most recent first. */
export function toLibrary(companies: ApiCompanyResearch[]): CompanyResearch[] {
  return companies
    .filter((c) => c.company.researchedAt)
    .sort(newestFirst)
    .map(toCompanyResearch)
    .filter((c): c is CompanyResearch => !!c);
}

/** One per researched company that had competitors selected, most recent first. */
export function toComparisonSummaries(companies: ApiCompanyResearch[]): ComparisonSummary[] {
  return companies
    .filter((c) => c.company.researchedAt && c.competitors.length > 0 && toCompanyResearch(c))
    .sort(newestFirst)
    .map((c) => ({
      id: `cmp-${c.company.id}`,
      subjectId: c.company.id,
      subject: c.company.name,
      competitors: c.competitors.map((x) => x.name),
      category: c.company.category,
      updatedAt: researchedAt(c).slice(0, 10),
      status: "complete" as const,
    }));
}

/** The most recently researched comparison's subject, for the dashboard's first view; null when there is none. */
export function latestSubjectId(companies: ApiCompanyResearch[]): string | null {
  return toComparisonSummaries(companies)[0]?.subjectId ?? null;
}

/**
 * The library company a typed name + website refer to: its domain must match and so must its name
 * (ignoring case and surrounding spaces), so a company is never shown next to another one's website.
 */
export function findLibraryCompany(library: CompanyResearch[], input: { companyName: string; domain: string }): CompanyResearch | null {
  const domain = normalizeDomain(input.domain);
  const name = input.companyName.trim().toLowerCase();
  if (!domain || !name) return null;
  return library.find((c) => c.company.domain === domain && c.company.name.trim().toLowerCase() === name) ?? null;
}

/** Library companies matching what's typed (all of them, most recent first, while it's empty). Suggestions only. */
export function suggestCompanies(library: CompanyResearch[], query: string, excludeDomain: string | null, max = 6): CompanyResearch[] {
  const q = query.trim().toLowerCase();
  return library
    .filter((c) => c.company.domain !== excludeDomain)
    .filter((c) => !q || c.company.name.toLowerCase().includes(q) || c.company.domain.includes(q))
    .slice(0, max);
}

/**
 * The field's value after the user edits the company name. `picked` is what a library suggestion
 * last filled in: while the website is still the one it filled, a different name is a different
 * company, so that website is cleared. A website the user typed is always kept.
 */
export function editCompanyName(value: { companyName: string; domain: string }, companyName: string, picked: { companyName: string; domain: string } | null) {
  const fromPick = !!picked && value.companyName === picked.companyName && value.domain === picked.domain;
  return { companyName, domain: fromPick ? "" : value.domain };
}
