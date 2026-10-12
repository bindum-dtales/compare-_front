"use client";

import { useRouter } from "next/navigation";
import { ChevronRight, Loader2, Plus, RotateCcw } from "lucide-react";
import { useAppState } from "@/components/layout/app-state";
import { PageHeader } from "@/components/layout/page-header";
import { formatDate } from "@/lib/format";

export default function ComparisonsPage() {
  const router = useRouter();
  const { openComparison, comparison, busy, library, reloadLibrary, research } = useAppState();
  const items = library.status === "ready" ? library.data.comparisons : [];
  /** A comparison whose company is being researched right now is shown as refreshing. */
  const refreshingDomain = research.phase === "running" || research.phase === "submitting" ? research.request.domain : null;
  const domains = new Map(library.status === "ready" ? library.data.companies.map((c) => [c.company.id, c.company.domain]) : []);

  async function open(subjectId: string, subject: string) {
    router.push("/");
    await openComparison({ id: subjectId, name: subject });
  }

  return (
    <>
      <PageHeader title="Comparisons" description="Each research run compares a company with the competitors found for it. Open one to load it on the dashboard.">
        <button
          onClick={() => router.push("/")}
          className="flex h-10 items-center gap-2 rounded-[10px] bg-accent px-4 text-[13px] font-semibold text-white transition-colors hover:bg-accent-strong"
        >
          <Plus className="size-4" /> New comparison
        </button>
      </PageHeader>

      <div className="mx-auto max-w-[1320px] px-4 py-8 sm:px-8">
        {library.status === "loading" ? (
          <div className="card flex items-center justify-center gap-2.5 p-12 text-[13.5px] text-muted" role="status">
            <Loader2 className="size-4 animate-spin text-accent-strong" /> Loading comparisons…
          </div>
        ) : library.status === "error" ? (
          <div className="card p-12 text-center" role="alert">
            <p className="text-[14px] font-semibold">{library.error}</p>
            <button onClick={reloadLibrary} className="mt-3 inline-flex items-center gap-2 rounded-[10px] bg-accent px-4 py-2 text-[13px] font-semibold text-white hover:bg-accent-strong">
              <RotateCcw className="size-4" /> Try again
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="card p-12 text-center">
            <p className="text-[14px] font-semibold">No comparisons yet</p>
            <p className="mx-auto mt-1 max-w-sm text-[13px] text-muted">Compare two companies from the dashboard, or research one and its competitors are found automatically. Comparisons appear here.</p>
            <button onClick={() => router.push("/")} className="mt-3 rounded-[10px] bg-accent px-4 py-2 text-[13px] font-semibold text-white hover:bg-accent-strong">
              Research a company
            </button>
          </div>
        ) : (
          <ul className="card divide-y divide-line overflow-hidden">
            {items.map((c) => {
              const current = c.id === comparison?.id;
              const status = refreshingDomain && domains.get(c.subjectId) === refreshingDomain ? "refreshing" : c.status;
              return (
                <li key={c.id}>
                  <button
                    onClick={() => (current ? router.push("/") : open(c.subjectId, c.subject))}
                    disabled={busy && !current}
                    className="group flex w-full flex-col gap-2 px-5 py-4 text-left transition-colors hover:bg-canvas/60 disabled:opacity-60 sm:flex-row sm:items-center sm:gap-6 sm:px-6"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-bold">
                        {c.subject} <span className="font-medium text-muted">vs</span> {c.competitors.join(", ")}
                        {current && <span className="ml-2 rounded-md bg-accent px-1.5 py-0.5 align-middle text-[10.5px] font-bold text-white">On dashboard</span>}
                      </p>
                      <p className="mt-0.5 text-[12.5px] text-muted">{c.category}</p>
                    </div>
                    <span className="text-[12.5px] text-muted">Updated {formatDate(c.updatedAt)}</span>
                    <span
                      className={`inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold ${
                        status === "complete" ? "bg-good/10 text-good" : "bg-accent-soft text-accent-ink"
                      }`}
                    >
                      {status === "refreshing" && <Loader2 className="size-3 animate-spin" />}
                      {status === "complete" ? "Complete" : "Refreshing"}
                    </span>
                    <ChevronRight className="hidden size-4 text-faint transition-transform group-hover:translate-x-0.5 group-hover:text-ink sm:block" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}
