import { Check, Sparkles, X } from "lucide-react";
import { CompanyLogo } from "@/components/ui/company-logo";
import type { Comparison } from "@/lib/types";

/** Opacity-scaled purple cell; text flips to white on dark cells. */
function heat(rate: number) {
  const a = 0.08 + (rate / 100) * 0.82;
  return { background: `rgb(124 77 255 / ${a})`, color: a > 0.5 ? "#fff" : "#334155" };
}

export function AiVisibility({ comparison }: { comparison: Comparison }) {
  const { companies, promptChecks } = comparison;
  const engines = companies[0].aiVisibility.map((e) => e.engine);
  const byId = Object.fromEntries(companies.map((c) => [c.company.id, c.company]));

  // Researched companies have no AI-visibility data yet: the backend doesn't track AI answers.
  if (!engines.length && !promptChecks.length) {
    return (
      <div className="card flex items-start gap-3 p-5 sm:p-6">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-geo/10">
          <Sparkles className="size-4 text-geo" />
        </span>
        <div>
          <h3 className="text-[16px] font-bold">AI visibility by engine</h3>
          <p className="mt-1 max-w-xl text-[12.5px] leading-relaxed text-muted">
            Not measured for this research. Tracking brand mentions inside ChatGPT, Perplexity and AI Overviews needs an AI-citation tracker, which
            isn&apos;t connected yet. The GEO score above is built from third-party presence, brand scale, freshness and brand clarity.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <div className="card p-5 sm:p-6">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-geo" />
          <h3 className="text-[16px] font-bold">AI visibility by engine</h3>
        </div>
        <p className="mt-0.5 text-[12.5px] text-muted">Share of 120 tracked prompts where each brand is mentioned</p>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[520px] border-separate border-spacing-1 text-[12px]">
            <thead>
              <tr>
                <th className="w-28" />
                {companies.map((c) => (
                  <th key={c.company.id} scope="col" className="pb-1 text-left font-semibold text-ink-2">
                    {c.company.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {engines.map((engine, ei) => (
                <tr key={engine}>
                  <th scope="row" className="pr-2 text-left font-medium text-ink-2">
                    {engine}
                  </th>
                  {companies.map((c) => {
                    const v = c.aiVisibility[ei];
                    return (
                      <td
                        key={c.company.id}
                        className="rounded-md px-2.5 py-2 font-semibold tabular-nums"
                        style={heat(v.mentionRate)}
                        title={`${v.citations} citations`}
                      >
                        {v.mentionRate}%
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card p-5 sm:p-6">
        <h3 className="text-[16px] font-bold">Sample AI answers</h3>
        <p className="mt-0.5 text-[12.5px] text-muted">Which brands each engine named for buyer questions</p>
        <ul className="mt-4 divide-y divide-line">
          {promptChecks.map((p) => {
            const you = p.mentioned.includes(comparison.subjectId);
            return (
              <li key={p.prompt} className="flex items-start gap-3 py-3">
                <span className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-full ${you ? "bg-good/10 text-good" : "bg-bad/10 text-bad"}`}>
                  {you ? <Check className="size-3.5" strokeWidth={3} /> : <X className="size-3.5" strokeWidth={3} />}
                  <span className="sr-only">{you ? "You were mentioned" : "You were not mentioned"}</span>
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium">“{p.prompt}”</p>
                  <p className="mt-0.5 text-[11.5px] text-muted">{p.engine}</p>
                </div>
                <div className="flex -space-x-1.5">
                  {p.mentioned.length ? (
                    p.mentioned.map((id) => (
                      <span key={id} title={byId[id].name} className="rounded-[9px] ring-2 ring-white">
                        <CompanyLogo company={byId[id]} size={24} />
                      </span>
                    ))
                  ) : (
                    <span className="text-[11.5px] text-faint">No brands named</span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
