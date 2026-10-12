// The one place the frontend talks HTTP. Every call goes to our own backend under /api (proxied to
// BACKEND_URL by next.config.ts, or to NEXT_PUBLIC_API_BASE_URL in direct mode; see
// lib/config/api.ts), never to Supabase or a research provider.
//
// Failures always become an ApiError with a message that is safe to show: the backend's own
// user-facing message when it sent one, otherwise a fixed sentence. Raw bodies, statuses and
// exception text are never surfaced.

export type ApiErrorKind =
  | "network" // no response (offline, backend down, CORS, aborted by timeout)
  | "http" // non-2xx with the backend's { success: false, error } body
  | "malformed" // a response we can't read as the API's envelope
  | "aborted"; // cancelled by the caller

export class ApiError extends Error {
  constructor(
    readonly kind: ApiErrorKind,
    message: string,
    /** Backend error code, e.g. "VALIDATION_ERROR"; null when the backend didn't send one. */
    readonly code: string | null = null,
    readonly status: number | null = null,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const MESSAGES = {
  network: "Can't reach the research service. Check your connection and try again.",
  malformed: "The research service sent an unexpected response. Please try again.",
  server: "The research service had a problem. Please try again in a moment.",
  aborted: "The request was cancelled.",
} as const;

/** Same-origin by default; NEXT_PUBLIC_API_BASE_URL (validated at build by lib/config/api.ts) points the browser at another backend origin. */
export const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(/\/+$/, "");

const DEFAULT_TIMEOUT_MS = 20_000;

export interface RequestOptions {
  method?: "GET" | "POST";
  body?: unknown;
  signal?: AbortSignal;
  timeoutMs?: number;
}

function isEnvelope(v: unknown): v is { success: boolean; data?: unknown; error?: unknown } {
  return !!v && typeof v === "object" && typeof (v as { success?: unknown }).success === "boolean";
}

function backendError(v: unknown): { code: string; message: string } | null {
  const e = (v as { error?: { code?: unknown; message?: unknown } } | null)?.error;
  return e && typeof e.code === "string" && typeof e.message === "string" && e.message.trim() ? { code: e.code, message: e.message } : null;
}

/**
 * Calls the backend and returns `data` from a `{ success: true, data }` envelope.
 * `validate` checks the data's shape so a contract mismatch fails here, not deep in a component.
 */
export async function apiRequest<T>(path: string, validate: (data: unknown) => data is T, opts: RequestOptions = {}): Promise<T> {
  const timeout = AbortSignal.timeout(opts.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  const signal = opts.signal ? AbortSignal.any([opts.signal, timeout]) : timeout;

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method: opts.method ?? "GET",
      headers: { Accept: "application/json", ...(opts.body !== undefined ? { "Content-Type": "application/json" } : {}) },
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal,
      cache: "no-store",
    });
  } catch {
    if (opts.signal?.aborted) throw new ApiError("aborted", MESSAGES.aborted);
    throw new ApiError("network", MESSAGES.network);
  }

  let body: unknown;
  try {
    body = await res.json();
  } catch {
    if (opts.signal?.aborted) throw new ApiError("aborted", MESSAGES.aborted);
    // e.g. an HTML error page from a proxy, or the backend not running behind the dev proxy.
    throw new ApiError(res.status >= 500 ? "network" : "malformed", res.status >= 500 ? MESSAGES.network : MESSAGES.malformed, null, res.status);
  }

  if (!res.ok || (isEnvelope(body) && !body.success)) {
    const err = backendError(body);
    // 5xx bodies from the backend are already generic ("Something went wrong."); prefer ours.
    if (err && res.status < 500) throw new ApiError("http", err.message, err.code, res.status);
    throw new ApiError("http", MESSAGES.server, err?.code ?? null, res.status);
  }
  if (!isEnvelope(body) || !validate(body.data)) throw new ApiError("malformed", MESSAGES.malformed, null, res.status);
  return body.data;
}
