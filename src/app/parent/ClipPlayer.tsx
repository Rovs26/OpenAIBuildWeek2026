"use client";

import { useRef } from "react";

// Gesture-triggered playback of the child's speaking clip on the parent card.
// When audioUrl is empty (mock / no clip captured) we show a disabled hint
// instead of a dead button — the card still screenshots cleanly.

export default function ClipPlayer({ audioUrl }: { audioUrl: string }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  if (!audioUrl) {
    return (
      <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-center text-sm text-amber-700">
        🔊 Ang clip ay pinakikinggan sa telepono · Clip plays on her device
      </p>
    );
  }

  return (
    <>
      <audio ref={audioRef} src={audioUrl} preload="none" />
      <button
        type="button"
        onClick={() => audioRef.current?.play().catch(() => {})}
        className="mt-4 flex min-h-16 w-full items-center justify-center gap-2 rounded-2xl bg-sky-500 px-6 text-lg font-bold text-white shadow-md shadow-sky-200 transition active:scale-95"
      >
        ▶️ Pakinggan · Play clip
      </button>
    </>
  );
}
