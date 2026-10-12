// Client-side checks for the research form, mirroring the backend's rules (back/src/utils/validation.ts,
// back/src/utils/domain.ts) so obvious mistakes are caught before a request. The backend stays
// authoritative: it re-validates and normalizes, and its message is shown if it disagrees.

const LABEL = /^(?!-)[a-z0-9-]{1,63}(?<!-)$/;
const TLD = /^(?:[a-z]{2,63}|xn--[a-z0-9-]{1,59})$/;
const MAX_NAME = 200;

/** "https://www.Acme.com/about?x=1" → "acme.com"; null when it can't be a public website. */
export function normalizeDomain(input: string): string | null {
  const raw = input.trim();
  if (!raw || /\s/.test(raw)) return null;
  const hasScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw);
  if (!hasScheme && /^[a-z][a-z0-9+.-]*:(?!\d)/i.test(raw)) return null; // mailto:, javascript:…
  let url: URL;
  try {
    url = new URL(hasScheme ? raw : `https://${raw}`);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  const host = url.hostname.replace(/\.$/, "").replace(/^www\./, "");
  const labels = host.split(".");
  if (labels.length < 2 || !labels.every((l) => LABEL.test(l)) || !TLD.test(labels.at(-1)!)) return null;
  return host;
}

/**
 * True for a website typed or pasted twice into the field, e.g. "wix.comwix.com",
 * "wix.comwww.wix.com" or "https://wix.comhttps://wix.com". The backend would accept the first two
 * as (nonexistent) hosts and research them, so they're caught here. Real hosts are never one
 * domain written twice.
 */
export function isRepeatedDomain(input: string): boolean {
  const raw = input.trim();
  if ((raw.match(/:\/\//g) ?? []).length > 1) return true;
  const host = normalizeDomain(raw);
  if (!host) return false;
  for (let i = 4; i <= host.length - 4; i++) {
    const first = host.slice(0, i);
    if (host.slice(i).replace(/^\.?(?:www\.)?/, "") === first && normalizeDomain(first) === first) return true;
  }
  return false;
}

const REPEATED = "This website looks like it was entered twice. Enter it once, e.g. example.com.";

export interface ResearchInput {
  companyName: string;
  domain: string;
}

export type ResearchInputErrors = Partial<Record<keyof ResearchInput, string>>;

/** Field errors (messages match the backend's, plus the repeated-website check), or null with the trimmed name and normalized domain. */
export function validateResearchInput(input: ResearchInput): { errors: ResearchInputErrors; value: null } | { errors: null; value: ResearchInput } {
  const errors: ResearchInputErrors = {};
  const companyName = input.companyName.trim();
  if (!companyName) errors.companyName = "Company name is required.";
  else if (companyName.length > MAX_NAME) errors.companyName = `Company name must be at most ${MAX_NAME} characters.`;
  else if (!/[\p{L}\p{N}]/u.test(companyName)) errors.companyName = "Company name must contain letters or digits.";

  const domain = normalizeDomain(input.domain);
  if (!input.domain.trim()) errors.domain = "Company URL is required.";
  else if (isRepeatedDomain(input.domain)) errors.domain = REPEATED;
  else if (!domain) errors.domain = "Company URL must be a valid http(s) URL, e.g. https://example.com.";

  return Object.keys(errors).length ? { errors, value: null } : { errors: null, value: { companyName, domain: domain! } };
}
