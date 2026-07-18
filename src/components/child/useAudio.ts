"use client";

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

export function unlockAudio(): void {
  const audioContext = getCtx();
  if (audioContext) {
    if (audioContext.state === "suspended") void audioContext.resume();
    try {
      const buffer = audioContext.createBuffer(1, 1, 22050);
      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContext.destination);
      source.start(0);
    } catch {
      /* fail soft */
    }
  }

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
  const audioContext = getCtx();
  if (!audioContext) return null;
  const cached = bufferCache.get(url);
  if (cached) return cached;
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`audio ${response.status}`);
    const decoded = await audioContext.decodeAudioData(await response.arrayBuffer());
    bufferCache.set(url, decoded);
    return decoded;
  } catch (error) {
    console.log("[useAudio] load failed, fail-soft:", url, error);
    return null;
  }
}

export function useAudio() {
  const playClip = useCallback(async (url?: string): Promise<boolean> => {
    const audioContext = getCtx();
    if (!url || !audioContext) return false;
    const buffer = await loadBuffer(url);
    if (!buffer) return false;
    await new Promise<void>((resolve) => {
      try {
        const source = audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(audioContext.destination);
        source.onended = () => resolve();
        source.start(0);
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
        utterance.lang = language === "fil" ? "fil-PH" : "en-US";
        utterance.rate = 0.82;
        utterance.pitch = 1.05;
        utterance.onend = () => resolve();
        utterance.onerror = () => resolve();
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
      });
    },
    [],
  );

  const playPrompt = useCallback(
    async (prompt: Prompt): Promise<void> => {
      lastPrompt = prompt;
      if (await playClip(prompt.url)) return;
      await speak(prompt.text, prompt.language);
    },
    [playClip, speak],
  );

  const replay = useCallback((): Promise<void> => {
    if (!lastPrompt) return Promise.resolve();
    return playPrompt(lastPrompt);
  }, [playPrompt]);

  const preload = useCallback((url?: string): void => {
    if (url) void loadBuffer(url);
  }, []);

  return { playPrompt, replay, preload };
}
