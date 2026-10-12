"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, RotateCcw, Search } from "lucide-react";
import { useAppState } from "@/components/layout/app-state";
import { PageHeader } from "@/components/layout/page-header";
import { CompanyLogo } from "@/components/ui/company-logo";
import { ScoreRing } from "@/components/ui/score-ring";
import { PILLAR_LIST } from "@/lib/pillars";

export default function LibraryPage() {
  const router = useRouter();
  const { openComparison, comparison, busy, library, reloadLibrary } = useAppState();
  const [q, setQ] = useState("");

  const companies = library.status === "ready" ? library.data.companies : [];
  const shown = companies.filter((c) => `${c.company.name} ${c.company.domain} ${c.company.category}`.toLowerCase().includes(q.toLowerCase()));

  async function open(id: string, name: string) {
    router.push("/");
    await openComparison({ id, name });
  }

  return (
    <>
      <PageHeader title="Company Library" description="Every company you've researched, with its latest SEO, AEO and GEO scores.">
        <label className="flex h-10 w-full items-center gap-2 rounded-[10px] border border-line bg-surface px-3 shadow-card sm:w-72">
          <Search className="size-4 text-muted" />
          <span className="sr-only">Filter companies</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter by name or domain" className="w-full bg-transparent text-[13px] outline-none placeholder:text-faint" />
        </label>
      </PageHeader>

      <div className="mx-auto grid max-w-[1320px] gap-3 px-4 py-8 sm:grid-cols-2 sm:px-8 xl:grid-cols-3">
        {library.status === "loading" && (
          <div className="card col-span-full flex items-center justify-center gap-2.5 p-12 text-[13.5px] text-muted" role="status">
            <Loader2 className="size-4 animate-spin text-accent-strong" /> Loading your library…
          </div>
        )}
        {library.status === "error" && (
          <div className="card col-span-full p-12 text-center" role="alert">
            <p className="text-[14px] font-semibold">{library.error}</p>
            <button onClick={reloadLibrary} className="mt-3 inline-flex items-center gap-2 rounded-[10px] bg-accent px-4 py-2 text-[13px] font-semibold text-white hover:bg-accent-strong">
              <RotateCcw className="size-4" /> Try again
            </button>
          </div>
        )}
        {shown.map((c, i) => {
          const isSubject = c.company.id === comparison?.subjectId;
          return (
            <article key={c.company.id} className="card flex animate-rise flex-col p-5" style={{ animationDelay: `${i * 50}ms` }}>
              <div className="flex items-start gap-3">
                <CompanyLogo company={c.company} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-bold">{c.company.name}</p>
                  <p className="text-[12.5px] text-muted">
                    {c.company.domain} · {c.company.category}
                  </p>
                </div>
                {isSubject && <span className="rounded-md bg-accent px-2 py-0.5 text-[11px] font-bold text-white">In view</span>}
              </div>
              <div className="mt-5 flex justify-around">
                {PILLAR_LIST.map((p) => (
                  <ScoreRing key={p.id} score={c.pillars[p.id].score} color={p.color} label={p.label} />
                ))}
              </div>
              <button
                onClick={() => open(c.company.id, c.company.name)}
                disabled={busy}
                className="mt-5 flex items-center justify-center gap-2 rounded-[10px] border border-line py-2 text-[13px] font-semibold transition-colors hover:border-accent-strong hover:bg-accent-soft disabled:opacity-50"
              >
                Compare against competitors <ArrowRight className="size-4" />
              </button>
            </article>
          );
        })}
        {library.status === "ready" && companies.length === 0 && (
          <div className="card col-span-full p-12 text-center">
            <p className="text-[14px] font-semibold">No companies researched yet</p>
            <p className="mx-auto mt-1 max-w-sm text-[13px] text-muted">Research a company from the dashboard. It and the competitors found for it will appear here once scored.</p>
            <Link href="/" className="mt-3 inline-block rounded-[10px] bg-accent px-4 py-2 text-[13px] font-semibold text-white hover:bg-accent-strong">
              Research a company
            </Link>
          </div>
        )}
        {companies.length > 0 && !shown.length && (
          <div className="card col-span-full p-12 text-center">
            <p className="text-[14px] font-semibold">No companies match “{q}”</p>
            <Link href="/" className="mt-3 inline-block rounded-[10px] bg-accent px-4 py-2 text-[13px] font-semibold text-white hover:bg-accent-strong">
              Research a new company
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
