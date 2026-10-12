"use client";

import { useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { useAppState } from "@/components/layout/app-state";
import { ResearchProgress } from "@/components/research/research-progress";
import type { ResearchRequest } from "@/lib/api/types";
import { retryRequests, validatePair, type Pair } from "@/lib/research/head-to-head";
import { findLibraryCompany } from "@/lib/research/library";
import { normalizeDomain, type ResearchInput } from "@/lib/research/validation";
import { CompareProgress } from "./compare-progress";
import { CompanyField } from "./company-field";

const EMPTY: Pair<ResearchInput> = [
  { companyName: "", domain: "" },
  { companyName: "", domain: "" },
];

/**
 * Example pairs: they fill both sides (with the library's own name for a company already researched);
 * the comparison only starts on "Compare".
 */
const EXAMPLES: Pair<ResearchInput>[] = [
  [
    { companyName: "Wix", domain: "wix.com" },
    { companyName: "Webflow", domain: "webflow.com" },
  ],
  [
    { companyName: "HubSpot", domain: "hubspot.com" },
    { companyName: "Salesforce", domain: "salesforce.com" },
  ],
  [
    { companyName: "Notion", domain: "notion.so" },
    { companyName: "Coda", domain: "coda.io" },
  ],
];

const LABELS = ["Company 1", "Company 2"] as const;

export function CompareForm() {
  const { library, compare, startCompare, dismissCompare, research, startResearch, dismissResearch, busy } = useAppState();
  const [values, setValues] = useState<Pair<ResearchInput>>(EMPTY);
  const [attempted, setAttempted] = useState(false);

  // While a comparison runs (or after one is restored on reload) the fields show its companies.
  const runKey = compare.phase === "idle" ? null : compare.sides[0].request;
  const [shownRun, setShownRun] = useState<ResearchRequest | null>(null);
  if (runKey !== shownRun) {
    setShownRun(runKey);
    if (compare.phase !== "idle") setValues(compare.sides.map(({ request: r }) => ({ companyName: r.companyName, domain: r.domain })) as Pair<ResearchInput>);
  }

  const checked = validatePair(values);
  const companies = library.status === "ready" ? library.data.companies : [];
  const domains = values.map((v) => normalizeDomain(v.domain));
  // Shown as a library company only when name and website are both that company's.
  const selected = values.map((v) => findLibraryCompany(companies, v)?.company ?? null);
  const owners = domains.map((d, i) => (selected[i] || !d ? null : (companies.find((c) => c.company.domain === d)?.company ?? null)));
  const canonical = (v: ResearchInput): ResearchInput => {
    const c = companies.find((x) => x.company.domain === v.domain)?.company;
    return c ? { companyName: c.name, domain: c.domain } : v;
  };
  const running = compare.phase === "running";
  const preparing = running && compare.sides.every((s) => !s.job && !s.ready);

  async function submit() {
    setAttempted(true);
    if (busy || !checked.value) return;
    if (await startCompare(checked.value)) {
      setAttempted(false);
      requestAnimationFrame(() => document.getElementById("results")?.scrollIntoView({ behavior: "smooth", block: "start" }));
    }
  }

  const set = (i: 0 | 1) => (v: ResearchInput) => {
    if (compare.phase === "failed") dismissCompare();
    setValues((cur) => (i === 0 ? [v, cur[1]] : [cur[0], v]));
  };

  const field = (i: 0 | 1) => (
    <CompanyField
      label={LABELS[i]}
      value={values[i]}
      onChange={set(i)}
      errors={checked.errors?.[i] ?? {}}
      showErrors={attempted}
      valid={!checked.errors?.[i]?.companyName && !checked.errors?.[i]?.domain && !!values[i].companyName.trim() && !!domains[i]}
      selected={selected[i]}
      domainOwner={owners[i]}
      library={companies}
      excludeDomain={domains[1 - i]}
      disabled={busy}
    />
  );

  const ready = !!checked.value && !busy;

  return (
    <div className="space-y-4">
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="rounded-[20px] border border-line bg-surface shadow-[0_1px_2px_rgb(15_23_42_/_0.04),0_24px_48px_-28px_rgb(15_23_42_/_0.20)]"
        aria-label="Compare two companies"
      >
        <div className="grid px-4 pb-5 pt-5 sm:px-6 sm:pt-6 md:grid-cols-[minmax(0,1fr)_56px_minmax(0,1fr)] md:px-7 md:pb-7 lg:grid-cols-[minmax(0,1fr)_72px_minmax(0,1fr)]">
          {field(0)}
          {/* VS: between the stacked fields on mobile; centred on the two input boxes from md up. */}
          <div className="flex items-center gap-3 py-4 md:block md:py-0 md:pt-7" aria-hidden>
            <span className="h-px flex-1 bg-line md:hidden" />
            <div className="relative grid place-items-center md:h-[99px]">
              <span className="absolute inset-y-0 left-1/2 hidden w-px -translate-x-1/2 bg-[linear-gradient(transparent,var(--color-line)_25%,var(--color-line)_75%,transparent)] md:block" />
              <span className="relative grid size-9 place-items-center rounded-full border border-line bg-surface text-[10.5px] font-extrabold tracking-[0.08em] text-ink-2">VS</span>
            </div>
            <span className="h-px flex-1 bg-line md:hidden" />
          </div>
          {field(1)}
        </div>

        <div className="flex flex-col-reverse gap-4 rounded-b-[20px] border-t border-line bg-canvas/50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 md:px-7">
          <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1.5 text-[12.5px]">
            <span className="text-faint">Try</span>
            {EXAMPLES.map((pair) => {
              const [a, b] = pair.map(canonical);
              return (
                <button
                  key={a.domain}
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    if (compare.phase === "failed") dismissCompare();
                    setValues([a, b]);
                    setAttempted(false);
                  }}
                  className="rounded text-muted underline decoration-line-strong decoration-1 underline-offset-[5px] transition-colors hover:text-ink hover:decoration-ink disabled:pointer-events-none disabled:opacity-50"
                >
                  {a.companyName} vs {b.companyName}
                </button>
              );
            })}
          </div>
          <button
            type="submit"
            disabled={!ready}
            aria-busy={running || undefined}
            aria-describedby={!checked.value && !busy ? "compare-hint" : undefined}
            className={`group flex h-12 w-full shrink-0 items-center justify-center gap-2 rounded-[12px] px-7 text-[14.5px] font-semibold transition-all sm:w-auto sm:min-w-[184px] ${
              ready
                ? "bg-accent text-white shadow-[0_1px_0_rgb(255_255_255_/_0.14)_inset,0_6px_16px_-6px_rgb(37_99_235_/_0.55)] hover:-translate-y-px hover:bg-accent-strong active:translate-y-0 active:scale-[0.985]"
                : running
                  ? "cursor-wait bg-accent text-white"
                  : "cursor-not-allowed border border-line bg-surface text-faint"
            }`}
          >
            {running ? (
              <>
                <Loader2 className="size-4 animate-spin" /> {preparing ? "Preparing comparison…" : "Comparing…"}
              </>
            ) : (
              <>
                Compare <ArrowRight className={`size-4 transition-transform ${ready ? "group-hover:translate-x-0.5" : ""}`} />
              </>
            )}
          </button>
          <span id="compare-hint" className="sr-only">
            Enter two different companies, each with its website, to compare.
          </span>
        </div>
      </form>

      {compare.phase !== "idle" && (
        <CompareProgress
          run={compare}
          onRetry={() => startCompare(retryRequests(compare.sides))}
          onDismiss={dismissCompare}
        />
      )}

      {/* A single company's "Re-run research" (from a comparison's menu) reports here too. */}
      {research.phase !== "idle" && (
        <ResearchProgress
          run={research}
          onRetry={() => {
            const request = research.request;
            dismissResearch();
            startResearch(request);
          }}
          onDismiss={dismissResearch}
        />
      )}
    </div>
  );
}
