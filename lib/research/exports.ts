// Export history kept in the browser (the backend stores research, not downloads). Pure helpers.
import type { ExportRecord } from "../types";

const MAX_KEPT = 100;

const isRecord = (v: unknown): v is ExportRecord => {
  if (!v || typeof v !== "object") return false;
  const r = v as Record<string, unknown>;
  return (
    typeof r.id === "string" &&
    typeof r.title === "string" &&
    (r.format === "CSV" || r.format === "PDF") &&
    typeof r.createdAt === "string" &&
    !Number.isNaN(Date.parse(r.createdAt)) &&
    typeof r.size === "string"
  );
};

/** Saved history → records, newest first; anything unreadable is dropped rather than shown. */
export function parseExports(raw: string | null): ExportRecord[] {
  if (!raw) return [];
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return [];
  }
  return (Array.isArray(data) ? data.filter(isRecord) : []).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, MAX_KEPT);
}

/** "18 KB" for a measured download. A printed PDF's size isn't knowable (the browser's print dialog saves it). */
export const sizeLabel = (bytes: number | null) => (bytes === null ? "—" : `${Math.max(1, Math.round(bytes / 1024))} KB`);
