"use client";

// Shared audio for the whole child session. ONE AudioContext, unlocked by the
// avatar-tap gesture (mobile autoplay policy — RULES §6). Everything — spoken
// prompts (ElevenLabs TTS via /api/tts) and answer sound-effects — plays through
// it. Missing/failed audio FAILS SOFT: resolve immediately, log, never block the
// screen or surface an error (the child cannot troubleshoot).

import { useCallback } from "react";

// Answer sound-effects — hosted, CORS-enabled (Google Actions sound library).
// Ogg decodes on Android (the target device); iOS just fails soft to silence.
export const SFX = {
  correct: "https://actions.google.com/sounds/v1/cartoon/magic_chime.ogg",
  wrong: "https://actions.google.com/sounds/v1/cartoon/slide_whistle_to_drum.ogg",
  tap: "https://actions.google.com/sounds/v1/cartoon/pop.ogg",
} as const;
export type SfxKind = keyof typeof SFX;

let ctx: AudioContext | null = null;
const bufferCache = new Map<string, AudioBuffer>();
let lastPromptUrl: string | undefined;

function ttsUrl(text: string, lang?: string): string {
  const q = new URLSearchParams({ text });
  if (lang) q.set("lang", lang);
  return `/api/tts?${q.toString()}`;
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
 * Call from the avatar-tap handler. Creates + resumes the shared AudioContext
 * and plays a 1-sample silent buffer — the user gesture that unlocks audio for
 * the entire session. Nothing may play before this runs.
 */
export function unlockAudio(): void {
  const c = getCtx();
  if (!c) return;
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

async function loadBuffer(url: string): Promise<AudioBuffer | null> {
  const c = getCtx();
  if (!c) return null;
  const cached = bufferCache.get(url);
  if (cached) return cached;
  try {
    const res = await fetch(url);
    if (!res.ok) return null; // 204 (no audio) or error → fail soft
    const bytes = await res.arrayBuffer();
    if (bytes.byteLength === 0) return null;
    const decoded = await c.decodeAudioData(bytes);
    bufferCache.set(url, decoded);
    return decoded;
  } catch (e) {
    console.log("[useAudio] load failed, fail-soft:", url, e);
    return null;
  }
}

async function playBuffer(url: string): Promise<void> {
  const c = getCtx();
  if (!c) return;
  const buf = await loadBuffer(url);
  if (!buf) return; // fail soft
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
}

export function useAudio() {
  // Play a pre-rendered prompt file (item.audioUrl, once P2 ships audio).
  const play = useCallback(async (url?: string): Promise<void> => {
    if (!url) return;
    lastPromptUrl = url;
    await playBuffer(url);
  }, []);

  // Speak text via ElevenLabs TTS (multilingual → Filipino works). Used until
  // items carry pre-rendered audioUrl.
  const speak = useCallback(async (text?: string, lang?: string): Promise<void> => {
    if (!text) return;
    const url = ttsUrl(text, lang);
    lastPromptUrl = url;
    await playBuffer(url);
  }, []);

  // Replay the current prompt (bound to the 🔊 button).
  const replay = useCallback(async (): Promise<void> => {
    if (lastPromptUrl) await playBuffer(lastPromptUrl);
  }, []);

  // Answer feedback sound-effect. Fire-and-forget; never sets the replay target.
  const playSfx = useCallback((kind: SfxKind): void => {
    void playBuffer(SFX[kind]);
  }, []);

  // Decode-and-cache ahead so tap → next prompt stays < 300 ms.
  const preload = useCallback((url?: string): void => {
    if (url) void loadBuffer(url);
  }, []);
  const preloadSpeak = useCallback((text?: string, lang?: string): void => {
    if (text) void loadBuffer(ttsUrl(text, lang));
  }, []);
  const preloadSfx = useCallback((): void => {
    for (const url of Object.values(SFX)) void loadBuffer(url);
  }, []);

  return { play, speak, replay, playSfx, preload, preloadSpeak, preloadSfx };
}
