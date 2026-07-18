"use client";

export type JourneyBarProps = {
  currentStop: number;
  totalStops: number;
  level: 0 | 1 | 2 | 3 | 4;
};

const CHALLENGE_LABELS = ["Simula", "Umuusad", "Sige pa", "Hamon!", "Bituin!"];

export default function JourneyBar({ currentStop, totalStops, level }: JourneyBarProps) {
  const lastStop = Math.max(1, totalStops - 1);
  const safeStop = Math.min(Math.max(0, currentStop), lastStop);
  const progress = (safeStop / lastStop) * 100;
  const challenge = level >= 3;

  return (
    <section className="mt-3 rounded-[22px] border-2 border-[#FFB703]/35 bg-white px-4 py-3 shadow-[0_6px_16px_rgba(180,140,60,.1)]" aria-label="Reading trail">
      <div className="flex items-center justify-between gap-3">
        <span className="font-display text-sm font-bold">Reading trail · Landas ng pagbasa</span>
        <span className={`flex items-center gap-1 text-xs font-extrabold ${challenge ? "text-[#FB8500]" : "text-[#D69400]"}`}>
          <span className={challenge ? "soft-pop" : ""} aria-hidden="true">⭐</span>
          {CHALLENGE_LABELS[level]}
        </span>
      </div>
      <div className="relative mt-2 h-9" role="progressbar" aria-valuemin={0} aria-valuemax={lastStop} aria-valuenow={safeStop}>
        <div className="absolute inset-x-1 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-[#F0E4C8]" />
        <div className="absolute left-1 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-[#6BBF59] transition-[width] duration-500 motion-reduce:transition-none" style={{ width: `calc(${progress}% - 4px)` }} />
        <span className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 text-2xl drop-shadow-sm transition-[left] duration-500 motion-reduce:transition-none" style={{ left: `${progress}%` }} aria-hidden="true">🐣</span>
        <span className="absolute right-0 top-1/2 -translate-y-1/2 text-xl" aria-hidden="true">🏁</span>
      </div>
    </section>
  );
}
