import type { Company } from "@/lib/types";

export function CompanyLogo({ company, size = 40 }: { company: Company; size?: number }) {
  const { mark, bg, fg } = company.logo;
  return (
    <span
      aria-hidden
      className="grid shrink-0 place-items-center rounded-[10px] font-bold ring-1 ring-inset ring-black/[0.06]"
      style={{ width: size, height: size, background: bg, color: fg, fontSize: size * 0.42 }}
    >
      {mark}
    </span>
  );
}
