"use client";

import { Check, Loader2, RotateCcw, TriangleAlert, X } from "lucide-react";
import type { CompareRun, CompareSide } from "@/components/layout/app-state";
import { COMPANY_COLORS } from "@/lib/pillars";
import { progressPercent, RESEARCH_STAGES, stageIndex, stepText } from "@/lib/research/progress";

type Active = Exclude<CompareRun, { phase: "idle" }>;

const sidePercent = (s: CompareSide) => (s.ready ? 100 : s.job ? progressPercent(s.job) : 0);

/** One company's research: the backend's progress, step text and stage while it runs. */
function Lane({ side, color }: { side: CompareSide; color: string }) {
  const { request, job, ready, existing } = side;
  const pct = sidePercent(side);
  const stage = job && !ready ? Math.min(stageIndex(job), RESEARCH_STAGES.length - 1) : null;
  const line = ready ? (existing ? "Already researched, loaded from your library" : "Research complete") : job ? stepText(job) : "Starting research…";

  return (
    <div className="min-w-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 truncate text-[14.5px] font-bold">
            <span className="size-2 shrink-0 rounded-full" style={{ background: color }} aria-hidden />
            {request.companyName}
          </p>
          <p className="truncate pl-4 font-mono text-[11.5px] text-muted">{request.domain}</p>
        </div>
        <p className="text-[18px] font-extrabold tabular-nums tracking-[-0.02em]" aria-hidden>
          {pct}
          <span className="text-[12px] font-semibold text-muted">%</span>
        </p>
      </div>
      <div
        role="progressbar"
        aria-label={`Research progress for ${request.companyName}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-line"
      >
        <div className="h-full rounded-full transition-[width] duration-700 ease-out" style={{ width: `${Math.max(pct, 3)}%`, background: ready ? "var(--color-good)" : color }} />
      </div>
      <p className="mt-2.5 flex items-center gap-2 text-[12.5px] font-medium text-ink">
        {ready ? <Check className="size-3.5 shrink-0 text-good" strokeWidth={3} /> : <Loader2 className="size-3.5 shrink-0 animate-spin text-accent-strong" />}
        <span className="truncate">{line}</span>
      </p>
      {stage !== null && (
        <p className="mt-1 pl-[22px] text-[11.5px] text-muted">
          Step {stage + 1} of {RESEARCH_STAGES.length} · {RESEARCH_STAGES[stage]}
        </p>
      )}
    </div>
  );
}

/** Live status of a head-to-head: both companies' research, or the safe message if one failed. */
export function CompareProgress({ run, onRetry, onDismiss }: { run: Active; onRetry: () => void; onDismiss: () => void }) {
  if (run.phase === "failed") {
    const side = run.failedSide === null ? null : run.sides[run.failedSide];
    const job = side?.job;
    return (
      <div role="alert" className="animate-rise rounded-[18px] border border-bad/25 bg-surface p-4 shadow-card sm:p-5">
        <div className="flex items-start gap-3">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-bad/10">
            <TriangleAlert className="size-4 text-bad" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-bold">{side ? `Research for ${side.request.companyName} didn't complete` : "The comparison didn't complete"}</p>
            {side && <p className="mt-0.5 font-mono text-[12px] text-muted">{side.request.domain}</p>}
            <p className="mt-2 text-[13px] leading-relaxed text-ink-2">{run.error}</p>
            {job && job.status === "failed" && (
              <p className="mt-1.5 text-[12px] text-muted">Stopped at: {RESEARCH_STAGES[Math.min(stageIndex(job), RESEARCH_STAGES.length - 1)]}</p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onRetry}
                className="flex h-9 items-center gap-1.5 rounded-[10px] bg-accent px-3.5 text-[12.5px] font-semibold text-white transition-all hover:bg-accent-strong active:scale-[0.98]"
              >
                <RotateCcw className="size-3.5" /> Try again
              </button>
              <button
                type="button"
                onClick={onDismiss}
                className="flex h-9 items-center gap-1.5 rounded-[10px] border border-line px-3.5 text-[12.5px] font-semibold text-ink-2 transition-colors hover:border-line-strong hover:text-ink"
              >
                <X className="size-3.5" /> Dismiss
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const waiting = run.sides.filter((s) => !s.ready).length;
  return (
    <div role="status" aria-live="polite" aria-busy="true" className="animate-rise rounded-[18px] border border-line bg-surface p-4 shadow-card sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="eyebrow">Comparison in progress</p>
        <p className="text-[12px] text-muted">{waiting === 2 ? "Researching both companies" : waiting === 1 ? "1 company left" : "Building the comparison…"}</p>
      </div>
      <div className="mt-4 grid gap-5 sm:grid-cols-2 sm:gap-8">
        {run.sides.map((side, i) => (
          <Lane key={i} side={side} color={COMPANY_COLORS[i]} />
        ))}
      </div>
      <p className="mt-4 border-t border-line pt-3 text-[12px] text-muted">
        Companies already in your library load instantly. A new company is researched with its own competitors and usually takes 1–3 minutes. You can keep browsing; progress is tracked in the background.
      </p>
    </div>
  );
}
