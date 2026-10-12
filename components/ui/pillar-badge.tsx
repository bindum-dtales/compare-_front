import { PILLARS } from "@/lib/pillars";
import type { Pillar } from "@/lib/types";

export function PillarBadge({ pillar }: { pillar: Pillar }) {
  const p = PILLARS[pillar];
  return (
    <span className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[10.5px] font-bold tracking-wide" style={{ background: p.soft, color: p.ink }}>
      {p.label}
    </span>
  );
}
