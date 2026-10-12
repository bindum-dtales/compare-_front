"use client";

import { useState } from "react";
import { ArrowRight, Globe, Loader2, Search } from "lucide-react";
import { useAppState } from "@/components/layout/app-state";
import { ResearchProgress } from "@/components/research/research-progress";
import { validateResearchInput, type ResearchInputErrors } from "@/lib/research/validation";

/** Quick picks: they fill the form; research only starts when the user submits. */
const POPULAR = [
  { name: "DTales Tech", domain: "dtales.tech" },
  { name: "HubSpot", domain: "hubspot.com" },
  { name: "Webflow", domain: "webflow.com" },
  { name: "Notion", domain: "notion.so" },
  { name: "Vercel", domain: "vercel.com" },
];

export function CompanySearch({ onDone }: { onDone?: () => void }) {
  const { opening, comparison, research, startResearch, dismissResearch, busy } = useAppState();
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [errors, setErrors] = useState<ResearchInputErrors>({});
  const subject = comparison?.companies[0].company.name;

  /** `force`: a retry of a failed "Re-run research" re-runs again rather than loading the kept result. */
  async function submit(input = { companyName: name, domain }, force = false) {
    if (busy) return;
    const checked = validateResearchInput(input);
    if (checked.errors) {
      setErrors(checked.errors);
      return;
    }
    setErrors({});
    if (await startResearch(force ? { ...checked.value, force } : checked.value)) onDone?.();
  }

  const field = "h-11 w-full min-w-0 bg-transparent text-[14.5px] outline-none placeholder:text-faint disabled:opacity-60";

  return (
    <div>
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="flex flex-col gap-2 rounded-[16px] border border-line bg-surface p-2 shadow-lift sm:flex-row sm:items-center"
      >
        <label className="flex min-w-0 flex-1 items-center gap-3 px-3">
          <Search className="size-[18px] shrink-0 text-muted" />
          <span className="sr-only">Company name</span>
          <input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (errors.companyName) setErrors((x) => ({ ...x, companyName: undefined }));
            }}
            disabled={busy}
            autoComplete="organization"
            placeholder="Company name (e.g. DTales Tech)"
            aria-invalid={!!errors.companyName}
            aria-describedby={errors.companyName ? "name-error" : undefined}
            className={field}
          />
        </label>
        <span className="mx-3 h-px bg-line sm:mx-0 sm:h-7 sm:w-px" aria-hidden />
        <label className="flex min-w-0 flex-1 items-center gap-3 px-3">
          <Globe className="size-[18px] shrink-0 text-muted" />
          <span className="sr-only">Company website</span>
          <input
            value={domain}
            onChange={(e) => {
              setDomain(e.target.value);
              if (errors.domain) setErrors((x) => ({ ...x, domain: undefined }));
            }}
            disabled={busy}
            inputMode="url"
            autoComplete="url"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="Website (e.g. dtales.tech)"
            aria-invalid={!!errors.domain}
            aria-describedby={errors.domain ? "domain-error" : undefined}
            className={field}
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="flex h-12 shrink-0 items-center justify-center gap-2 rounded-[12px] bg-accent px-6 text-[14px] font-semibold text-ink transition-all hover:bg-accent-strong active:scale-[0.98] disabled:cursor-wait disabled:opacity-90"
        >
          {busy ? (
            <>
              <Loader2 className="size-4 animate-spin" /> {opening ? "Loading…" : research.phase === "submitting" ? "Starting…" : "Researching…"}
            </>
          ) : (
            <>
              Analyze Company <ArrowRight className="size-4" />
            </>
          )}
        </button>
      </form>

      {(errors.companyName || errors.domain) && (
        <div className="mt-2 space-y-0.5 px-1 text-[13px] text-bad">
          {errors.companyName && <p id="name-error">{errors.companyName}</p>}
          {errors.domain && <p id="domain-error">{errors.domain}</p>}
        </div>
      )}

      {research.phase !== "idle" ? (
        <ResearchProgress
          run={research}
          onRetry={() => {
            const { companyName, domain: d, force } = research.request;
            setName(companyName);
            setDomain(d);
            dismissResearch();
            submit({ companyName, domain: d }, force === true);
          }}
          onDismiss={dismissResearch}
        />
      ) : opening ? (
        <p className="mt-4 flex items-center gap-2 text-[13px] font-medium text-ink" role="status" aria-live="polite">
          <Loader2 className="size-3.5 animate-spin text-accent-strong" /> Loading {opening.name} from your library…
        </p>
      ) : (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="mr-1 text-[13px] text-muted">Popular:</span>
          {POPULAR.map((p) => {
            const active = p.name === subject;
            return (
              <button
                key={p.name}
                type="button"
                onClick={() => {
                  setName(p.name);
                  setDomain(p.domain);
                  setErrors({});
                }}
                aria-pressed={active}
                className={`rounded-full border px-3.5 py-1.5 text-[12.5px] font-medium transition-all hover:-translate-y-px ${
                  active ? "border-accent-strong bg-accent-soft text-ink" : "border-line bg-surface text-ink-2 hover:border-line-strong hover:text-ink"
                }`}
              >
                {p.name}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
