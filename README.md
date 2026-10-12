# LinkEye — frontend

SEO · AEO · GEO competitive intelligence dashboard. Next.js app that reads research from the
Express backend in `../back`.

```bash
npm install
npm run dev        # http://localhost:3000 (binds 0.0.0.0); proxies /api/* to http://localhost:4000
npm run tunnel     # in a second terminal: public *.trycloudflare.com URL
```

Start the backend too (`cd ../back && npm run dev`). Named Cloudflare tunnel on your own hostname?
Allow it for the dev server: `DEV_ORIGINS=compare.yourdomain.com npm run dev` (`*.dtales.tech` is
already allowed).

## API configuration

The browser only ever calls same-origin `/api/*`; Next forwards it to `BACKEND_URL` (see
`lib/config/api.ts` and `.env.example`). The backend origin never appears in browser code, and the
backend needs no CORS entry for this frontend.

`BACKEND_URL` is **baked in at build time** (Next writes the rewrite into
`.next/routes-manifest.json`), so a production build needs it and fails without it:

```bash
BACKEND_URL=https://api.example.com npm run build
npm start          # next start: a Node.js server is required for the /api proxy
```

`npm run build` uses webpack (`next build --webpack`); `npm run dev` keeps Turbopack. Turbopack runs
PostCSS (Tailwind) in a child process started as `node` from `PATH`, not the Node binary running the
build, so it fails ("node process exited before we could connect to it") on hosts such as Hostinger
where `PATH` has no working `node`. Webpack runs PostCSS in-process.

Static hosting (no Node server) can't run the proxy. That would be a different hosting model
(`output: "export"`, not configured today) with `NEXT_PUBLIC_API_BASE_URL` set to the backend origin
instead of `BACKEND_URL`, plus the frontend origin in the backend's `FRONTEND_URL`.

## Data

All UI data comes from `lib/services/research.ts`, which reads the backend through the typed calls
in `lib/api/`. `NEXT_PUBLIC_DEMO_DATA=1` serves the bundled sample companies (`lib/mock-data/`)
instead. The types in `lib/types.ts` are the contract the components rely on.
