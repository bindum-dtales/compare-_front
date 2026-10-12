"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Menu, TriangleAlert } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { AppStateProvider, useAppState } from "./app-state";
import { Sidebar } from "./sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  // Escape closes the mobile menu.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen]);
  return (
    <AppStateProvider>
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="min-h-dvh lg:pl-[248px]">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-surface/90 px-4 py-3 backdrop-blur lg:hidden" data-noprint>
          <Logo className="h-9" />
          <button onClick={() => setMenuOpen(true)} className="rounded-lg border border-line p-2" aria-label="Open menu">
            <Menu className="size-4" />
          </button>
        </header>
        <main>{children}</main>
      </div>
      <Toast />
    </AppStateProvider>
  );
}

function Toast() {
  const { toast } = useAppState();
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-5 z-[60] flex justify-center px-4">
      {toast && (
        <div key={toast.message} role={toast.tone === "error" ? "alert" : undefined} className="flex animate-rise items-center gap-2.5 rounded-xl bg-ink px-4 py-3 text-[13px] font-medium text-white shadow-lift">
          {toast.tone === "error" ? <TriangleAlert className="size-4 shrink-0 text-bad" /> : <CheckCircle2 className="size-4 shrink-0 text-accent-light" />}
          {toast.message}
        </div>
      )}
    </div>
  );
}
