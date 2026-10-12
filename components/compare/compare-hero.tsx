import { PILLAR_LIST } from "@/lib/pillars";
import { CompareForm } from "./compare-form";

/**
 * The dashboard's first screen: what DTales does, and the two-company comparison form.
 * `children` sits under the form, e.g. the empty state while nothing is compared yet.
 */
export function CompareHero({ children }: { children?: React.ReactNode }) {
  return (
    <section id="compare" className="relative scroll-mt-16 border-b border-line lg:scroll-mt-0" data-noprint>
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(55% 45% at 50% 0%, rgb(37 99 235 / 0.09), transparent 75%), linear-gradient(#fbfdff, #f8fafc)" }}
        aria-hidden
      />

      <div className="relative mx-auto max-w-[1040px] px-4 pb-10 pt-8 sm:px-8 sm:pt-10 lg:pb-12 lg:pt-12">
        <div className="mx-auto max-w-[680px] animate-rise text-center">
          <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
            {PILLAR_LIST.map((p, i) => (
              <span key={p.id} className="flex items-center gap-2">
                {i > 0 && <span className="text-line-strong">·</span>}
                <span className="flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full" style={{ background: p.color }} aria-hidden />
                  {p.label}
                </span>
              </span>
            ))}
          </p>
          <h1 className="mt-4 text-balance text-[34px] font-extrabold leading-[1.05] tracking-[-0.04em] sm:text-[44px] lg:text-[50px]">
            Compare your brand
            <br />
            <span className="bg-[linear-gradient(transparent_60%,var(--color-accent-tint)_60%,var(--color-accent-tint)_88%,transparent_88%)] px-1 [-webkit-box-decoration-break:clone] [box-decoration-break:clone]">
              against the competition.
            </span>
          </h1>
          <p className="mx-auto mt-4 max-w-[480px] text-pretty text-[15px] leading-relaxed text-muted sm:text-[16px]">
            See how two companies perform across search engines, answer engines and generative AI.
          </p>
        </div>

        <div className="mx-auto mt-8 max-w-[980px] animate-rise [animation-delay:80ms] sm:mt-9">
          <CompareForm />
          {children}
        </div>
      </div>
    </section>
  );
}
