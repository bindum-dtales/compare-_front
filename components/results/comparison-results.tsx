"use client";

import { ComparisonSection } from "@/components/comparison/comparison-section";
import type { Comparison } from "@/lib/types";
import { GapList } from "./gap-list";
import { ImproveNext } from "./improve-next";
import { Landscape } from "./landscape";
import { ResultsHeader } from "./results-header";
import { Scoreboard } from "./scoreboard";

/**
 * A finished comparison, top to bottom: who is compared, who leads each pillar, the biggest gaps,
 * what to do next, then the detail and the wider competitive context.
 */
export function ComparisonResults({ comparison }: { comparison: Comparison }) {
  const [a, b, ...more] = comparison.companies;
  return (
    <section className="mx-auto max-w-[1320px] space-y-8 px-4 pb-12 pt-8 sm:space-y-10 sm:px-8 sm:pt-10">
      <ResultsHeader comparison={comparison} />
      <Scoreboard comparison={comparison} />
      {a && b && !more.length && <GapList a={a} b={b} id={comparison.id} />}
      <ImproveNext comparison={comparison} />
      <ComparisonSection comparison={comparison} />
      <Landscape comparison={comparison} />
    </section>
  );
}
