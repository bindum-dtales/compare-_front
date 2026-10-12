import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

/** Change since the previous research run. */
export function Delta({ value, className = "" }: { value: number; className?: string }) {
  const Icon = value > 0 ? ArrowUpRight : value < 0 ? ArrowDownRight : Minus;
  const tone = value > 0 ? "text-good bg-good/10" : value < 0 ? "text-bad bg-bad/10" : "text-muted bg-line/70";
  return (
    <span className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11px] font-semibold tabular-nums ${tone} ${className}`}>
      <Icon className="size-3" strokeWidth={2.5} />
      {value > 0 ? `+${value}` : value === 0 ? "0" : value}
      <span className="sr-only"> points since last run</span>
    </span>
  );
}
