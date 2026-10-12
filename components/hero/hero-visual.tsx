import { Bot, MessageSquareText, Search } from "lucide-react";
import { Caveat } from "next/font/google";
import { PILLAR_LIST } from "@/lib/pillars";

const hand = Caveat({ subsets: ["latin"], weight: "500" });
const ICONS = { seo: Search, aeo: MessageSquareText, geo: Bot };

/** Three stacked isometric slabs: one search, three perspectives. */
export function HeroVisual() {
  return (
    <div className="relative h-[360px] w-full select-none" aria-hidden>
      {/* Concentric orbit lines + dot grid */}
      <svg className="absolute -right-10 -top-16 h-[460px] w-[560px] text-accent-strong" viewBox="0 0 560 460" fill="none">
        {[120, 170, 220, 270].map((r, i) => (
          <circle key={r} cx="330" cy="230" r={r} stroke="currentColor" strokeOpacity={0.16 - i * 0.03} strokeDasharray={i % 2 ? "2 6" : undefined} />
        ))}
        {Array.from({ length: 6 }).map((_, row) =>
          Array.from({ length: 6 }).map((_, col) => (
            <circle key={`${row}-${col}`} cx={40 + col * 16} cy={300 + row * 16} r="1.4" fill="currentColor" fillOpacity={0.28} />
          )),
        )}
      </svg>

      <p className={`${hand.className} absolute right-2 top-0 rotate-[-6deg] text-right text-[21px] leading-[1.05] text-ink-2`}>
        One search.
        <br />
        Three perspectives.
      </p>
      <svg className="absolute right-24 top-14 w-14 text-ink-2" viewBox="0 0 60 40" fill="none">
        <path d="M55 4C40 6 18 14 8 34" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        <path d="M5 26l3 9 8-5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>

      <div className="absolute inset-0 [perspective:1400px]">
        <div className="absolute left-[2%] top-[22%] [transform-style:preserve-3d] [transform:rotateX(40deg)_rotateZ(-28deg)]">
          {PILLAR_LIST.map((p, i) => {
            const Icon = ICONS[p.id];
            return (
              <div
                key={p.id}
                className="absolute animate-float"
                style={{ left: i * 30, top: i * 104, animationDelay: `${i * -2.2}s`, transform: `translateZ(${(2 - i) * 18}px)` }}
              >
                <div
                  className="flex h-[86px] w-[200px] items-center gap-4 rounded-[18px] border border-white bg-gradient-to-br from-white to-[#FFFBEC] px-5"
                  style={{ boxShadow: `0 7px 0 #F1E4B8, 0 24px 40px -14px rgb(160 120 0 / 0.35)` }}
                >
                  <span className="grid size-11 place-items-center rounded-xl" style={{ background: p.soft, color: p.color }}>
                    <Icon className="size-[22px]" strokeWidth={2} />
                  </span>
                  <span>
                    <span className="block text-[22px] font-extrabold leading-none tracking-tight">{p.label}</span>
                    <span className="mt-1 block text-[12px] font-medium text-muted">{p.engines}</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
