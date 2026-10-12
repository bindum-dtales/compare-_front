"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarDays, ChevronDown, Download, FileSpreadsheet, FileText, Link2, RefreshCw } from "lucide-react";
import { useAppState } from "@/components/layout/app-state";
import { CompanyLogo } from "@/components/ui/company-logo";
import { formatDate } from "@/lib/format";
import { COMPANY_COLORS, PILLAR_LIST } from "@/lib/pillars";
import { isHeadToHead } from "@/lib/research/comparison";
import { sizeLabel } from "@/lib/research/exports";
import { rerunRequest } from "@/lib/research/run";
import type { Company, Comparison } from "@/lib/types";

function toCsv(c: Comparison) {
  const head = ["Company", "Domain", ...PILLAR_LIST.flatMap((p) => [p.label, ...p.metrics.map((m) => `${p.label} ${m.label}`)])];
  const rows = c.companies.map((r) => [
    r.company.name,
    r.company.domain,
    ...PILLAR_LIST.flatMap((p) => [r.pillars[p.id].score, ...r.pillars[p.id].subMetrics.map((m) => m.score)]),
  ]);
  return [head, ...rows].map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
}

/** Closes a popover on outside click or Escape. */
function useDismiss(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && close();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);
  return ref;
}

/** One side of the matchup. Domains wrap rather than truncate, so they stay readable on phones. */
function Party({ company, color, align = "left" }: { company: Company; color: string; align?: "left" | "right" }) {
  const right = align === "right";
  return (
    <div className={`flex min-w-0 items-center gap-3.5 sm:gap-4 ${right ? "md:flex-row-reverse md:text-right" : ""}`}>
      <span className="hidden sm:block">
        <CompanyLogo company={company} size={56} />
      </span>
      <span className="sm:hidden">
        <CompanyLogo company={company} size={44} />
      </span>
      <div className="min-w-0">
        <p className="text-[26px] font-extrabold leading-[1.05] tracking-[-0.035em] [overflow-wrap:anywhere] sm:text-[34px]">{company.name}</p>
        <p className={`mt-1.5 flex items-start gap-1.5 font-mono text-[12.5px] text-ink-2 ${right ? "md:flex-row-reverse" : ""}`}>
          <span className="mt-[0.45em] size-2 shrink-0 rounded-full" style={{ background: color }} aria-hidden />
          <span className="min-w-0 [overflow-wrap:anywhere]">{company.domain}</span>
        </p>
      </div>
    </div>
  );
}

function Versus() {
  return (
    <div className="flex items-center gap-3 md:flex-col md:gap-2" aria-hidden>
      <span className="h-px flex-1 bg-line md:h-8 md:w-px md:flex-none" />
      <span className="grid size-11 shrink-0 place-items-center rounded-full border border-line bg-surface text-[12px] font-extrabold tracking-[0.04em] text-ink-2 shadow-card">
        VS
      </span>
      <span className="h-px flex-1 bg-line md:h-8 md:w-px md:flex-none" />
    </div>
  );
}

