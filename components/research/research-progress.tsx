"use client";

import { Check, Loader2, RotateCcw, TriangleAlert, X } from "lucide-react";
import type { ResearchRun } from "@/components/layout/app-state";
import { progressPercent, RESEARCH_STAGES, stageIndex, stepText } from "@/lib/research/progress";

type Active = Exclude<ResearchRun, { phase: "idle" }>;

/** Live status of a research run: progress while it runs, the safe backend message if it fails. */
export function ResearchProgress({ run, onRetry, onDismiss }: { run: Active; onRetry: () => void; onDismiss: () => void }) {
  const { request, phase } = run;
  const job = "job" in run ? run.job : null;
  const failed = phase === "failed";
  const stage = job ? stageIndex(job) : 0;
  const pct = phase === "loading-result" ? 100 : job ? progressPercent(job) : 0;
  const line =
    phase === "submitting"
      ? "Starting research…"
      : phase === "loading-result"
        ? "Research complete. Loading the results…"
        : job
          ? stepText(job)
          : "Reconnecting to the running research…";

  if (failed) {
    return (
      <div role="alert" className="mt-4 animate-rise rounded-[16px] border border-bad/25 bg-surface p-4 shadow-card sm:p-5">
        <div className="flex items-start gap-3">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-bad/10">
            <TriangleAlert className="size-4 text-bad" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-bold">Research for {request.companyName} didn&apos;t complete</p>
            <p className="mt-0.5 font-mono text-[12px] text-muted">{request.domain}</p>
            <p className="mt-2 text-[13px] leading-relaxed text-ink-2">{run.error}</p>
            {job && job.status === "failed" && (
              <p className="mt-1.5 text-[12px] text-muted">Stopped at: {RESEARCH_STAGES[Math.min(stage, RESEARCH_STAGES.length - 1)]}</p>
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

  return (
    <div role="status" aria-live="polite" aria-busy="true" className="card mt-4 animate-rise p-4 sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="eyebrow">Research running</p>
          <p className="mt-1 truncate text-[15px] font-bold">{request.companyName}</p>
          <p className="truncate font-mono text-[12px] text-muted">{request.domain}</p>
        </div>
        <p className="text-[22px] font-extrabold tabular-nums tracking-[-0.02em]" aria-hidden>
          {pct}
          <span className="text-[13px] font-semibold text-muted">%</span>
        </p>
      </div>

      <div
        role="progressbar"
        aria-label={`Research progress for ${request.companyName}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        className="mt-3 h-1.5 overflow-hidden rounded-full bg-line"
      >
        <div className="h-full rounded-full bg-accent-strong transition-[width] duration-700 ease-out" style={{ width: `${Math.max(pct, 3)}%` }} />
      </div>

      <p className="mt-3 flex items-center gap-2 text-[13px] font-medium text-ink">
        <Loader2 className="size-3.5 shrink-0 animate-spin text-accent-strong" />
        <span className="truncate">{line}</span>
      </p>

      <ol className="mt-3 flex flex-wrap gap-x-5 gap-y-2" aria-label="Research stages">
        {RESEARCH_STAGES.map((label, i) => {
          const done = phase === "loading-result" || i < stage;
          const current = !done && i === stage && phase !== "submitting";
          return (
            <li
              key={label}
              aria-current={current ? "step" : undefined}
              className={`flex items-center gap-1.5 text-[12.5px] transition-colors ${done ? "text-ink-2" : current ? "font-semibold text-ink" : "text-faint"}`}
            >
              {done ? (
                <Check className="size-3.5 text-good" strokeWidth={3} />
              ) : current ? (
                <Loader2 className="size-3.5 animate-spin text-accent-strong" />
              ) : (
                <span className="size-1.5 rounded-full bg-line-strong" />
              )}
              {label}
            </li>
          );
        })}
      </ol>

      <p className="mt-3 text-[12px] text-muted">
        A full run researches the company and its competitors and usually takes 1–3 minutes. You can keep browsing; progress is tracked in the background.
      </p>
    </div>
  );
}
