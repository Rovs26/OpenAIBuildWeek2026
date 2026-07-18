"use client";

// Shared audio for the whole child session. ONE AudioContext, unlocked by the
// avatar-tap gesture (mobile autoplay policy — RULES §6). Every prompt plays
// through it. Missing/failed audio FAILS SOFT: resolve immediately, log, never
// block the screen or surface an error (the child cannot troubleshoot).

import { useCallback } from "react";

let ctx: AudioContext | null = null;
const bufferCache = new Map<string, AudioBuffer>();
let lastUrl: string | undefined;

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
  // Play a prompt; resolves when playback ends (or immediately if unavailable).
  const play = useCallback(async (url?: string): Promise<void> => {
    if (url) lastUrl = url;
    const c = getCtx();
    if (!url || !c) return; // fail soft — mockItems have no audioUrl yet
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
  }, []);

  // Replay the current prompt (bound to the 🔊 button).
  const replay = useCallback((): Promise<void> => play(lastUrl), [play]);

  // Decode-and-cache ahead of time so tap → next prompt stays < 300 ms.
  const preload = useCallback((url?: string): void => {
    if (url) void loadBuffer(url);
  }, []);

  return { play, replay, preload };
}
