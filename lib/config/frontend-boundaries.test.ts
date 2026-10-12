// Static checks over the frontend source and, when a build exists, the browser bundle: one HTTP
// entry point, no hardcoded backend hosts, no Supabase, no backend secrets.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const BROWSER_ENV = ["NEXT_PUBLIC_API_BASE_URL", "NEXT_PUBLIC_DEMO_DATA"];

function walk(dir: string, keep: (path: string) => boolean): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path, keep) : keep(path) ? [path] : [];
  });
}

/** Application code that can end up in the browser or server bundle (tests excluded). */
const sources = ["app", "components", "lib"]
  .flatMap((d) => walk(join(ROOT, d), (p) => /\.(ts|tsx|js|jsx|mjs)$/.test(p) && !/\.test\.ts$/.test(p)))
  .map((path) => ({ file: relative(ROOT, path), text: readFileSync(path, "utf8") }))
  // Code only: block comments and whole-line // comments removed, so prose like "never fetch()" doesn't count.
  .map((s) => ({ ...s, code: s.text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "") }));

const offending = (pattern: RegExp, except: string[] = []) => sources.filter((s) => !except.includes(s.file) && pattern.test(s.code)).map((s) => s.file);

describe("frontend API boundaries", () => {
  it("scans the real source tree", () => {
    expect(sources.map((s) => s.file)).toEqual(expect.arrayContaining(["lib/api/client.ts", "lib/api/research.ts", "lib/research/run.ts"]));
  });

  it("only lib/api/client.ts calls fetch()", () => {
    expect(offending(/\bfetch\s*\(/, ["lib/api/client.ts"])).toEqual([]);
  });

  it("has no hardcoded backend, tunnel or obsolete hosting URLs in active code", () => {
    // lib/config/api.ts holds the one local default (http://localhost:4000) and the loopback list.
    expect(offending(/localhost:\d+|127\.0\.0\.1|onrender\.com|\.render\.com|trycloudflare\.com|ngrok|loca\.lt|vercel\.app/i, ["lib/config/api.ts"])).toEqual([]);
    expect(readFileSync(join(ROOT, "next.config.ts"), "utf8")).not.toMatch(/https?:\/\//);
  });

  it("never talks to Supabase or a research provider directly", () => {
    expect(offending(/@supabase|supabase\.co|api\.groq\.com|api\.tavily\.com|r\.jina\.ai/i)).toEqual([]);
    const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
    expect(Object.keys({ ...pkg.dependencies, ...pkg.devDependencies }).filter((d) => /supabase/.test(d))).toEqual([]);
  });

  it("reads only the approved public env vars in app code", () => {
    const names = sources.flatMap((s) => [...s.code.matchAll(/process\.env\.([A-Z0-9_]+)/g)].map((m) => m[1]));
    expect([...new Set(names)].filter((n) => !BROWSER_ENV.includes(n!))).toEqual([]);
    expect(offending(/process\.env\[/)).toEqual([]);
  });

  it("mentions no backend secret names in app code", () => {
    expect(offending(/SERVICE_ROLE|SUPABASE_|GROQ_API|TAVILY_API|JINA_API|_API_KEY|_SECRET/)).toEqual([]);
  });

  it("declares no secret-looking NEXT_PUBLIC_ variables anywhere in config or examples", () => {
    const files = ["next.config.ts", ".env.example", "README.md"].map((f) => join(ROOT, f)).filter(existsSync);
    const names = [...sources.map((s) => s.text), ...files.map((f) => readFileSync(f, "utf8"))].flatMap((t) => [...t.matchAll(/NEXT_PUBLIC_[A-Z0-9_]+/g)].map((m) => m[0]));
    expect([...new Set(names)].filter((n) => !BROWSER_ENV.includes(n))).toEqual([]);
  });
});

describe("browser bundle (after `npm run build`)", () => {
  const staticDir = join(ROOT, ".next", "static");
  const bundle = walk(staticDir, (p) => p.endsWith(".js"));

  it.skipIf(bundle.length === 0)("contains no backend secret names or values", () => {
    const text = bundle.map((p) => readFileSync(p, "utf8")).join("\n");
    expect(text).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY|GROQ_API_KEY|TAVILY_API_KEY|JINA_API_KEY/);
    expect(text).not.toMatch(/BACKEND_URL/);

    // Values from the backend's local .env, compared without printing them: only key names are reported.
    const backEnv = join(ROOT, "..", "back", ".env");
    const secrets = existsSync(backEnv)
      ? readFileSync(backEnv, "utf8")
          .split("\n")
          .map((l) => /^\s*([A-Z0-9_]*(?:KEY|SECRET|TOKEN)[A-Z0-9_]*)\s*=\s*(.+?)\s*$/.exec(l))
          .filter((m): m is RegExpExecArray => !!m && m[2]!.length >= 8)
      : [];
    expect(secrets.filter((m) => text.includes(m[2]!)).map((m) => m[1])).toEqual([]);
  });
});
