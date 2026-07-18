"use client";

import { useState } from "react";
import Agi from "@/components/child/Agi";
import Session from "@/components/child/Session";
import { unlockAudio, useAudio } from "@/components/child/useAudio";

const AVATARS = [
  { key: "owl", emoji: "🦉", name: "Owlie" },
  { key: "rabbit", emoji: "🐰", name: "Buni" },
  { key: "fox", emoji: "🦊", name: "Kit" },
  { key: "turtle", emoji: "🐢", name: "Pong" },
  { key: "cat", emoji: "🐱", name: "Muning" },
  { key: "frog", emoji: "🐸", name: "Kokak" },
] as const;

type Stage = "avatar" | "warmup" | "session";

export default function ChildPage() {
  const { playPrompt } = useAudio();
  const [stage, setStage] = useState<Stage>("avatar");
  const [avatarKey, setAvatarKey] = useState<string | null>(null);
  const avatar = AVATARS.find((option) => option.key === avatarKey);

  function chooseAvatar(key: string) {
    unlockAudio();
    setAvatarKey(key);
  }

  if (stage === "session" && avatar) {
    return (
      <Session
        avatarEmoji={avatar.emoji}
        studentName={avatar.name}
        onRestart={() => {
          setAvatarKey(null);
          setStage("avatar");
        }}
      />
    );
  }

  if (stage === "warmup") {
    return (
      <main className="min-h-dvh bg-[#FFF8EB] px-5 py-8 text-[#126E82]">
        <section className="rise-in mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-[390px] flex-col items-center justify-center gap-6 text-center">
          <Agi pose="listening" size={132} />
          <div>
            <h1 className="font-display text-[30px] font-bold leading-tight">
              Makinig, tumingin, at piliin ang sagot.
            </h1>
            <p className="mt-2 text-base font-bold text-[#3E93A5]">
              Listen, look, and choose.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void playPrompt({ text: "Makinig, tumingin, at piliin ang sagot.", language: "fil" })}
            className="flex min-h-16 items-center gap-3 rounded-full border-[3px] border-[#FB8500]/35 bg-white px-6 font-display text-lg font-bold text-[#FB8500] shadow-[0_8px_18px_rgba(180,140,60,.16)] active:scale-95"
          >
            <span className="grid h-11 w-11 place-items-center rounded-full bg-[#FB8500] text-2xl text-white" aria-hidden="true">🔊</span>
            Pakinggan
          </button>
          <p className="max-w-[300px] text-base font-semibold leading-relaxed text-[#3E93A5]">
            Maglaro lang tayo—walang pressure. Just listen and choose what feels right!
          </p>
          <button
            type="button"
            onClick={() => setStage("session")}
            className="min-h-[68px] rounded-[26px] bg-[#FB8500] px-10 font-display text-xl font-bold text-white shadow-[0_8px_0_#D96F00,0_16px_24px_rgba(251,133,0,.24)] active:translate-y-1 active:shadow-[0_4px_0_#D96F00]"
          >
            Simulan →
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-[#FFF8EB] px-5 py-6 text-[#126E82]">
      <section className="rise-in mx-auto flex min-h-[calc(100dvh-3rem)] w-full max-w-[390px] flex-col">
        <div className="flex flex-col items-center text-center">
          <Agi pose="wave" size={112} />
          <div className="-mt-1 rounded-[22px] border-[3px] border-[#FFB703]/40 bg-white px-5 py-3 shadow-[0_8px_18px_rgba(180,140,60,.14)]">
            <h1 className="font-display text-2xl font-bold">Kumusta! Ako si Agi.</h1>
            <p className="mt-0.5 font-extrabold text-[#FB8500]">Sino ka ngayon?</p>
          </div>
        </div>

        <div className="mt-7 grid grid-cols-3 gap-4">
          {AVATARS.map((option) => {
            const selected = option.key === avatarKey;
            return (
              <button
                key={option.key}
                type="button"
                onClick={() => chooseAvatar(option.key)}
                aria-label={`Piliin si ${option.name}`}
                aria-pressed={selected}
                className={`aspect-square min-h-24 rounded-[28px] border-4 text-5xl shadow-[0_6px_14px_rgba(180,140,60,.12)] transition active:scale-95 ${
                  selected
                    ? "scale-[1.04] border-[#6BBF59] bg-[#6BBF59]/15 shadow-[0_8px_20px_rgba(107,191,89,.25)]"
                    : "border-[#FFB703]/40 bg-white"
                }`}
              >
                {option.emoji}
              </button>
            );
          })}
        </div>

        <div className="flex-1" />
        <button
          type="button"
          disabled={!avatar}
          onClick={() => {
            unlockAudio();
            setStage("warmup");
          }}
          className="mt-8 min-h-[68px] w-full rounded-[26px] bg-[#FB8500] font-display text-xl font-bold text-white shadow-[0_8px_0_#D96F00,0_16px_24px_rgba(251,133,0,.24)] transition active:translate-y-1 active:shadow-[0_4px_0_#D96F00] disabled:bg-[#E7DBC2] disabled:shadow-none"
        >
          Tara na! · Let&apos;s go →
        </button>
      </section>
    </main>
  );
}
