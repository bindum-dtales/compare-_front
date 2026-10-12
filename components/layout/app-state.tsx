"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { DEMO_DATA, getComparison, getLibrary, initialComparison, initialExports, type LibrarySnapshot } from "@/lib/services/research";
import { ApiError } from "@/lib/api/client";
import type { ResearchJob, ResearchRequest } from "@/lib/api/types";
import { buildHeadToHead, IncompleteResultError, loadComparison } from "@/lib/research/comparison";
import { reloadRequests, runHeadToHead, SideFailedError, type Pair, type Side } from "@/lib/research/head-to-head";
import { parseExports } from "@/lib/research/exports";
import { pollResearchJob, ResearchAbortedError, ResearchFailedError, runResearch, type ResearchOutcome } from "@/lib/research/run";
import type { Comparison, ExportRecord } from "@/lib/types";

/**
 * The live research flow (POST /api/research, then polling the job). `job` is null until the backend
 * has answered (submitting) or while reconnecting to a job after a page reload.
 */
export type ResearchRun =
  | { phase: "idle" }
  | { phase: "submitting"; request: ResearchRequest }
  | { phase: "running"; request: ResearchRequest; job: ResearchJob | null }
  | { phase: "loading-result"; request: ResearchRequest; job: ResearchJob | null }
  | { phase: "failed"; request: ResearchRequest; job: ResearchJob | null; error: string };

/** One company of a head-to-head: its request, its job once the backend answered, and whether its result is in. */
export interface CompareSide {
  request: ResearchRequest;
  job: ResearchJob | null;
  ready: boolean;
  /** Already researched: the stored result was used, no job ran. */
  existing: boolean;
}

/** A head-to-head run: both companies researched side by side (see lib/research/head-to-head.ts). */
export type CompareRun =
  | { phase: "idle" }
  | { phase: "running"; sides: Pair<CompareSide> }
  | { phase: "failed"; sides: Pair<CompareSide>; failedSide: Side | null; error: string };

/** Loading state of data read from the backend. `error` is safe to show. */
export type Loadable<T> = { status: "loading" } | { status: "ready"; data: T } | { status: "error"; error: string };

const RESEARCH_FAILED = "The research could not be completed. Please try again.";
const LOAD_FAILED = "Couldn't load your research library. Please try again.";

/** Only messages written for users reach the screen; anything else (a bug) gets `fallback`. */
const safeMessage = (e: unknown, fallback: string): string =>
  e instanceof ResearchFailedError || e instanceof ApiError || e instanceof IncompleteResultError ? e.message : fallback;

/** The running job survives a page reload (same tab) so its progress can be picked up again. */
const STORAGE_KEY = "linkeye.research";
/**
 * The head-to-head on the dashboard (same tab): while it runs, its jobs so they can be followed again
 * after a reload; once shown, its two companies so a reload brings it back (both are researched then,
 * so the backend answers with the stored results).
 */
const COMPARE_KEY = "linkeye.compare";
/** Exports made in this browser (there is no export history on the server). */
const EXPORTS_KEY = "linkeye.exports";

function remember(value: { jobId: string; request: ResearchRequest } | null) {
  try {
    if (value) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    else sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage unavailable (private mode, blocked): resuming after reload just won't work.
  }
}

function recall(): { jobId: string; request: ResearchRequest } | null {
  try {
    const v = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "null");
    return typeof v?.jobId === "string" && typeof v?.request?.companyName === "string" && typeof v?.request?.domain === "string" ? v : null;
  } catch {
    return null;
  }
}

type SavedCompare = { requests: Pair<ResearchRequest>; jobIds: Pair<string | null> };

function rememberCompare(value: SavedCompare | null) {
  try {
    if (value) sessionStorage.setItem(COMPARE_KEY, JSON.stringify(value));
    else sessionStorage.removeItem(COMPARE_KEY);
  } catch {
    // Storage unavailable: the head-to-head just isn't restored after a reload.
  }
}

function recallCompare(): SavedCompare | null {
  try {
    const v = JSON.parse(sessionStorage.getItem(COMPARE_KEY) ?? "null");
    const isRequest = (r: unknown) => typeof (r as ResearchRequest)?.companyName === "string" && typeof (r as ResearchRequest)?.domain === "string";
    const isId = (id: unknown) => id === null || typeof id === "string";
    return Array.isArray(v?.requests) && v.requests.length === 2 && v.requests.every(isRequest) && Array.isArray(v.jobIds) && v.jobIds.length === 2 && v.jobIds.every(isId)
      ? v
      : null;
  } catch {
    return null;
  }
}

