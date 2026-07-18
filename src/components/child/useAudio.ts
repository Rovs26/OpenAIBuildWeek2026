"use client";

// Shared audio for the whole child session. ONE AudioContext, unlocked by the
// avatar-tap gesture (mobile autoplay policy — RULES §6). Every prompt plays
// through it. Missing/failed audio FAILS SOFT: resolve immediately, log, never
// block the screen or surface an error (the child cannot troubleshoot).

import { useCallback } from "react";

let ctx: AudioContext | null = null;
const bufferCache = new Map<string, AudioBuffer>();
type Prompt = {
  url?: string;
  text: string;
  language: "en" | "fil";
};
let lastPrompt: Prompt | null = null;

function getCtx(): AudioContext | null {
  if (ctx) return ctx;
  if (typeof window === "undefined") return null;
  const AC: typeof AudioContext | undefined =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  return ctx;
}

/**
 * Call from the avatar-tap handler. Creates + resumes the shared AudioContext
 * and plays a 1-sample silent buffer — this is the user gesture that unlocks
 * audio for the entire session. Nothing may play before this runs.
 */
export function unlockAudio(): void {
  const c = getCtx();
  if (c) {
    if (c.state === "suspended") void c.resume();
    try {
      const buf = c.createBuffer(1, 1, 22050);
      const src = c.createBufferSource();
      src.buffer = buf;
      src.connect(c.destination);
      src.start(0);
    } catch {
      /* fail soft */
    }
  }

  // Prime the browser voice while this user gesture is still active. This keeps
  // the text fallback reliable on mobile browsers when the first item mounts.
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    try {
      window.speechSynthesis.resume();
      const silent = new SpeechSynthesisUtterance("");
      silent.volume = 0;
      window.speechSynthesis.speak(silent);
    } catch {
      /* fail soft */
    }
  }
}

async function loadBuffer(url: string): Promise<AudioBuffer | null> {
  const c = getCtx();
  if (!c) return null;
  const cached = bufferCache.get(url);
  if (cached) return cached;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`audio ${res.status}`);
    const decoded = await c.decodeAudioData(await res.arrayBuffer());
    bufferCache.set(url, decoded);
    return decoded;
  } catch (e) {
    console.log("[useAudio] load failed, fail-soft:", url, e);
    return null;
  }
}

export function useAudio() {
  // Prefer pre-rendered clips. The current demo pool deliberately has none, so
  // use the browser voice as a fail-soft local fallback until P2 audio lands.
  const playClip = useCallback(async (url?: string): Promise<boolean> => {
    const c = getCtx();
    if (!url || !c) return false;
    const buf = await loadBuffer(url);
    if (!buf) return false;
    await new Promise<void>((resolve) => {
      try {
        const src = c.createBufferSource();
        src.buffer = buf;
        src.connect(c.destination);
        src.onended = () => resolve();
        src.start(0);
      } catch {
        resolve();
      }
    });
    return true;
  }, []);

  const speak = useCallback(
    (text: string, language: Prompt["language"]): Promise<void> => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) {
        console.log("[useAudio] speech synthesis unavailable, fail-soft");
        return Promise.resolve();
      }

      return new Promise((resolve) => {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = language === "fil" ? "fil-PH" : "en-PH";
        utterance.rate = 0.82;
        utterance.onend = () => resolve();
        utterance.onerror = () => resolve();
        // Replaying must restart the prompt rather than layer voices.
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
      });
    },
    []
  );

  // Play a prompt automatically on entry. The text fallback keeps the current
  // mock bank audible before pre-rendered TTS assets are available.
  const playPrompt = useCallback(
    async (prompt: Prompt): Promise<void> => {
      lastPrompt = prompt;
      if (await playClip(prompt.url)) return;
      await speak(prompt.text, prompt.language);
    },
    [playClip, speak]
  );

  // Replay the exact prompt the child is currently answering.
  const replay = useCallback((): Promise<void> => {
    if (!lastPrompt) return Promise.resolve();
    return playPrompt(lastPrompt);
  }, [playPrompt]);

  // Decode-and-cache ahead of time so tap → next prompt stays < 300 ms.
  const preload = useCallback((url?: string): void => {
    if (url) void loadBuffer(url);
  }, []);

  return { playPrompt, replay, preload };
}
