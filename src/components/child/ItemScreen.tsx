"use client";

// One renderer, three layouts keyed on item.format — new items are DATA, never
// new code (ARCHITECTURE §1.4). Zero reading required; every tap target ≥ 64 px.
// Feedback is warm-neutral regardless of correctness (no right/wrong signal).

import { useEffect, useRef, useState } from "react";
import type { Item } from "@/lib/types";
import { useAudio } from "./useAudio";

const WARM_PHRASES = [
  "Great job!",
  "Nice work!",
  "You're doing it!",
  "Way to go!",
  "Awesome!",
  "Keep going!",
];

const FEEDBACK_MS = 800;

export default function ItemScreen({
  item,
  onAnswer,
}: {
  item: Item;
  onAnswer: (choiceId: string, ms: number) => void;
}) {
  const { playPrompt, replay } = useAudio();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [phrase, setPhrase] = useState("");
  const startRef = useRef<number>(0);
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
    if (selectedId) return; // one answer per item
    const ms = Math.round(performance.now() - startRef.current);
    setSelectedId(choiceId);
    setPhrase(WARM_PHRASES[Math.floor(Math.random() * WARM_PHRASES.length)]);
    timerRef.current = setTimeout(() => onAnswer(choiceId, ms), FEEDBACK_MS);
  }

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center gap-8 bg-sky-50 p-5 text-slate-800">
      {/* Prompt */}
      {item.format === "see-word" ? (
        <p className="text-center text-6xl font-extrabold tracking-wide">
          {item.prompt}
        </p>
      ) : (
        <div className="text-8xl" aria-hidden>
          {item.format === "hear-sentence" ? "💬" : "👂"}
        </div>
      )}

      {/* Choice grid (2×2) */}
      <div className="grid w-full max-w-md grid-cols-2 gap-4">
        {item.choices.map((c) => {
          const picked = selectedId === c.id;
          return (
            <button
              key={c.id}
              onClick={() => handlePick(c.id)}
              disabled={!!selectedId}
              className={`relative flex min-h-[140px] items-center justify-center rounded-3xl border-4 bg-white shadow transition active:scale-95 ${
                picked
                  ? "animate-pulse border-amber-400 ring-4 ring-amber-300"
                  : "border-sky-200"
              }`}
              aria-label={c.label ?? c.id}
            >
              <span className="text-7xl">{c.emoji ?? c.label}</span>
              {picked && (
                <>
                  <span className="pointer-events-none absolute -top-3 -left-2 animate-ping text-4xl">
                    ⭐
                  </span>
                  <span className="pointer-events-none absolute -top-4 right-0 animate-ping text-3xl">
                    ✨
                  </span>
                </>
              )}
            </button>
          );
        })}
      </div>

      {/* Warm-neutral response overlay */}
      {selectedId && (
        <div className="pointer-events-none absolute inset-x-0 bottom-28 flex flex-col items-center gap-1">
          <span className="text-5xl">🙂</span>
          <span className="text-2xl font-bold text-amber-600">{phrase}</span>
        </div>
      )}

      {/* Persistent replay button (≥ 64 px) */}
      <button
        onClick={() => void replay()}
        className="absolute bottom-5 right-5 flex h-16 w-16 items-center justify-center rounded-full bg-white text-3xl shadow-lg active:scale-95"
        aria-label="Play again"
      >
        🔊
      </button>
    </div>
  );
}
