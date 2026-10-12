/** CSS-only tooltip: shows on hover and keyboard focus of the wrapped element. */
export function Tooltip({ text, children, side = "top" }: { text: string; children: React.ReactNode; side?: "top" | "bottom" }) {
  return (
    <span className="group/tip relative inline-flex">
      {children}
      <span
        role="tooltip"
        className={`pointer-events-none absolute left-1/2 z-40 w-max max-w-60 -translate-x-1/2 rounded-lg bg-ink px-2.5 py-1.5 text-[11.5px] leading-snug font-medium text-white opacity-0 shadow-lift transition-opacity duration-150 group-hover/tip:opacity-100 group-focus-within/tip:opacity-100 ${
          side === "top" ? "bottom-full mb-2" : "top-full mt-2"
        }`}
      >
        {text}
      </span>
    </span>
  );
}