interface AppState {
  /** The comparison on the dashboard: null until the user compares two companies or opens one from the library. */
  comparison: Comparison | null;
  /** Researched companies and their comparisons, from the backend (or demo data). */
  library: Loadable<LibrarySnapshot>;
  reloadLibrary: () => void;
  /** A library company / comparison being opened on the dashboard. */
  opening: { name: string } | null;
  /** Load a researched company with its competitors onto the dashboard. Resolves true when shown. */
  openComparison: (ref: { id: string; name: string }) => Promise<boolean>;
  /** Live research run. */
  research: ResearchRun;
  /**
   * Research a company through the backend and load the result. Resolves true once the result is
   * shown; false if it failed (see `research.error`) or another run is in progress.
   */
  startResearch: (request: ResearchRequest) => Promise<boolean>;
  /** Clears a failed run's message. */
  dismissResearch: () => void;
  /** Live head-to-head run. */
  compare: CompareRun;
  /**
   * Research two companies (both at once, through the backend) and show them head to head. Resolves
   * true once the result is shown; false if it failed (see `compare.error`) or another run is in progress.
   */
  startCompare: (requests: Pair<ResearchRequest>) => Promise<boolean>;
  /** Clears a failed head-to-head's message. */
  dismissCompare: () => void;
  /** True while research runs or a comparison is being opened. */
  busy: boolean;
  exports: ExportRecord[];
  addExport: (record: Omit<ExportRecord, "id" | "createdAt">) => void;
  /** Demo mode's sample plan usage; null with real data (no usage tracking on the server). */
  credits: { used: number; total: number } | null;
  toast: { message: string; tone: "success" | "error" } | null;
  notify: (message: string, tone?: "success" | "error") => void;
}

