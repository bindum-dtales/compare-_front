// Where the frontend's /api calls go. Read by next.config.ts when it builds the /api rewrite, so it
// must stay free of Next and React imports.
//
// Two modes, chosen by which variable is set:
//   proxy  (default)  the browser calls same-origin /api/*, and the Next server forwards to
//                     BACKEND_URL. Needs `next start` (a Node server); the backend never sees a
//                     cross-origin browser request.
//   direct            NEXT_PUBLIC_API_BASE_URL is set: the browser calls that origin itself (e.g.
//                     static hosting with no Next server). The backend must allow this frontend in
//                     its FRONTEND_URL CORS list.
//
// Both values are baked in by `next build`: rewrites go into .next/routes-manifest.json and
// NEXT_PUBLIC_* into the browser bundle. Setting them only for `next start` does nothing, which is
// why a production build fails here instead of quietly falling back to localhost.

export const LOCAL_BACKEND_URL = "http://localhost:4000";

export type ApiConfig = { mode: "proxy"; backendUrl: string } | { mode: "direct"; publicApiBase: string };

export class ApiConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApiConfigError";
  }
}

const LOOPBACK = new Set(["localhost", "127.0.0.1", "[::1]"]);

/** Validates an absolute http(s) origin ("https://api.example.com", no path) and drops a trailing slash. */
function parseOrigin(name: string, raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new ApiConfigError(`${name} must be an absolute URL such as https://api.example.com.`);
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new ApiConfigError(`${name} must use http or https.`);
  if (url.username || url.password) throw new ApiConfigError(`${name} must not contain credentials.`);
  if (url.pathname !== "/" || url.search || url.hash) {
    throw new ApiConfigError(`${name} must be an origin only (scheme, host and optional port), without a path: /api is added automatically.`);
  }
  return url;
}

/**
 * Resolves and validates the API configuration. `production` is true for `next build`: then the
 * backend must be configured explicitly and must not be plain http over the network.
 */
export function resolveApiConfig(env: Record<string, string | undefined>, { production }: { production: boolean }): ApiConfig {
  const backend = env.BACKEND_URL?.trim() || undefined;
  const publicBase = env.NEXT_PUBLIC_API_BASE_URL?.trim() || undefined;

  if (backend && publicBase) {
    throw new ApiConfigError("Set either BACKEND_URL (proxy through Next) or NEXT_PUBLIC_API_BASE_URL (browser calls the backend directly), not both.");
  }

  if (publicBase) {
    const url = parseOrigin("NEXT_PUBLIC_API_BASE_URL", publicBase);
    // Browsers of real users would call their own machine, or send research data in clear text.
    if (production && (LOOPBACK.has(url.hostname) || url.protocol !== "https:")) {
      throw new ApiConfigError("NEXT_PUBLIC_API_BASE_URL must be a public https origin in a production build.");
    }
    return { mode: "direct", publicApiBase: url.origin };
  }

  if (!backend) {
    if (production) {
      throw new ApiConfigError(
        "BACKEND_URL is not set. A production build needs the backend's origin, e.g. BACKEND_URL=https://api.example.com npm run build " +
          "(it is baked into the build; see .env.example).",
      );
    }
    return { mode: "proxy", backendUrl: LOCAL_BACKEND_URL };
  }

  const url = parseOrigin("BACKEND_URL", backend);
  // Plain http is fine to a backend on the same machine; across the network the proxy hop must be TLS.
  if (production && url.protocol !== "https:" && !LOOPBACK.has(url.hostname)) {
    throw new ApiConfigError("BACKEND_URL must use https in a production build unless the backend runs on the same machine (localhost / 127.0.0.1).");
  }
  return { mode: "proxy", backendUrl: url.origin };
}

/** The Next rewrite for proxy mode; none in direct mode (the browser calls the backend itself). */
export function apiRewrites(config: ApiConfig): { source: string; destination: string }[] {
  return config.mode === "proxy" ? [{ source: "/api/:path*", destination: `${config.backendUrl}/api/:path*` }] : [];
}
