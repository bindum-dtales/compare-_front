"use client";

import { useState } from "react";
import { HiddenAssetsTab } from "@/components/hidden-assets/hidden-assets-tab";
import { KeyInsights } from "@/components/insights/key-insights";
import { SourcesTab } from "@/components/sources/sources-tab";
import { OverviewTab } from "@/components/tabs/overview-tab";
import { PillarTab } from "@/components/tabs/pillar-tab";
import { CompanyLogo } from "@/components/ui/company-logo";
import type { Comparison } from "@/lib/types";
import { TabBar, type TabId } from "./tab-bar";

/** Tabs whose details are for one company at a time. */
const PER_COMPANY: TabId[] = ["seo", "aeo", "geo", "hidden", "sources"];

/** The detailed comparison under the scoreboard: every signal, insights, hidden assets and sources. */
export function ComparisonSection({ comparison }: { comparison: Comparison }) {
  const [tab, setTab] = useState<TabId>("overview");
  const [selectedId, setSelectedId] = useState(comparison.subjectId);
  const selected = comparison.companies.find((c) => c.company.id === selectedId) ?? comparison.companies[0];

  const counts: Partial<Record<TabId, number>> = {
    hidden: comparison.companies.reduce((n, c) => n + c.hiddenAssets.length, 0),
  };

  return (
    <section className="space-y-4" aria-labelledby="details-title">
      <div className="flex flex-col gap-3 px-1 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="eyebrow">Details</p>
          <h2 id="details-title" className="mt-1.5 text-[24px] font-extrabold tracking-[-0.03em] sm:text-[28px]">
            Detailed comparison
          </h2>
          <p className="mt-1 text-[13px] text-muted">Every signal behind the scores, with the evidence and sources.</p>
        </div>
        {PER_COMPANY.includes(tab) && comparison.companies.length > 1 && (
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Show details for">
            <span className="text-[12px] text-muted">Showing</span>
            {comparison.companies.map((c) => {
              const active = c.company.id === selected.company.id;
              return (
                <button
                  key={c.company.id}
                  type="button"
                  onClick={() => setSelectedId(c.company.id)}
                  aria-pressed={active}
                  className={`flex items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-[12.5px] font-semibold transition-colors ${
                    active ? "border-accent-strong bg-accent-soft text-ink" : "border-line bg-surface text-ink-2 hover:border-line-strong"
                  }`}
                >
                  <CompanyLogo company={c.company} size={22} />
                  {c.company.name}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <TabBar active={tab} onChange={setTab} counts={counts} />

      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} key={tab} className="animate-rise">
        {tab === "overview" && <OverviewTab comparison={comparison} />}
        {(tab === "seo" || tab === "aeo" || tab === "geo") && (
          <PillarTab pillar={tab} comparison={comparison} selected={selected} onSelect={setSelectedId} />
        )}
        {tab === "insights" && <KeyInsights insights={comparison.insights} onOpen={(p) => setTab(p)} />}
        {tab === "hidden" && <HiddenAssetsTab comparison={comparison} selectedId={selected.company.id} onSelect={setSelectedId} />}
        {tab === "sources" && <SourcesTab comparison={comparison} selectedId={selected.company.id} />}
      </div>
    </section>
  );
}
