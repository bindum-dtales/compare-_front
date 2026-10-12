"use client";

import Link from "next/link";
import { FileSpreadsheet, FileText } from "lucide-react";
import { useAppState } from "@/components/layout/app-state";
import { PageHeader } from "@/components/layout/page-header";

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });

export default function ExportsPage() {
  const { exports } = useAppState();
  return (
    <>
      <PageHeader title="Exports" description="Reports you've exported from comparisons in this browser. Use Export Report on the dashboard to create a new one." />
      <div className="mx-auto max-w-[1320px] px-4 py-8 sm:px-8">
        {exports.length ? (
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-[13px]">
              <thead className="border-b border-line">
                <tr className="text-[11px] uppercase tracking-[0.1em] text-muted">
                  <th className="px-6 py-3 font-semibold">Report</th>
                  <th className="px-4 py-3 font-semibold">Format</th>
                  <th className="px-4 py-3 font-semibold">Created</th>
                  <th className="px-4 py-3 font-semibold">Size</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {exports.map((e) => {
                  const Icon = e.format === "PDF" ? FileText : FileSpreadsheet;
                  return (
                    <tr key={e.id} className="animate-fade hover:bg-canvas/60">
                      <td className="px-6 py-3.5">
                        <span className="flex items-center gap-3">
                          <span className="grid size-8 place-items-center rounded-lg bg-accent-soft">
                            <Icon className="size-4 text-accent-ink" />
                          </span>
                          <span className="font-semibold">{e.title}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="rounded-md border border-line px-1.5 py-0.5 text-[11px] font-bold">{e.format}</span>
                      </td>
                      <td className="px-4 py-3.5 text-ink-2">{fmt(e.createdAt)}</td>
                      <td className="px-4 py-3.5 tabular-nums text-muted">{e.size}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="card p-12 text-center">
            <p className="text-[14px] font-semibold">No exports yet</p>
            <Link href="/" className="mt-3 inline-block rounded-[10px] bg-accent px-4 py-2 text-[13px] font-semibold text-white hover:bg-accent-strong">
              Go to dashboard
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
