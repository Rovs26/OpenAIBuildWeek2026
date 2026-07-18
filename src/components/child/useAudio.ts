"use client";

// Shared audio for the whole child session. ONE AudioContext, unlocked by the
// first tap gesture (mobile autoplay policy — RULES §6). Prompts are voiced by
// ElevenLabs TTS (/api/tts, multilingual → Filipino) and answer feedback plays
// hosted sound-effects — everything decoded through the same context. Missing or
// failed audio FAILS SOFT: resolve immediately, log, never block or surface an
// error (the child cannot troubleshoot).

import { useCallback } from "react";

// Answer sound-effects — hosted, CORS-enabled (Google Actions sound library).
// Ogg decodes on Android (the target device) + modern desktop browsers; older
// Safari/iOS simply fail soft to silence.
export const SFX = {
  correct: "https://actions.google.com/sounds/v1/cartoon/magic_chime.ogg",
  wrong: "https://actions.google.com/sounds/v1/cartoon/slide_whistle_to_drum.ogg",
  tap: "https://actions.google.com/sounds/v1/cartoon/pop.ogg",
} as const;
export type SfxKind = keyof typeof SFX;

export type Prompt = {
  // Reserved for pre-rendered clips; the ElevenLabs voice is primary, so this is
  // carried for forward-compat but not the playback path today.
  url?: string;
  text: string;
  language: "en" | "fil";
};

let ctx: AudioContext | null = null;
const bufferCache = new Map<string, AudioBuffer>();
let lastPrompt: Prompt | null = null;

function ttsUrl(text: string, language: "en" | "fil"): string {
  return `/api/tts?${new URLSearchParams({ text, lang: language }).toString()}`;
}

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
 * Call from the first tap gesture. Creates + resumes the shared AudioContext and
 * plays a 1-sample silent buffer — the user gesture that unlocks audio for the
 * whole session. Nothing may play before this runs.
 */
export function unlockAudio(): void {
  const c = getCtx();
  if (!c) return;
  if (c.state === "suspended") void c.resume();
  try {
    const buffer = c.createBuffer(1, 1, 22050);
    const source = c.createBufferSource();
    source.buffer = buffer;
    source.connect(c.destination);
    source.start(0);
  } catch {
    /* fail soft */
  }
}

async function loadBuffer(url: string): Promise<AudioBuffer | null> {
  const c = getCtx();
  if (!c) return null;
  const cached = bufferCache.get(url);
  if (cached) return cached;
  try {
    const response = await fetch(url);
    if (!response.ok) return null; // 204 (nothing to say) / error → fail soft
    const bytes = await response.arrayBuffer();
    if (bytes.byteLength === 0) return null;
    const decoded = await c.decodeAudioData(bytes);
    bufferCache.set(url, decoded);
    return decoded;
  } catch (error) {
    console.log("[useAudio] load failed, fail-soft:", url, error);
    return null;
  }
}

async function playUrl(url: string): Promise<boolean> {
  const c = getCtx();
  if (!c) return false;
  const buffer = await loadBuffer(url);
  if (!buffer) return false; // fail soft
  await new Promise<void>((resolve) => {
    try {
      const source = c.createBufferSource();
      source.buffer = buffer;
      source.connect(c.destination);
      source.onended = () => resolve();
      source.start(0);
    } catch {
      resolve();
    }
  });
  return true;
}

export function useAudio() {
  // Voice a prompt via ElevenLabs TTS (multilingual → `fil` sounds Filipino).
  const playPrompt = useCallback(async (prompt: Prompt): Promise<void> => {
    lastPrompt = prompt;
    if (!prompt.text) return;
    await playUrl(ttsUrl(prompt.text, prompt.language));
  }, []);

  // Replay the current prompt (bound to the 🔊 buttons).
  const replay = useCallback(
    (): Promise<void> => (lastPrompt ? playPrompt(lastPrompt) : Promise.resolve()),
    [playPrompt],
  );

  // Answer feedback sound-effect. Fire-and-forget; never sets the replay target.
  const playSfx = useCallback((kind: SfxKind): void => {
    void playUrl(SFX[kind]);
  }, []);

  // Decode-and-cache ahead so tap → next prompt stays < 300 ms.
  const preload = useCallback((url?: string): void => {
    if (url) void loadBuffer(url);
  }, []);
  const preloadSpeak = useCallback(
    (text?: string, language: "en" | "fil" = "en"): void => {
      if (text) void loadBuffer(ttsUrl(text, language));
    },
    [],
  );
  const preloadSfx = useCallback((): void => {
    for (const url of Object.values(SFX)) void loadBuffer(url);
  }, []);

  return { playPrompt, replay, playSfx, preload, preloadSpeak, preloadSfx };
}
