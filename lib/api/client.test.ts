import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiRequest } from "./client";
import { getResearchJob, startResearch } from "./research";

const anything = (v: unknown): v is unknown => v !== undefined;
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

function stubFetch(impl: (url: string, init: RequestInit) => Response | Promise<Response>) {
  const spy = vi.fn((url: string | URL | Request, init: RequestInit = {}) => Promise.resolve(impl(String(url), init)));
  vi.stubGlobal("fetch", spy);
  return spy;
}

async function failure(p: Promise<unknown>): Promise<ApiError> {
  try {
    await p;
  } catch (e) {
    if (e instanceof ApiError) return e;
    throw e;
  }
  throw new Error("expected a rejection");
}

const JOB = {
  id: "9ad085ab-2674-4d0b-9d70-a0782753bf60",
  companyName: "Wix",
  domain: "wix.com",
  status: "queued",
  progress: 0,
  currentStep: null,
  error: null,
  companyId: null,
  createdAt: "2026-10-04T09:42:00Z",
  startedAt: null,
  completedAt: null,
};

afterEach(() => vi.unstubAllGlobals());

describe("apiRequest", () => {
  it("returns data from a success envelope and calls the same-origin /api path", async () => {
    const fetch = stubFetch(() => json(200, { success: true, data: { ok: 1 } }));
    expect(await apiRequest("/api/x", anything)).toEqual({ ok: 1 });
    expect(fetch.mock.calls[0]![0]).toBe("/api/x");
    expect(fetch.mock.calls[0]![1]).toMatchObject({ method: "GET", cache: "no-store" });
  });

  it("sends JSON bodies for POST", async () => {
    const fetch = stubFetch(() => json(202, { success: true, data: {} }));
    await apiRequest("/api/x", anything, { method: "POST", body: { a: 1 } });
    expect(fetch.mock.calls[0]![1]).toMatchObject({ method: "POST", body: '{"a":1}', headers: { "Content-Type": "application/json" } });
  });

  it("surfaces the backend's user-facing message and code for 4xx", async () => {
    stubFetch(() => json(400, { success: false, error: { code: "VALIDATION_ERROR", message: "Company URL must be a valid http(s) URL, e.g. https://example.com." } }));
    expect(await failure(apiRequest("/api/x", anything))).toMatchObject({
      kind: "http",
      code: "VALIDATION_ERROR",
      status: 400,
      message: "Company URL must be a valid http(s) URL, e.g. https://example.com.",
    });
  });

  it("uses a generic message for 5xx, never the body", async () => {
    stubFetch(() => json(500, { success: false, error: { code: "INTERNAL_ERROR", message: "Something went wrong." } }));
    const e = await failure(apiRequest("/api/x", anything));
    expect(e).toMatchObject({ kind: "http", code: "INTERNAL_ERROR", status: 500 });
    expect(e.message).toBe("The research service had a problem. Please try again in a moment.");
  });

  it("treats success:false with a 200 as an error", async () => {
    stubFetch(() => json(200, { success: false, error: { code: "X", message: "Nope." } }));
    expect(await failure(apiRequest("/api/x", anything))).toMatchObject({ kind: "http", message: "Nope." });
  });

  it("reports non-JSON and wrongly shaped responses as malformed, without their content", async () => {
    stubFetch(() => new Response("<html>Bad gateway</html>", { status: 200 }));
    expect(await failure(apiRequest("/api/x", anything))).toMatchObject({ kind: "malformed", message: "The research service sent an unexpected response. Please try again." });
    stubFetch(() => json(200, { data: 1 }));
    expect((await failure(apiRequest("/api/x", anything))).kind).toBe("malformed");
    stubFetch(() => json(200, { success: true, data: { wrong: true } }));
    expect((await failure(apiRequest("/api/x", (v): v is { right: true } => !!(v as { right?: boolean }).right))).kind).toBe("malformed");
  });

  it("treats an HTML 5xx (backend down behind the proxy) as a network problem", async () => {
    stubFetch(() => new Response("Internal Server Error", { status: 500 }));
    expect(await failure(apiRequest("/api/x", anything))).toMatchObject({ kind: "network", message: "Can't reach the research service. Check your connection and try again." });
  });

  it("maps fetch failures to a network error with a friendly message", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new TypeError("Failed to fetch: ECONNREFUSED 127.0.0.1:4000"))));
    const e = await failure(apiRequest("/api/x", anything));
    expect(e.kind).toBe("network");
    expect(e.message).not.toMatch(/ECONNREFUSED|127/);
  });

  it("reports caller aborts as aborted", async () => {
    vi.stubGlobal("fetch", vi.fn((_u: string, init: RequestInit) => new Promise((_r, reject) => init.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError"))))));
    const ctrl = new AbortController();
    const p = apiRequest("/api/x", anything, { signal: ctrl.signal });
    ctrl.abort();
    expect((await failure(p)).kind).toBe("aborted");
  });
});

describe("research endpoints", () => {
  it("POST /api/research with the request body; accepts queued / in_progress / existing", async () => {
    const fetch = stubFetch(() => json(202, { success: true, data: { status: "queued", job: JOB } }));
    expect(await startResearch({ companyName: "Wix", domain: "wix.com" })).toEqual({ status: "queued", job: JOB });
    expect(fetch.mock.calls[0]![0]).toBe("/api/research");
    expect(JSON.parse(String(fetch.mock.calls[0]![1]?.body))).toEqual({ companyName: "Wix", domain: "wix.com" });
  });

  it("GET /api/research/:id validates the job shape, including the status", async () => {
    const fetch = stubFetch(() => json(200, { success: true, data: { ...JOB, status: "detecting_category", progress: 40, currentStep: "Detecting category" } }));
    expect(await getResearchJob(JOB.id)).toMatchObject({ status: "detecting_category", progress: 40 });
    expect(fetch.mock.calls[0]![0]).toBe(`/api/research/${JOB.id}`);
    stubFetch(() => json(200, { success: true, data: { ...JOB, status: "thinking" } }));
    expect((await failure(getResearchJob(JOB.id))).kind).toBe("malformed");
  });
});
