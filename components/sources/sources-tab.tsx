"use client";

import { useState } from "react";
import { Bot, Building2, ExternalLink, Globe, Newspaper, Users, Search, Star } from "lucide-react";
import { CompanyLogo } from "@/components/ui/company-logo";
import { PillarBadge } from "@/components/ui/pillar-badge";
import type { Comparison, SourceType } from "@/lib/types";

const TYPE_ICON: Record<SourceType, typeof Globe> = {
  "Company website": Globe,
  LinkedIn: Users,
  G2: Star,
  Clutch: Building2,
  "Search result": Search,
  "Industry publication": Newspaper,
  "AI answer": Bot,
};

export function SourcesTab({ comparison, selectedId }: { comparison: Comparison; selectedId: string }) {
  const [company, setCompany] = useState<string>("all");
  const [type, setType] = useState<SourceType | "all">("all");
  const all = comparison.companies.flatMap((c) => c.sources.map((s) => ({ ...s, company: c.company })));
  const types = [...new Set(all.map((s) => s.type))];
  const shown = all.filter((s) => (company === "all" || s.companyId === company) && (type === "all" || s.type === type));

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-col gap-4 border-b border-line p-5 sm:p-6 md:flex-row md:items-end md:justify-between">
        <div>
          <h3 className="text-[16px] font-bold">Sources</h3>
          <p className="mt-0.5 text-[12.5px] text-muted">
            {all.length} pages and profiles behind these scores. {selectedId !== comparison.subjectId && company === "all" && (
              <button onClick={() => setCompany(selectedId)} className="font-semibold text-ink underline-offset-2 hover:underline">
                Show only {comparison.companies.find((c) => c.company.id === selectedId)?.company.name}
              </button>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="sr-only" htmlFor="src-company">Company</label>
          <select id="src-company" value={company} onChange={(e) => setCompany(e.target.value)} className="h-9 rounded-lg border border-line bg-surface px-3 text-[12.5px] font-medium">
            <option value="all">All companies</option>
            {comparison.companies.map((c) => (
              <option key={c.company.id} value={c.company.id}>
                {c.company.name}
              </option>
            ))}
          </select>
          <label className="sr-only" htmlFor="src-type">Source type</label>
          <select id="src-type" value={type} onChange={(e) => setType(e.target.value as SourceType | "all")} className="h-9 rounded-lg border border-line bg-surface px-3 text-[12.5px] font-medium">
            <option value="all">All source types</option>
            {types.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>

      <ul className="divide-y divide-line">
        {shown.map((s) => {
          const Icon = TYPE_ICON[s.type];
          return (
            <li key={s.id}>
              <a
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 px-5 py-3.5 transition-colors hover:bg-canvas/60 sm:px-6 md:grid-cols-[auto_minmax(0,1fr)_170px_150px_auto]"
              >
                <span className="grid size-9 place-items-center rounded-xl border border-line bg-surface">
                  <Icon className="size-4 text-ink-2" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[13.5px] font-semibold group-hover:underline">{s.title}</span>
                  <span className="mt-0.5 flex items-center gap-2 text-[12px] text-muted">
                    {s.domain} <PillarBadge pillar={s.pillar} />
                  </span>
                </span>
                <span className="hidden text-[12.5px] text-ink-2 md:block">{s.type}</span>
                <span className="hidden items-center gap-2 md:flex">
                  <CompanyLogo company={s.company} size={20} />
                  <span className="truncate text-[12.5px] font-medium">{s.company.name}</span>
                </span>
                <ExternalLink className="size-4 text-faint group-hover:text-ink" aria-label="Opens in a new tab" />
              </a>
            </li>
          );
        })}
        {!shown.length && <li className="px-6 py-12 text-center text-[13px] text-muted">No sources match these filters.</li>}
      </ul>
    </div>
  );
}
