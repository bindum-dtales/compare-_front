"use client";

import { Loader2 } from "lucide-react";
import { CompareHero } from "@/components/compare/compare-hero";
import { ComparisonResults } from "@/components/results/comparison-results";
import { useAppState } from "@/components/layout/app-state";

export default function DashboardPage() {
  const { comparison, compare, research, opening } = useAppState();
  const running = compare.phase === "running" || research.phase !== "idle";

  return (
    <>
      <CompareHero>
        {!comparison && !opening && !running && (
          <div className="mt-4 flex animate-rise items-center gap-4 rounded-[16px] border border-dashed border-line-strong px-4 py-4 [animation-delay:160ms] sm:px-5">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent-soft text-[11px] font-extrabold tracking-[0.06em] text-accent-ink" aria-hidden>
              VS
            </span>
            <div className="min-w-0">
              <p className="text-[14px] font-semibold tracking-[-0.01em]">Choose two companies to compare</p>
              <p className="mt-0.5 text-pretty text-[12.5px] leading-relaxed text-muted">
                Add your brand and a competitor above. DTales will research both and compare them across SEO, AEO and GEO.
              </p>
            </div>
          </div>
        )}
      </CompareHero>
      <div id="results" className="scroll-mt-16 pb-4 lg:scroll-mt-0">
        {opening ? (
          <section className="mx-auto max-w-[1320px] px-4 py-8 sm:px-8">
            <div className="card flex items-center justify-center gap-2.5 p-12 text-[13.5px] text-muted" role="status">
              <Loader2 className="size-4 animate-spin text-accent-strong" /> Loading {opening.name} from your library…
            </div>
          </section>
        ) : comparison ? (
          <ComparisonResults key={comparison.id} comparison={comparison} />
        ) : null}
      </div>
    </>
  );
}
