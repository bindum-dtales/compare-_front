"use client";

import { Code2, EyeOff, FileSearch, GitBranch, Link2Off, ShieldCheck } from "lucide-react";
import { CompanyLogo } from "@/components/ui/company-logo";
import type { Comparison, HiddenAsset } from "@/lib/types";

const KIND: Record<HiddenAsset["kind"], { label: string; icon: typeof EyeOff }> = {
  "hidden-content": { label: "Potential hidden content", icon: EyeOff },
  "staging-leak": { label: "Staging environment exposed", icon: GitBranch },
  "orphan-page": { label: "Orphan page", icon: Link2Off },
  "noindex-conflict": { label: "Indexing conflict", icon: FileSearch },
};

const SEVERITY = {
  high: "bg-bad/10 text-bad",
  medium: "bg-warn/10 text-warn",
  low: "bg-line text-ink-2",
};

export function HiddenAssetsTab({ comparison, selectedId, onSelect }: { comparison: Comparison; selectedId: string; onSelect: (id: string) => void }) {
  const selected = comparison.companies.find((c) => c.company.id === selectedId)!;
  const assets = selected.hiddenAssets;

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
      <div className="space-y-4">
        <div className="card p-5">
          <span className="grid size-9 place-items-center rounded-xl bg-accent-soft">
            <Code2 className="size-[18px] text-accent-ink" />
          </span>
          <h3 className="mt-3 text-[15px] font-bold">What are hidden assets?</h3>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted">
            Content that crawlers can see but visitors can&apos;t — or the reverse. We compare raw HTML, the rendered page and the sitemap to find pages and
            blocks that send mixed signals to search and AI engines.
          </p>
        </div>
        <ul className="card divide-y divide-line p-1.5" aria-label="Companies">
          {comparison.companies.map((c) => {
            const active = c.company.id === selectedId;
            const n = c.hiddenAssets.length;
            const checked = c.hiddenAssetsChecked;
            return (
              <li key={c.company.id}>
                <button
                  onClick={() => onSelect(c.company.id)}
                  aria-pressed={active}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${active ? "bg-accent-soft" : "hover:bg-canvas"}`}
                >
                  <CompanyLogo company={c.company} size={26} />
                  <span className="flex-1 truncate text-[13px] font-semibold">{c.company.name}</span>
                  {n ? (
                    <span className="rounded-full bg-ink px-2 text-[11px] font-bold text-white tabular-nums">{n}</span>
                  ) : checked ? (
                    <ShieldCheck className="size-4 text-good" aria-label="No issues" />
                  ) : (
                    <span className="text-[11px] font-medium text-muted">Not checked</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="space-y-3">
        <div className="flex items-baseline justify-between px-1">
          <h3 className="text-[16px] font-bold">
            {selected.company.name}{" "}
            <span className="font-medium text-muted">
              · {selected.hiddenAssetsChecked || assets.length ? `${assets.length} finding${assets.length === 1 ? "" : "s"}` : "not checked"}
            </span>
          </h3>
          <p className="text-[12px] text-muted">Crawled {selected.company.domain}</p>
        </div>

        {assets.length ? (
          assets.map((a) => {
            const k = KIND[a.kind];
            return (
              <article key={a.id} className="card p-5 transition-shadow hover:shadow-lift">
                <div className="flex flex-wrap items-center gap-2">
                  <k.icon className="size-4 text-ink-2" />
                  <p className="text-[13.5px] font-bold">{k.label}</p>
                  <span className={`ml-auto rounded-md px-1.5 py-0.5 text-[10.5px] font-bold uppercase ${SEVERITY[a.severity]}`}>{a.severity}</span>
                </div>
                <p className="mt-2 break-all rounded-lg bg-canvas px-3 py-2 font-mono text-[12.5px] text-ink">{a.url}</p>
                <dl className="mt-3 grid gap-3 text-[12.5px] sm:grid-cols-[140px_minmax(0,1fr)]">
                  <div>
                    <dt className="eyebrow">Found in</dt>
                    <dd className="mt-1 font-medium">{a.foundIn}</dd>
                  </div>
                  <div>
                    <dt className="eyebrow">Issue</dt>
                    <dd className="mt-1 leading-relaxed text-ink-2">{a.issue}</dd>
                  </div>
                </dl>
              </article>
            );
          })
        ) : !selected.hiddenAssetsChecked ? (
          <div className="card flex flex-col items-center px-6 py-14 text-center">
            <span className="grid size-12 place-items-center rounded-full bg-canvas">
              <FileSearch className="size-6 text-muted" />
            </span>
            <p className="mt-4 text-[15px] font-bold">Hidden assets not checked</p>
            <p className="mt-1 max-w-sm text-[13px] text-muted">
              {selected.company.domain}&apos;s pages couldn&apos;t be read for this check, so no result is shown. This is not the same as a clean result.
            </p>
          </div>
        ) : (
          <div className="card flex flex-col items-center px-6 py-14 text-center">
            <span className="grid size-12 place-items-center rounded-full bg-good/10">
              <ShieldCheck className="size-6 text-good" />
            </span>
            <p className="mt-4 text-[15px] font-bold">No hidden assets found</p>
            <p className="mt-1 max-w-sm text-[13px] text-muted">
              Everything crawlers see on {selected.company.domain} is also visible to visitors, and every indexed page is linked from the site.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
