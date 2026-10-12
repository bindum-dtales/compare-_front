// The only module the UI imports library / comparison / export data from.
//
// Normal mode reads real research from the backend (lib/api). Demo mode (NEXT_PUBLIC_DEMO_DATA=1)
// serves the bundled sample companies instead, e.g. for a walkthrough without research credits.
// Both return the same UI types (lib/types.ts), so components don't know which is in use.
import { listCompanies as fetchCompanies } from "../api/research";
import { loadComparison } from "../research/comparison";
import { latestSubjectId, toComparisonSummaries, toLibrary } from "../research/library";
import { COMPANY_SEEDS } from "../mock-data/companies";
import { buildComparison } from "../mock-data/build";
import { EXPORT_HISTORY, SAVED_COMPARISONS } from "../mock-data/history";
import type { CompanyResearch, Comparison, ComparisonSummary, ExportRecord } from "../types";

export const DEMO_DATA = process.env.NEXT_PUBLIC_DEMO_DATA === "1";

const DEMO_SUBJECT = "DTales Tech";

export interface LibrarySnapshot {
  companies: CompanyResearch[];
  comparisons: ComparisonSummary[];
  /** Subject of the most recent comparison, for the dashboard's first view. */
  latestSubjectId: string | null;
}

/** Researched companies and the comparisons they form, from one GET /api/companies. */
export async function getLibrary(opts: { signal?: AbortSignal } = {}): Promise<LibrarySnapshot> {
  if (DEMO_DATA) {
    return { companies: COMPANY_SEEDS.map((s) => buildComparison(s.name).companies[0]), comparisons: SAVED_COMPARISONS, latestSubjectId: "dtales" };
  }
  const companies = await fetchCompanies(opts);
  return { companies: toLibrary(companies), comparisons: toComparisonSummaries(companies), latestSubjectId: latestSubjectId(companies) };
}

/** A company with its competitors, ready for the dashboard. `name` is used by demo mode only. */
export async function getComparison(ref: { id: string; name: string }, opts: { signal?: AbortSignal } = {}): Promise<Comparison> {
  if (DEMO_DATA) return buildComparison(ref.name);
  return loadComparison(ref.id, opts);
}

/** Demo mode's sample export history; real exports are recorded as they're made (in this browser). */
export const initialExports: ExportRecord[] = DEMO_DATA ? EXPORT_HISTORY : [];

/** Demo mode's dashboard on first render, so it never flashes empty. Null in normal mode (loaded from the backend). */
export const initialComparison: Comparison | null = DEMO_DATA ? buildComparison(DEMO_SUBJECT) : null;
