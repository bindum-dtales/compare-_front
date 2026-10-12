// Typed calls to the backend's research and company endpoints. Components and hooks use these,
// never fetch() directly.

import { apiRequest, type RequestOptions } from "./client";
import { JOB_STATUSES, type ApiCompanyComparison, type ApiCompanyResearch, type ResearchJob, type ResearchRequest, type StartResearchResult } from "./types";

const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const isStringOrNull = (v: unknown) => v === null || typeof v === "string";

export function isResearchJob(v: unknown): v is ResearchJob {
  return (
    isObject(v) &&
    typeof v.id === "string" &&
    typeof v.companyName === "string" &&
    typeof v.domain === "string" &&
    (JOB_STATUSES as readonly unknown[]).includes(v.status) &&
    typeof v.progress === "number" &&
    isStringOrNull(v.currentStep) &&
    isStringOrNull(v.companyId) &&
    (v.error === null || (isObject(v.error) && typeof v.error.code === "string" && typeof v.error.message === "string"))
  );
}

const isNumberOrNull = (v: unknown) => v === null || typeof v === "number";
const isStr = (v: unknown) => typeof v === "string";
const PILLAR_IDS = ["seo", "aeo", "geo"];
const isPillarId = (v: unknown) => PILLAR_IDS.includes(v as string);
const isArrayOf = (v: unknown, item: (x: Record<string, unknown>) => boolean) => Array.isArray(v) && v.every((x) => isObject(x) && item(x));

const isPillarResult = (p: unknown) =>
  isObject(p) &&
  isNumberOrNull(p.score) &&
  typeof p.delta === "number" &&
  isArrayOf(p.subMetrics, (m) => isStr(m.key) && isStr(m.label) && isNumberOrNull(m.score) && typeof m.delta === "number") &&
  isArrayOf(p.evidence, (e) => isStr(e.id) && isPillarId(e.pillar) && isStr(e.metricKey) && isStr(e.text) && ["positive", "neutral", "negative"].includes(e.sentiment as string));

/** Checks every field the UI reads, so a contract change fails at the boundary, not inside a page. */
export function isCompanyResearch(v: unknown): v is ApiCompanyResearch {
  if (!isObject(v) || !isObject(v.company) || !isObject(v.pillars)) return false;
  const { company, pillars } = v;
  return (
    isStr(company.id) &&
    isStr(company.name) &&
    isStr(company.domain) &&
    isStr(company.category) &&
    isObject(company.logo) &&
    isStr(company.logo.mark) &&
    isStr(company.logo.bg) &&
    isStr(company.logo.fg) &&
    isStringOrNull(company.researchedAt) &&
    PILLAR_IDS.every((p) => isPillarResult(pillars[p])) &&
    isArrayOf(v.aiVisibility, (a) => isStr(a.engine) && typeof a.mentionRate === "number" && typeof a.citations === "number") &&
    isArrayOf(v.hiddenAssets, (a) => isStr(a.id) && isStr(a.url) && isStr(a.foundIn) && isStr(a.issue) && isStr(a.kind) && isStr(a.severity)) &&
    typeof v.hiddenAssetsChecked === "boolean" &&
    isArrayOf(v.sources, (s) => isStr(s.id) && isStr(s.title) && isStr(s.domain) && isStr(s.url) && isStr(s.type) && isPillarId(s.pillar)) &&
    isArrayOf(v.recommendations, (r) => isStr(r.id) && isStr(r.title) && isPillarId(r.pillar) && typeof r.current === "number" && typeof r.target === "number") &&
    isArrayOf(v.competitors, (c) => isStr(c.name) && isStr(c.domain))
  );
}

function isStartResult(v: unknown): v is StartResearchResult {
  if (!isObject(v)) return false;
  if (v.status === "existing") return isCompanyResearch(v.company);
  return (v.status === "queued" || v.status === "in_progress") && isResearchJob(v.job);
}

const isCompanyList = (v: unknown): v is ApiCompanyResearch[] => Array.isArray(v) && v.every(isCompanyResearch);

/** A competitor's result must match its basis: a result exactly when it was scored. */
export function isCompanyComparison(v: unknown): v is ApiCompanyComparison {
  return (
    isObject(v) &&
    isCompanyResearch(v.subject) &&
    isArrayOf(
      v.competitors,
      (c) =>
        isStr(c.name) &&
        isStr(c.domain) &&
        (c.basis === null ? c.result === null : (c.basis === "canonical" || c.basis === "comparison") && isCompanyResearch(c.result)),
    )
  );
}

/** POST /api/research. The backend normalizes the domain and returns an existing result or a job to poll. */
export function startResearch(req: ResearchRequest, opts: Pick<RequestOptions, "signal"> = {}) {
  return apiRequest("/api/research", isStartResult, { method: "POST", body: req, ...opts });
}

/** GET /api/research/:jobId. */
export function getResearchJob(jobId: string, opts: Pick<RequestOptions, "signal"> = {}) {
  return apiRequest(`/api/research/${encodeURIComponent(jobId)}`, isResearchJob, opts);
}

/** GET /api/companies/:id. */
export function getCompany(id: string, opts: Pick<RequestOptions, "signal"> = {}) {
  return apiRequest(`/api/companies/${encodeURIComponent(id)}`, isCompanyResearch, opts);
}

/** GET /api/companies. */
export function listCompanies(opts: Pick<RequestOptions, "signal"> = {}) {
  return apiRequest("/api/companies", isCompanyList, opts);
}

/** GET /api/companies/:id/comparison. */
export function getCompanyComparison(id: string, opts: Pick<RequestOptions, "signal"> = {}) {
  return apiRequest(`/api/companies/${encodeURIComponent(id)}/comparison`, isCompanyComparison, opts);
}