export function ResultsHeader({ comparison }: { comparison: Comparison }) {
  const { addExport, notify, startResearch, startCompare, busy } = useAppState();
  const [exportOpen, setExportOpen] = useState(false);
  const close = () => setExportOpen(false);
  const ref = useDismiss(exportOpen, close);
  const [subject, ...rivals] = comparison.companies.map((c) => c.company);
  const headToHead = isHeadToHead(comparison);
  const title = rivals.length === 1 ? `${subject.name} vs ${rivals[0].name}` : `${subject.name} vs ${rivals.length} competitors`;

  function exportCsv() {
    const blob = new Blob([toCsv(comparison)], { type: "text/csv" });
    const a = Object.assign(document.createElement("a"), {
      href: URL.createObjectURL(blob),
      download: `dtales-${comparison.subjectId}-comparison.csv`,
    });
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    addExport({ title, format: "CSV", size: sizeLabel(blob.size) });
    notify("CSV report downloaded");
    close();
  }

  function exportPdf() {
    close();
    addExport({ title, format: "PDF", size: sizeLabel(null) }); // saved through the print dialog: size unknown
    setTimeout(() => window.print(), 50);
  }

  function rerun() {
    window.scrollTo({ top: 0, behavior: "smooth" }); // progress shows under the compare form
    if (headToHead && rivals[0]) startCompare([rerunRequest(subject), rerunRequest(rivals[0])]);
    else startResearch(rerunRequest(subject));
  }

  const action =
    "flex h-10 items-center gap-2 rounded-[10px] border border-line bg-surface px-3.5 text-[13px] font-semibold text-ink shadow-card transition-all hover:-translate-y-px hover:border-line-strong disabled:pointer-events-none disabled:opacity-50";
  const item = "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] text-ink-2 hover:bg-canvas hover:text-ink";

  return (
    <header className="card animate-rise overflow-hidden">
      <div className="bg-[linear-gradient(180deg,#f4f8ff,#ffffff_70%)] px-5 pb-6 pt-5 sm:px-8 sm:pb-8 sm:pt-6">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <span className="eyebrow text-ink-2">Comparison</span>
            <span className="hidden text-faint sm:inline" aria-hidden>
              ·
            </span>
            <span className="w-full text-[12.5px] text-muted sm:w-auto">{comparison.category}</span>
          </p>
          <p className="flex items-center gap-1.5 text-[12.5px] text-muted">
            <CalendarDays className="size-3.5" strokeWidth={1.9} aria-hidden />
            Last updated {formatDate(comparison.updatedAt)}
          </p>
        </div>

        <h2 className="sr-only">{title}</h2>
        {rivals.length === 1 ? (
          <div className="mt-6 grid gap-4 sm:mt-8 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:items-center md:gap-8">
            <Party company={subject} color={COMPANY_COLORS[0]} />
            <Versus />
            <Party company={rivals[0]} color={COMPANY_COLORS[1]} align="right" />
          </div>
        ) : (
          <div className="mt-6 space-y-5 sm:mt-8">
            <Party company={subject} color={COMPANY_COLORS[0]} />
            {rivals.length > 0 && (
              <div>
                <p className="eyebrow">Compared with {rivals.length === 1 ? "1 competitor" : `${rivals.length} competitors`}</p>
                <ul className="mt-2.5 flex flex-wrap gap-2">
                  {rivals.map((r, i) => (
                    <li key={r.id} className="flex min-w-0 items-center gap-2 rounded-full border border-line bg-surface py-1 pl-1 pr-3 text-[12.5px]">
                      <CompanyLogo company={r} size={24} />
                      <span className="font-semibold">{r.name}</span>
                      <span className="flex min-w-0 items-center gap-1.5 font-mono text-[11.5px] text-muted">
                        <span className="size-1.5 shrink-0 rounded-full" style={{ background: COMPANY_COLORS[(i + 1) % COMPANY_COLORS.length] }} aria-hidden />
                        <span className="[overflow-wrap:anywhere]">{r.domain}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div ref={ref} className="mt-6 flex flex-wrap items-center gap-2 border-t border-line pt-5 sm:mt-8" data-noprint>
          <button type="button" onClick={rerun} disabled={busy} className={action}>
            <RefreshCw className="size-4" strokeWidth={2} /> Re-run research
          </button>
          <div className="relative">
            <button type="button" onClick={() => setExportOpen((o) => !o)} aria-expanded={exportOpen} aria-haspopup="menu" className={action}>
              <Download className="size-4" strokeWidth={2} /> Export
              <ChevronDown className={`size-3.5 text-muted transition-transform ${exportOpen ? "rotate-180" : ""}`} />
            </button>
            {exportOpen && (
              <div role="menu" className="absolute left-0 top-12 z-30 w-56 animate-rise rounded-xl border border-line bg-surface p-1.5 shadow-lift">
                <button role="menuitem" onClick={exportPdf} className={item}>
                  <FileText className="size-4" /> PDF report
                  <span className="ml-auto text-[11px] text-faint">Print</span>
                </button>
                <button role="menuitem" onClick={exportCsv} className={item}>
                  <FileSpreadsheet className="size-4" /> Scores as CSV
                </button>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard?.writeText(window.location.href);
              notify("Link copied to clipboard");
            }}
            className={action}
          >
            <Link2 className="size-4" strokeWidth={2} /> Copy link
          </button>
        </div>
      </div>
    </header>
  );
}
