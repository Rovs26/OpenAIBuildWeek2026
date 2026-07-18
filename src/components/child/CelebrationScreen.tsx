"use client";

export type CelebrationScreenProps = {
  avatarEmoji?: string;
  onDone?: () => void;
};

const CONFETTI = [
  "left-[6%] top-[8%] rotate-12 bg-fuchsia-400 animate-bounce",
  "left-[18%] top-[22%] -rotate-12 bg-sky-400 animate-pulse",
  "left-[30%] top-[7%] rotate-45 bg-amber-400 animate-bounce [animation-delay:150ms]",
  "left-[42%] top-[16%] -rotate-6 bg-emerald-400 animate-pulse [animation-delay:300ms]",
  "right-[42%] top-[5%] rotate-12 bg-rose-400 animate-bounce [animation-delay:450ms]",
  "right-[29%] top-[20%] -rotate-45 bg-violet-400 animate-pulse [animation-delay:200ms]",
  "right-[17%] top-[8%] rotate-6 bg-cyan-400 animate-bounce [animation-delay:350ms]",
  "right-[5%] top-[24%] -rotate-12 bg-orange-400 animate-pulse [animation-delay:500ms]",
  "left-[10%] bottom-[18%] rotate-45 bg-violet-400 animate-bounce [animation-delay:250ms]",
  "right-[10%] bottom-[14%] -rotate-45 bg-emerald-400 animate-bounce [animation-delay:400ms]",
] as const;

export default function CelebrationScreen({
  avatarEmoji = "🦉",
  onDone,
}: CelebrationScreenProps) {
  return (
    <main className="relative isolate flex min-h-dvh w-full flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-sky-100 via-amber-50 to-orange-100 px-5 py-10 text-center text-slate-800">
      <div
        className="absolute -left-24 top-1/3 -z-10 h-64 w-64 rounded-full bg-sky-200/60 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="absolute -right-24 bottom-1/4 -z-10 h-64 w-64 rounded-full bg-amber-200/70 blur-3xl"
        aria-hidden="true"
      />

      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        {CONFETTI.map((classes) => (
          <div
            key={classes}
            className={`absolute h-4 w-2 rounded-sm motion-reduce:animate-none ${classes}`}
          />
        ))}
      </div>

      <div className="relative mb-6 flex h-56 w-56 items-center justify-center rounded-full border-8 border-white bg-gradient-to-br from-amber-300 to-orange-400 shadow-[0_18px_0_0_rgb(245_158_11/0.25)] ring-8 ring-amber-200/70">
        <span
          className="absolute -top-7 text-6xl drop-shadow-md motion-safe:animate-bounce"
          aria-hidden="true"
        >
          ⭐
        </span>
        <span className="text-8xl drop-shadow-lg" role="img" aria-label="Mascot">
          {avatarEmoji}
        </span>
      </div>

      <h1 className="text-balance text-5xl font-black tracking-tight text-orange-700 drop-shadow-sm sm:text-6xl">
        You did it!
      </h1>
      <p className="mt-3 text-2xl font-bold text-sky-800">Amazing work!</p>

      {onDone ? (
        <button
          type="button"
          onClick={onDone}
          className="mt-9 flex min-h-16 min-w-40 items-center justify-center rounded-full bg-emerald-500 px-10 py-4 text-2xl font-black text-white shadow-[0_8px_0_0_rgb(5_150_105)] transition active:translate-y-1 active:shadow-[0_4px_0_0_rgb(5_150_105)] focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-sky-600 motion-reduce:transition-none"
        >
          Done 🎉
        </button>
      ) : null}
    </main>
  );
}
