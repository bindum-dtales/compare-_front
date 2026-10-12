import Image from "next/image";

/**
 * The DTales logo (public/dtales-logo.png, 460×143). Its wordmark is white on transparent, so it
 * sits on a navy plate; the image already carries the name, so no text goes beside it.
 */
export function Logo({ className = "h-10" }: { className?: string }) {
  return (
    <span className={`block aspect-[460/143] overflow-hidden rounded-[10px] bg-ink ${className}`}>
      <Image src="/dtales-logo.png" alt="DTales" width={460} height={143} unoptimized loading="eager" className="size-full" />
    </span>
  );
}
