"use client";

import Link from "next/link";
import Agi from "./Agi";

export type CelebrationScreenProps = {
  avatarEmoji?: string;
  childName?: string;
  onDone?: () => void;
};

const CONFETTI = Array.from({ length: 18 }, (_, index) => ({
  left: (index * 37 + 7) % 100,
  delay: ((index * 3) % 13) / 10,
  duration: 2.7 + ((index * 5) % 10) / 10,
  color: ["#FFB703", "#FB8500", "#6BBF59", "#126E82", "#FFC94D"][index % 5],
}));

export default function CelebrationScreen({
  avatarEmoji = "⭐",
  childName = "Batang mambabasa",
  onDone,
}: CelebrationScreenProps) {
  return (
    <main className="relative isolate flex min-h-dvh overflow-hidden bg-[#FFF8EB] px-5 py-8 text-center text-[#126E82]">
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        {CONFETTI.map((piece, index) => (
          <span
            key={index}
            className="confetti-piece absolute -top-6 h-4 w-2 rounded-sm"
            style={{ left: `${piece.left}%`, backgroundColor: piece.color, animationDelay: `${piece.delay}s`, animationDuration: `${piece.duration}s` }}
          />
        ))}
      </div>

      <section className="relative mx-auto flex w-full max-w-[390px] flex-col items-center justify-center">
        <div className="soft-pop relative grid h-[210px] w-[210px] place-items-center rounded-full border-8 border-white bg-[#FFC94D] shadow-[0_16px_0_rgba(255,183,3,.25),0_24px_40px_rgba(255,183,3,.22)]">
          <span className="absolute -top-6 text-5xl motion-safe:animate-bounce" aria-hidden="true">⭐</span>
          <Agi pose="celebrating" size={136} />
          <span className="absolute -right-2 bottom-3 grid h-14 w-14 place-items-center rounded-full border-4 border-white bg-[#6BBF59]/20 text-3xl" aria-hidden="true">{avatarEmoji}</span>
        </div>

        <h1 className="font-display mt-8 text-[42px] font-extrabold leading-none text-[#FB8500]">
          Mahusay, {childName}!
        </h1>
        <p className="font-display mt-3 text-xl font-bold">Natapos mo ang Basa Buddy journey. 🎉</p>
        <p className="mt-2 max-w-xs text-sm font-bold leading-relaxed text-[#3E93A5]">
          Nag-enjoy si Agi na magbasa kasama ka. You kept trying all the way!
        </p>

        <div className="mt-8 flex w-full max-w-[300px] flex-col gap-3">
          <Link href="/parent" className="flex min-h-[66px] items-center justify-center rounded-3xl bg-[#FB8500] px-6 font-display text-lg font-bold text-white shadow-[0_7px_0_#D96F00] active:translate-y-1 active:shadow-[0_3px_0_#D96F00]">
            View parent report
          </Link>
          {onDone ? (
            <button type="button" onClick={onDone} className="min-h-16 rounded-3xl border-[3px] border-[#126E82]/20 bg-white px-6 font-display text-base font-bold">
              Back to start
            </button>
          ) : null}
        </div>
      </section>
    </main>
  );
}
