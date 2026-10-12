import type { NextConfig } from "next";
import { PHASE_PRODUCTION_BUILD, PHASE_PRODUCTION_SERVER } from "next/constants";
import { apiRewrites, resolveApiConfig } from "./lib/config/api";

// Allow the dev server to be reached through a Cloudflare tunnel.
// Quick tunnels use *.trycloudflare.com; add a named-tunnel hostname via
// DEV_ORIGINS="compare.example.com,other.example.com".
const extraOrigins = (process.env.DEV_ORIGINS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

export default function config(phase: string): NextConfig {
  // The research API (lib/config/api.ts). By default the browser calls same-origin /api/* and Next
  // proxies it to BACKEND_URL (server-side only, never sent to the browser), so the backend's CORS
  // allow-list and the tunnel / production hostname never have to match. `next build` bakes the
  // rewrite in and fails without BACKEND_URL; `next start` serves the built one and doesn't re-read it.
  const api = phase === PHASE_PRODUCTION_SERVER ? null : resolveApiConfig(process.env, { production: phase === PHASE_PRODUCTION_BUILD });

  return {
    allowedDevOrigins: ["*.trycloudflare.com", "dtales.tech", "**.dtales.tech", ...extraOrigins],
    async rewrites() {
      return api ? apiRewrites(api) : [];
    },
  };
}
