import { formatScore, splitScore } from "@/lib/research/scoreboard";

/**
 * A backend score, shown exactly: the whole number large, any decimals smaller (84.75 → 84.75 with
 * ".75" set back). The exact value is also the tooltip and the accessible label.
 */
export function ScoreFigure({ value, className = "", muted = false }: { value: number; className?: string; muted?: boolean }) {
  const { whole, fraction } = splitScore(value);
  const exact = formatScore(value);
  return (
    <span title={`${exact} out of 100`} aria-label={`${exact} out of 100`} className={`inline-flex items-baseline font-extrabold leading-none tabular-nums tracking-[-0.045em] ${muted ? "text-muted" : "text-ink"} ${className}`}>
      <span aria-hidden>{whole}</span>
      {fraction && (
        <span aria-hidden className="ml-[0.04em] text-[0.46em] font-bold tracking-[-0.02em] opacity-70">
          {fraction}
        </span>
      )}
    </span>
  );
}

/** A 0–100 track filled to the real score; grows in once `shown`. */
export function ScoreBar({ score, color, shown = true, className = "h-2" }: { score: number; color: string; shown?: boolean; className?: string }) {
  return (
    <div className={`overflow-hidden rounded-full bg-line/70 ${className}`} aria-hidden>
      <div
        className="h-full rounded-full transition-[width] duration-[1100ms] ease-[cubic-bezier(0.2,0.7,0.2,1)]"
        style={{ width: shown ? `${Math.max(0, Math.min(100, score))}%` : 0, background: color }}
      />
    </div>
  );
}
