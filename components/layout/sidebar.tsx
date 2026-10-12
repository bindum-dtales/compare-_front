"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileDown, GitCompareArrows, LayoutGrid, Library, Plus, X } from "lucide-react";
import { Logo } from "@/components/ui/logo";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutGrid },
  { href: "/library", label: "Company Library", icon: Library },
  { href: "/comparisons", label: "Comparisons", icon: GitCompareArrows },
  { href: "/exports", label: "Exports", icon: FileDown },
];

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-ink/20 backdrop-blur-[1px] transition-opacity lg:hidden ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={onClose}
        aria-hidden
      />
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[248px] flex-col border-r border-line bg-surface px-4 pb-4 pt-6 transition-transform duration-300 lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex items-center justify-between px-2">
          <Link href="/" onClick={onClose} aria-label="DTales dashboard">
            <Logo />
          </Link>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted hover:bg-canvas lg:hidden" aria-label="Close menu">
            <X className="size-4" />
          </button>
        </div>

        <Link
          href="/#compare"
          onClick={onClose}
          className="group mt-8 flex h-11 items-center justify-center gap-2 rounded-[12px] bg-ink text-[13.5px] font-semibold text-white shadow-card transition-all hover:-translate-y-px hover:shadow-lift active:translate-y-0"
        >
          <Plus className="size-4 text-accent-light transition-transform group-hover:rotate-90" strokeWidth={2.5} /> New comparison
        </Link>

        <nav className="mt-6 flex flex-col gap-1" aria-label="Main">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                aria-current={active ? "page" : undefined}
                className={`group flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-[13.5px] font-medium transition-colors ${
                  active ? "bg-accent-soft text-ink" : "text-ink-2 hover:bg-canvas hover:text-ink"
                }`}
              >
                <Icon className={`size-[17px] ${active ? "text-ink" : "text-muted group-hover:text-ink"}`} strokeWidth={1.8} />
                {label}
                {active && <span className="ml-auto size-1.5 rounded-full bg-accent-strong" />}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
