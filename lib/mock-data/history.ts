import type { ComparisonSummary, ExportRecord } from "../types";

export const SAVED_COMPARISONS: ComparisonSummary[] = [
  { id: "cmp-dtales", subjectId: "dtales", subject: "DTales Tech", competitors: ["Webflow", "Notion", "Vercel"], category: "Technology & Digital Agency", updatedAt: "2026-09-28", status: "complete" },
  { id: "cmp-hubspot", subjectId: "hubspot", subject: "HubSpot", competitors: ["Webflow", "Notion", "Vercel"], category: "Technology & Digital Agency", updatedAt: "2026-09-21", status: "complete" },
  { id: "cmp-webflow", subjectId: "webflow", subject: "Webflow", competitors: ["Notion", "Vercel", "HubSpot"], category: "Technology & Digital Agency", updatedAt: "2026-09-14", status: "refreshing" },
  { id: "cmp-notion", subjectId: "notion", subject: "Notion", competitors: ["Webflow", "Vercel", "HubSpot"], category: "Technology & Digital Agency", updatedAt: "2026-08-30", status: "complete" },
];

export const EXPORT_HISTORY: ExportRecord[] = [
  { id: "exp-3", title: "DTales Tech vs 3 competitors", format: "PDF", createdAt: "2026-09-28T10:42:00", size: "2.4 MB" },
  { id: "exp-2", title: "HubSpot vs 3 competitors", format: "CSV", createdAt: "2026-09-21T16:05:00", size: "18 KB" },
  { id: "exp-1", title: "DTales Tech vs 3 competitors", format: "PDF", createdAt: "2026-09-02T09:15:00", size: "2.1 MB" },
];
