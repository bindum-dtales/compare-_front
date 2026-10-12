"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { COMPANY_COLORS, PILLARS } from "@/lib/pillars";
import type { CompanyResearch, Pillar } from "@/lib/types";

/** Grouped bars: one group per sub-metric, one bar per company. */
export function MetricBarChart({ pillar, companies }: { pillar: Pillar; companies: CompanyResearch[] }) {
  const data = PILLARS[pillar].metrics.map((m, i) => ({
    metric: m.label,
    ...Object.fromEntries(companies.map((c) => [c.company.name, c.pillars[pillar].subMetrics[i].score])),
  }));

  return (
    <div className="h-[280px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} barGap={3} barCategoryGap="22%" margin={{ top: 8, right: 4, bottom: 0, left: -24 }}>
          <CartesianGrid vertical={false} stroke="#EDF1F6" />
          <XAxis dataKey="metric" tickLine={false} axisLine={false} tick={{ fontSize: 11.5, fill: "#334155" }} interval={0} />
          <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#94a3b8" }} />
          <Tooltip
            cursor={{ fill: "rgb(37 99 235 / 0.06)" }}
            contentStyle={{ borderRadius: 12, border: "1px solid #E2E8F0", boxShadow: "0 10px 30px -12px rgb(15 23 42 / 0.18)", fontSize: 12 }}
            labelStyle={{ fontWeight: 600, marginBottom: 4 }}
          />
          {companies.map((c, i) => (
            <Bar key={c.company.id} dataKey={c.company.name} fill={COMPANY_COLORS[i]} radius={[4, 4, 0, 0]} maxBarSize={18} animationDuration={700} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
