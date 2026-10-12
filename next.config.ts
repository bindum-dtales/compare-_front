// The phase-dependent config (dev origins, /api proxy to BACKEND_URL) lives in lib/config/next-config.ts
// so its tests import it directly instead of resolving this root file.
export { nextConfig as default } from "./lib/config/next-config";
