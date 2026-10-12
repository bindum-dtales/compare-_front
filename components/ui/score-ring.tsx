"use client";

import { useEffect, useState } from "react";

/** Circular score indicator; animates from 0 on mount and whenever the score changes. */
export function ScoreRing({
  score,
  color,
  size = 52,
  stroke = 4.5,
  label,
}: {
  score: number;
  color: string;
  size?: number;
  stroke?: number;
  label?: string;
}) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(score));
    return () => cancelAnimationFrame(id);
  }, [score]);

  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative" style={{ width: size, height: size }} role="img" aria-label={`${label ?? "Score"} ${score} out of 100`}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeOpacity={0.14} strokeWidth={stroke} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - shown / 100)}
            style={{ transition: "stroke-dashoffset 1.1s cubic-bezier(0.2, 0.7, 0.2, 1)" }}
          />
        </svg>
        <span className="absolute inset-0 grid place-items-center text-[15px] font-bold tabular-nums" style={{ fontSize: size * 0.3 }}>
          {score}
        </span>
      </div>
      {label && <span className="text-[11px] font-medium text-muted">{label}</span>}
    </div>
  );
}
