import type { Comparison } from "@/lib/types";

/**
 * The competitors each company's research selected, as the backend listed them. Context only: kept
 * quiet so the main comparison stays the focus.
 */
export function Landscape({ comparison }: { comparison: Comparison }) {
  const entries = comparison.landscape ?? [];
  if (!entries.length) return null;
  const byId = new Map(comparison.companies.map((c) => [c.company.id, c.company]));
  const compared = new Set(comparison.companies.map((c) => c.company.domain));

  return (
    <section aria-labelledby="landscape-title" className="rounded-[16px] border border-line bg-canvas/60 p-5 sm:p-6">
      <p className="eyebrow">Competitors</p>
      <h2 id="landscape-title" className="mt-1.5 text-[17px] font-bold tracking-[-0.01em]">
        Competitive landscape
      </h2>
      <p className="mt-1 text-[12.5px] text-muted">The competitors each company&apos;s research selected in its category.</p>

      <div className={`mt-4 grid gap-4 ${entries.length > 1 ? "md:grid-cols-2" : ""}`}>
        {entries.map((e) => {
          const company = byId.get(e.companyId);
          if (!company) return null;
          return (
            <div key={e.companyId} className="min-w-0">
              <p className="text-[13px] font-semibold text-ink-2">{company.name}&apos;s competitors</p>
              {e.competitors.length ? (
                <ul className="mt-2 flex flex-wrap gap-2">
                  {e.competitors.map((c) => (
                    <li key={c.domain} className="flex min-w-0 max-w-full flex-wrap items-baseline gap-x-1.5 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-[12.5px]">
                      <span className="font-semibold">{c.name}</span>
                      <span className="min-w-0 font-mono text-[11.5px] text-muted [overflow-wrap:anywhere]">{c.domain}</span>
                      {compared.has(c.domain) && <span className="rounded bg-accent-soft px-1 text-[10px] font-bold text-accent-ink">In this comparison</span>}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-[12.5px] text-muted">No competitors were selected in this research.</p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