const Ctx = createContext<AppState | null>(null);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [comparison, setComparison] = useState<Comparison | null>(initialComparison);
  const [library, setLibrary] = useState<Loadable<LibrarySnapshot>>({ status: "loading" });
  const [opening, setOpening] = useState<AppState["opening"]>(null);
  const [exports, setExports] = useState<ExportRecord[]>(initialExports);
  const [credits, setCredits] = useState<AppState["credits"]>(DEMO_DATA ? { used: 42, total: 50 } : null);
  const [toast, setToast] = useState<AppState["toast"]>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [research, setResearch] = useState<ResearchRun>({ phase: "idle" });
  const [compare, setCompare] = useState<CompareRun>({ phase: "idle" });
  /** The in-flight run's controller. A ref, so a double click can't start a second run before re-render. */
  const run = useRef<AbortController | null>(null);
  /** The in-flight library load / comparison open, cancelled when superseded or on unmount. */
  const libraryLoad = useRef<AbortController | null>(null);
  const openLoad = useRef<AbortController | null>(null);

  const notify = useCallback((message: string, tone: "success" | "error" = "success") => {
    setToast({ message, tone });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3200);
  }, []);
  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const showComparison = useCallback((next: Comparison) => {
    setComparison(next);
    rememberCompare(null); // a head-to-head re-saves itself after showing; anything else replaces it
  }, []);

  /**
   * Fetch the library (researched companies: the Library and Comparisons pages, and the compare
   * form's suggestions). The dashboard opens on the compare form, not on a past comparison.
   */
  const fetchLibrary = useCallback(async () => {
    libraryLoad.current?.abort();
    const ctrl = new AbortController();
    libraryLoad.current = ctrl;
    try {
      const snapshot = await getLibrary({ signal: ctrl.signal });
      if (!ctrl.signal.aborted) setLibrary({ status: "ready", data: snapshot });
    } catch (e) {
      if (ctrl.signal.aborted || (e instanceof ApiError && e.kind === "aborted")) return;
      setLibrary({ status: "error", error: safeMessage(e, LOAD_FAILED) });
    }
  }, []);

  const reloadLibrary = useCallback(() => {
    setLibrary({ status: "loading" });
    fetchLibrary();
  }, [fetchLibrary]);

  // First load; cancel everything in flight when the app unmounts.
  useEffect(() => {
    queueMicrotask(() => fetchLibrary()); // deferred: state updates belong outside the effect body
    return () => {
      libraryLoad.current?.abort();
      openLoad.current?.abort();
    };
  }, [fetchLibrary]);

  // Export history: restore this browser's, and keep it saved (real mode only; demo has sample rows).
  const exportsRestored = useRef(DEMO_DATA);
  useEffect(() => {
    if (DEMO_DATA) return;
    queueMicrotask(() => {
      try {
        const saved = parseExports(localStorage.getItem(EXPORTS_KEY));
        // Merged by id: a re-run of this effect (React Strict Mode) must not duplicate rows.
        if (saved.length)
          setExports((current) => {
            const ids = new Set(current.map((r) => r.id));
            return [...current, ...saved.filter((r) => !ids.has(r.id))];
          });
      } catch {
        // Storage unavailable: history lasts for this session only.
      }
      exportsRestored.current = true;
    });
  }, []);
  useEffect(() => {
    if (!exportsRestored.current) return;
    try {
      localStorage.setItem(EXPORTS_KEY, JSON.stringify(exports));
    } catch {
      // Storage unavailable or full: history lasts for this session only.
    }
  }, [exports]);

  const openComparison = useCallback(
    async (ref: { id: string; name: string }) => {
      if (run.current || openLoad.current) return false;
      const ctrl = new AbortController();
      openLoad.current = ctrl;
      setOpening({ name: ref.name });
      try {
        const next = await getComparison(ref, { signal: ctrl.signal });
        if (ctrl.signal.aborted) return false;
        showComparison(next);
        if (DEMO_DATA) setCredits((c) => c && { ...c, used: Math.min(c.total, c.used + 1) });
        const rivals = next.companies.length - 1;
        notify(rivals ? `${next.companies[0].company.name} loaded with ${rivals} competitor${rivals === 1 ? "" : "s"}` : `${next.companies[0].company.name} loaded`);
        return true;
      } catch (e) {
        if (!ctrl.signal.aborted) notify(safeMessage(e, LOAD_FAILED), "error");
        return false;
      } finally {
        if (openLoad.current === ctrl) openLoad.current = null;
        setOpening(null);
      }
    },
    [notify, showComparison],
  );

  /** Shared by a new run and a resumed one: follow the job, then load and show the result. */
  const follow = useCallback(
    async (request: ResearchRequest, ctrl: AbortController, go: (onJob: (job: ResearchJob) => void) => Promise<ResearchOutcome>) => {
      const onJob = (job: ResearchJob) => {
        if (ctrl.signal.aborted) return;
        remember({ jobId: job.id, request });
        setResearch({ phase: "running", request, job });
      };
      let lastJob: ResearchJob | null = null;
      try {
        const outcome = await go((job) => {
          lastJob = job;
          onJob(job);
        });
        remember(null);
        setResearch({ phase: "loading-result", request, job: lastJob });
        const next = await loadComparison(outcome.companyId, { signal: ctrl.signal });
        if (ctrl.signal.aborted) return false;
        showComparison(next);
        setResearch({ phase: "idle" });
        if (outcome.kind === "completed") fetchLibrary(); // the new company and its competitors
        const rivals = next.companies.length - 1;
        notify(
          outcome.kind === "existing"
            ? `${next.companies[0].company.name} loaded from your library`
            : `${next.companies[0].company.name} researched against ${rivals} competitor${rivals === 1 ? "" : "s"}`,
        );
        return true;
      } catch (e) {
        if (e instanceof ResearchAbortedError || ctrl.signal.aborted) return false;
        // Retrying the same company re-joins a still-running job (the backend answers "in_progress").
        remember(null);
        setResearch({ phase: "failed", request, job: e instanceof ResearchFailedError ? (e.job ?? lastJob) : lastJob, error: safeMessage(e, RESEARCH_FAILED) });
        return false;
      } finally {
        if (run.current === ctrl) run.current = null;
      }
    },
    [notify, showComparison, fetchLibrary],
  );

  const startResearch = useCallback(
    async (request: ResearchRequest) => {
      if (run.current || openLoad.current) return false;
      const ctrl = new AbortController();
      run.current = ctrl;
      setResearch({ phase: "submitting", request });
      return follow(request, ctrl, (onJob) => runResearch(request, { signal: ctrl.signal, onJob }));
    },
    [follow],
  );

  const dismissResearch = useCallback(() => setResearch((r) => (r.phase === "failed" ? { phase: "idle" } : r)), []);

  /** Shared by a new head-to-head and a restored one: follow both companies, then show them. */
  const followCompare = useCallback(
    async (requests: Pair<ResearchRequest>, ctrl: AbortController, jobIds?: Pair<string | null>) => {
      const sides: Pair<CompareSide> = [
        { request: requests[0], job: null, ready: false, existing: false },
        { request: requests[1], job: null, ready: false, existing: false },
      ];
      const ids: Pair<string | null> = jobIds ? [...jobIds] : [null, null];
      let ranJob = false;
      setCompare({ phase: "running", sides });
      rememberCompare({ requests, jobIds: ids });
      const patch = (side: Side, p: Partial<CompareSide>) => {
        if (ctrl.signal.aborted) return;
        setCompare((c) => (c.phase === "running" ? { ...c, sides: c.sides.map((x, i) => (i === side ? { ...x, ...p } : x)) as Pair<CompareSide> } : c));
      };
      try {
        const [a, b] = await runHeadToHead(requests, {
          signal: ctrl.signal,
          jobIds,
          onJob: (side, job) => {
            ranJob = true;
            ids[side] = job.id;
            if (!ctrl.signal.aborted) rememberCompare({ requests, jobIds: ids });
            patch(side, { job });
          },
          onReady: (side, existing) => patch(side, { ready: true, existing }),
        });
        if (ctrl.signal.aborted) return false;
        showComparison(buildHeadToHead(a, b));
        setCompare({ phase: "idle" });
        // Kept for a reload: both are researched now, so no `force` (that would research them again).
        rememberCompare({ requests: reloadRequests(requests), jobIds: [null, null] });
        if (ranJob) fetchLibrary(); // newly researched companies
        notify(`${a.company.name} vs ${b.company.name} is ready`);
        return true;
      } catch (e) {
        if (e instanceof ResearchAbortedError || ctrl.signal.aborted) return false;
        rememberCompare(null);
        const error = safeMessage(e, RESEARCH_FAILED);
        const failedSide = e instanceof SideFailedError ? e.side : null;
        setCompare((c) => ({ phase: "failed", sides: c.phase === "idle" ? sides : c.sides, failedSide, error }));
        return false;
      } finally {
        if (run.current === ctrl) run.current = null;
      }
    },
    [notify, showComparison, fetchLibrary],
  );

  const startCompare = useCallback(
    async (requests: Pair<ResearchRequest>) => {
      if (run.current || openLoad.current) return false;
      const ctrl = new AbortController();
      run.current = ctrl;
      return followCompare(requests, ctrl);
    },
    [followCompare],
  );

  const dismissCompare = useCallback(() => setCompare((c) => (c.phase === "failed" ? { phase: "idle" } : c)), []);

  // Pick up a run that was going (or a head-to-head that was shown) when the page was reloaded;
  // stop polling when the app unmounts.
  useEffect(() => {
    const saved = recall();
    const savedCompare = saved ? null : recallCompare();
    if ((saved || savedCompare) && !run.current) {
      const ctrl = new AbortController();
      run.current = ctrl;
      // Deferred: state updates belong outside the effect body.
      queueMicrotask(() => {
        if (ctrl.signal.aborted) return;
        if (saved) {
          setResearch({ phase: "running", request: saved.request, job: null });
          follow(saved.request, ctrl, (onJob) => pollResearchJob(saved.jobId, { signal: ctrl.signal, onJob }));
        } else if (savedCompare) {
          followCompare(savedCompare.requests, ctrl, savedCompare.jobIds);
        }
      });
    }
    return () => {
      run.current?.abort();
      run.current = null;
    };
  }, [follow, followCompare]);

  const addExport = useCallback((record: Omit<ExportRecord, "id" | "createdAt">) => {
    setExports((list) => [{ ...record, id: `exp-${Date.now()}`, createdAt: new Date().toISOString() }, ...list]);
  }, []);

  return (
    <Ctx.Provider
      value={{
        comparison,
        library,
        reloadLibrary,
        opening,
        openComparison,
        research,
        startResearch,
        dismissResearch,
        compare,
        startCompare,
        dismissCompare,
        busy:
          !!opening ||
          compare.phase === "running" ||
          research.phase === "submitting" ||
          research.phase === "running" ||
          research.phase === "loading-result",
        exports,
        addExport,
        credits,
        toast,
        notify,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAppState() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAppState must be used inside AppStateProvider");
  return ctx;
}
