"use client";

import { useEffect, useRef, useState } from "react";
import type { Item } from "@/lib/types";
import Agi from "./Agi";
import { useAudio } from "./useAudio";

const WARM_PHRASES = [
  "Galing! Isa pa!",
  "Kaya mo 'yan!",
  "Ang husay mo!",
  "Tuloy lang tayo!",
  "Ang galing mo!",
  "Mahusay!",
];

const FEEDBACK_MS = 900;

export default function ItemScreen({
  item,
  onAnswer,
}: {
  item: Item;
  onAnswer: (choiceId: string, ms: number) => void;
}) {
  const { playPrompt, replay, playSfx } = useAudio();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [phrase, setPhrase] = useState("");
  const startRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // New item: reset, voice a prompt (post-unlock), start clock. A see-word item
  // must never read the displayed word aloud; it measures decoding, so it only
  // gets a language-matched instruction that replay can safely repeat.
  useEffect(() => {
    setSelectedId(null);
    setPhrase("");
    startRef.current = performance.now();
    void playPrompt({
      url: item.format === "see-word" ? undefined : item.audioUrl,
      text:
        item.format === "see-word"
          ? item.language === "fil"
            ? "Pindutin ang larawang tugma sa salita!"
            : "Tap the picture that matches the word!"
          : item.prompt,
      language: item.language,
    });
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item, playPrompt]);

  function handlePick(choiceId: string) {
    if (selectedId) return;
    const ms = Math.round(performance.now() - startRef.current);
    setSelectedId(choiceId);
    playSfx(choiceId === item.correctChoiceId ? "correct" : "wrong");
    setPhrase(WARM_PHRASES[Math.floor(Math.random() * WARM_PHRASES.length)]);
    timerRef.current = setTimeout(() => onAnswer(choiceId, ms), FEEDBACK_MS);
  }

  return (
    <section className="rise-in flex flex-1 flex-col items-center justify-center gap-4 py-3">
      {item.format === "see-word" ? (
        <div className="text-center">
          <p className="font-display text-[clamp(3.5rem,15vw,4rem)] font-extrabold leading-none tracking-wide">
            {item.prompt}
          </p>
          <p className="mt-2 text-sm font-bold text-[#3E93A5]">
            Tingnan ang salita · Look at the word
          </p>
        </div>
      ) : (
        <div className="flex items-center gap-5">
          <Agi pose="listening" size={84} />
          <button
            type="button"
            onClick={() => void replay()}
            className="flex min-h-[112px] min-w-[104px] flex-col items-center justify-center gap-1 rounded-[28px] border-[3px] border-[#FB8500]/20 bg-white px-3 shadow-[0_7px_16px_rgba(180,140,60,.14)] active:scale-95"
            aria-label="Pakinggan ulit"
          >
            <span className="grid h-16 w-16 place-items-center rounded-full bg-[#FB8500] text-3xl text-white shadow-[0_6px_0_#D96F00]" aria-hidden="true">🔊</span>
            <span className="font-display text-sm font-bold text-[#FB8500]">Pakinggan ulit</span>
          </button>
        </div>
      )}

      <div className="grid w-full grid-cols-2 gap-3.5">
        {item.choices.map((choice) => {
          const picked = selectedId === choice.id;
          return (
            <button
              key={choice.id}
              type="button"
              onClick={() => handlePick(choice.id)}
              disabled={selectedId !== null}
              className={`relative flex min-h-[138px] items-center justify-center rounded-[28px] border-4 bg-white text-6xl shadow-[0_6px_14px_rgba(180,140,60,.11)] transition active:scale-95 disabled:cursor-default ${
                picked
                  ? "soft-pop scale-[1.03] border-[#6BBF59] shadow-[0_0_0_6px_rgba(107,191,89,.18),0_8px_18px_rgba(107,191,89,.2)]"
                  : "border-[#FFB703]/40"
              }`}
              aria-label={choice.label ?? `Choice ${choice.id}`}
            >
              {choice.emoji ?? choice.label}
            </button>
          );
        })}
      </div>

      {selectedId ? (
        <div className="soft-pop flex min-h-[66px] w-full items-center justify-center gap-3 rounded-[20px] border-2 border-[#6BBF59]/40 bg-[#6BBF59]/15 px-4">
          <Agi pose="encouraging" size={48} />
          <span className="font-display text-xl font-bold text-[#438A35]">{phrase}</span>
        </div>
      ) : (
        <div className="min-h-[66px]" aria-hidden="true" />
      )}

      {item.format === "see-word" ? (
        <button
          type="button"
          onClick={() => void replay()}
          className="flex min-h-16 items-center gap-2 rounded-full bg-white px-5 font-display text-base font-bold text-[#FB8500] shadow-[0_6px_14px_rgba(180,140,60,.14)] active:scale-95"
        >
          <span className="text-2xl" aria-hidden="true">🔊</span> Pakinggan ang panuto
        </button>
      ) : null}
    </section>
  );
}
