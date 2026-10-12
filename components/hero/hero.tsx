"use client";

import { CompanySearch } from "./company-search";
import { HeroVisual } from "./hero-visual";

export function Hero({ onAnalyzed }: { onAnalyzed?: () => void }) {
  return (
    <section className="relative overflow-hidden border-b border-line" data-noprint>
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 90% at 85% 10%, rgb(247 197 19 / 0.28), transparent 70%), radial-gradient(40% 60% at 10% 0%, rgb(247 197 19 / 0.10), transparent 70%), linear-gradient(#fffdf6, #fbf7ea)",
        }}
      />
      <div className="relative mx-auto grid max-w-[1320px] items-center gap-8 px-4 pb-10 pt-10 sm:px-8 lg:grid-cols-[minmax(0,680px)_minmax(0,1fr)] lg:pb-14 lg:pt-14">
        <div className="animate-rise">
          <p className="text-[12px] font-semibold tracking-[0.14em] text-ink-2">
            SEO <span className="mx-1 text-accent-strong">·</span> AEO <span className="mx-1 text-accent-strong">·</span> GEO
          </p>
          <h1 className="mt-4 text-[34px] font-extrabold leading-[1.08] tracking-[-0.035em] sm:text-[42px] xl:text-[46px]">
            See how your brand performs
            <br className="hidden sm:block" />{" "}
            <span className="text-accent-strong">across search, answers and AI.</span>
          </h1>
          <p className="mt-4 max-w-[520px] text-[15px] leading-relaxed text-ink-2 sm:text-[16px]">
            Compare your brand with real competitors and get actionable insights to win in search engines and AI answer engines.
          </p>
          <div className="mt-8 max-w-[660px]">
            <CompanySearch onDone={onAnalyzed} />
          </div>
        </div>
        <div className="hidden lg:block">
          <HeroVisual />
        </div>
      </div>
    </section>
  );
}
