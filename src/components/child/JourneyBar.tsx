"use client";

export type JourneyBarProps = {
  currentStop: number;
  totalStops: number;
  level: 0 | 1 | 2 | 3 | 4;
};

export default function JourneyBar({
  currentStop,
  totalStops,
  level,
}: JourneyBarProps) {
  const lastStop = Math.max(0, totalStops - 1);
  const safeStop = Math.min(Math.max(0, currentStop), lastStop);
  const progress = lastStop === 0 ? 0 : (safeStop / lastStop) * 100;
  const stops = Array.from({ length: Math.max(0, totalStops) });

  return (
    <section
      className="flex w-full items-center gap-4 rounded-3xl border-2 border-white/80 bg-white/85 px-4 py-4 shadow-sm backdrop-blur-sm"
      aria-label="Learning journey"
    >
      <div
        className="relative min-w-0 flex-1 py-5"
        role="progressbar"
        aria-label="Journey progress"
        aria-valuemin={0}
        aria-valuemax={lastStop}
        aria-valuenow={safeStop}
      >
        <div className="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-sky-100" />
        <div
          className="absolute left-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-emerald-400 transition-[width] duration-500 ease-out motion-reduce:transition-none"
          style={{ width: `${progress}%` }}
        />

        <div className="absolute inset-x-0 top-1/2 flex -translate-y-1/2 items-center justify-between">
          {stops.map((_, index) => (
            <span
              key={index}
              className={`h-2 w-2 shrink-0 rounded-full ring-2 ring-white transition-colors duration-300 ${
                index <= safeStop ? "bg-emerald-500" : "bg-sky-200"
              }`}
              aria-hidden="true"
            />
          ))}
        </div>

        <span
          className="absolute top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white p-1 text-2xl leading-none shadow-md transition-[left] duration-500 ease-out motion-reduce:transition-none"
          style={{ left: `${progress}%` }}
          aria-hidden="true"
        >
          🦉
        </span>

        <span
          className="absolute right-0 top-1/2 translate-x-1 -translate-y-1/2 text-xl"
          aria-hidden="true"
        >
          🏁
        </span>
      </div>

      <div
        className="flex shrink-0 flex-col-reverse gap-1"
        role="img"
        aria-label={`Challenge height ${level + 1} of 5`}
      >
        {[0, 1, 2, 3, 4].map((dot) => (
          <span
            key={dot}
            className={`h-2.5 w-2.5 rounded-full border-2 transition-all duration-300 motion-reduce:transition-none ${
              dot <= level
                ? "scale-110 border-amber-500 bg-amber-400 shadow-sm"
                : "border-slate-200 bg-slate-100"
            }`}
            aria-hidden="true"
          />
        ))}
      </div>
    </section>
  );
}
