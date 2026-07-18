"use client";

// /child — the screen judges stare at. Full-screen avatar; the tap both unlocks
// mobile audio (RULES §6) and starts the session. One primary action, no reading
// required, no menu. See tasks/P1.md §A2.

import { useState } from "react";
import { unlockAudio } from "@/components/child/useAudio";
import Session from "@/components/child/Session";

export default function ChildPage() {
  const [started, setStarted] = useState(false);

  function start() {
    unlockAudio(); // must run inside the tap gesture — nothing plays before this
    setStarted(true);
  }

  if (started) return <Session />;

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-10 bg-sky-100 p-6 text-center text-slate-800">
      <button
        onClick={start}
        className="flex h-[240px] w-[240px] items-center justify-center rounded-full bg-white text-9xl shadow-xl active:scale-95 motion-safe:animate-bounce"
        aria-label="Tap to start"
      >
        🦉
      </button>
      <p className="text-3xl font-extrabold text-sky-700">Tap to start!</p>
    </main>
  );
}
