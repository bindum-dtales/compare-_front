import { afterEach, describe, expect, it, vi } from "vitest";
import { PHASE_DEVELOPMENT_SERVER, PHASE_PRODUCTION_BUILD, PHASE_PRODUCTION_SERVER } from "next/constants";
import { ApiConfigError, LOCAL_BACKEND_URL, apiRewrites, resolveApiConfig } from "./api";
import { nextConfig } from "./next-config";

const local = (env: Record<string, string | undefined> = {}) => resolveApiConfig(env, { production: false });
const prod = (env: Record<string, string | undefined> = {}) => resolveApiConfig(env, { production: true });

function configError(fn: () => unknown): ApiConfigError {
  try {
    fn();
  } catch (e) {
    if (e instanceof ApiConfigError) return e;
    throw e;
  }
  throw new Error("expected an ApiConfigError");
}

describe("local API configuration", () => {
  it("proxies to the local backend on :4000 by default", () => {
    expect(LOCAL_BACKEND_URL).toBe("http://localhost:4000");
    expect(local()).toEqual({ mode: "proxy", backendUrl: "http://localhost:4000" });
    expect(local({ BACKEND_URL: "  " })).toEqual({ mode: "proxy", backendUrl: "http://localhost:4000" });
  });

  it("honours BACKEND_URL, including plain http to another machine", () => {
    expect(local({ BACKEND_URL: "http://192.168.1.20:4000/" })).toEqual({ mode: "proxy", backendUrl: "http://192.168.1.20:4000" });
  });

  it("uses direct mode when NEXT_PUBLIC_API_BASE_URL is set", () => {
    expect(local({ NEXT_PUBLIC_API_BASE_URL: "http://localhost:4000" })).toEqual({ mode: "direct", publicApiBase: "http://localhost:4000" });
  });
});

describe("production API configuration", () => {
  it("proxies to an https BACKEND_URL, normalised to its origin", () => {
    expect(prod({ BACKEND_URL: "https://api.example.com/" })).toEqual({ mode: "proxy", backendUrl: "https://api.example.com" });
  });

  it("allows plain http only to a backend on the same machine", () => {
    expect(prod({ BACKEND_URL: "http://127.0.0.1:4000" })).toEqual({ mode: "proxy", backendUrl: "http://127.0.0.1:4000" });
    expect(configError(() => prod({ BACKEND_URL: "http://203.0.113.10:4000" })).message).toMatch(/https/);
  });

  it("direct mode needs a public https origin", () => {
    expect(prod({ NEXT_PUBLIC_API_BASE_URL: "https://api.example.com" })).toEqual({ mode: "direct", publicApiBase: "https://api.example.com" });
    for (const bad of ["http://api.example.com", "https://localhost:4000", "http://127.0.0.1:4000"]) {
      expect(configError(() => prod({ NEXT_PUBLIC_API_BASE_URL: bad })).message).toMatch(/public https origin/);
    }
  });
});

describe("missing or invalid API configuration", () => {
  it("a production build without BACKEND_URL fails clearly instead of falling back to localhost", () => {
    for (const env of [{}, { BACKEND_URL: "" }, { BACKEND_URL: "   " }]) {
      expect(configError(() => prod(env)).message).toMatch(/BACKEND_URL is not set/);
    }
  });

  it("rejects values that aren't a bare http(s) origin", () => {
    for (const bad of ["api.example.com", "ftp://api.example.com", "https://api.example.com/api", "https://api.example.com/?x=1", "https://user:pw@api.example.com"]) {
      expect(() => local({ BACKEND_URL: bad })).toThrow(ApiConfigError);
      expect(() => prod({ NEXT_PUBLIC_API_BASE_URL: bad })).toThrow(ApiConfigError);
    }
  });

  it("rejects an ambiguous configuration with both modes set", () => {
    expect(configError(() => local({ BACKEND_URL: "http://localhost:4000", NEXT_PUBLIC_API_BASE_URL: "http://localhost:4000" })).message).toMatch(/not both/);
  });

  it("errors never echo the configured value", () => {
    const e = configError(() => prod({ BACKEND_URL: "http://secret-host.internal:4000" }));
    expect(e.message).not.toContain("secret-host");
  });
});

describe("proxy destination (next-config.ts)", () => {
  afterEach(() => vi.unstubAllEnvs());

  const rewritesFor = async (phase: string) => (await nextConfig(phase).rewrites?.()) ?? [];

  it("dev proxies /api/* to the local backend", async () => {
    vi.stubEnv("BACKEND_URL", "");
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "");
    expect(await rewritesFor(PHASE_DEVELOPMENT_SERVER)).toEqual([{ source: "/api/:path*", destination: "http://localhost:4000/api/:path*" }]);
  });

  it("a production build proxies /api/* to BACKEND_URL", async () => {
    vi.stubEnv("BACKEND_URL", "https://api.example.com");
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "");
    expect(await rewritesFor(PHASE_PRODUCTION_BUILD)).toEqual([{ source: "/api/:path*", destination: "https://api.example.com/api/:path*" }]);
  });

  it("a production build without BACKEND_URL throws", () => {
    vi.stubEnv("BACKEND_URL", "");
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "");
    expect(() => nextConfig(PHASE_PRODUCTION_BUILD)).toThrow(/BACKEND_URL is not set/);
  });

  it("`next start` doesn't re-validate: it serves the rewrite baked in at build", () => {
    vi.stubEnv("BACKEND_URL", "");
    expect(() => nextConfig(PHASE_PRODUCTION_SERVER)).not.toThrow();
  });

  it("direct mode registers no rewrite", () => {
    expect(apiRewrites({ mode: "direct", publicApiBase: "https://api.example.com" })).toEqual([]);
  });
});

describe("direct API origin (lib/api/client.ts)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("is same-origin by default and prefixes NEXT_PUBLIC_API_BASE_URL when set", async () => {
    const spy = vi.fn<(url: string) => Promise<Response>>(() => Promise.resolve(new Response(JSON.stringify({ success: true, data: [] }), { status: 200 })));
    vi.stubGlobal("fetch", spy);

    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "");
    vi.resetModules();
    await (await import("../api/research")).listCompanies();
    expect(spy.mock.calls[0]?.[0]).toBe("/api/companies");

    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "https://api.example.com/");
    vi.resetModules();
    await (await import("../api/research")).listCompanies();
    expect(spy.mock.calls[1]?.[0]).toBe("https://api.example.com/api/companies");
  });
});
