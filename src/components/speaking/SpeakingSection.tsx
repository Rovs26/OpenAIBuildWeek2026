"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SpeakingResult } from "@/lib/types";
import Agi from "@/components/child/Agi";

// Standalone speaking step. P1 mounts this after item 15:
//   <SpeakingSection onDone={(speaking) => finishSession(speaking)} />
// onDone(undefined) = skipped (mic denied / unavailable / error). Never throws,
// never shows an error screen (RULES §6).
//
// Demo default is the mock flow: add ?mockSpeaking=1 to the URL to skip the mic
// entirely and return a canned result.

type Props = {
  onDone: (speaking?: SpeakingResult) => void;
  // The target text the child reads aloud. Defaults are demo-friendly.
  targetText?: string;
  language?: "en" | "fil";
};

const MAX_RECORD_MS = 10_000;

// Canned mock result — matches the P4 spec exactly.
function mockResult(targetText: string): SpeakingResult {
  return {
    targetText,
    transcript: targetText,
    wordMatchPct: 92,
    audioUrl: "",
  };
}

type Phase =
  | "intro" // show target text + big mic button
  | "recording"
  | "processing" // uploading to /api/transcribe
  | "playback" // "Listen to yourself read!"
  | "mock"; // mock friendly flow

export default function SpeakingSection({
  onDone,
  targetText = "The dog runs.",
  language = "en",
}: Props) {
  const [mock, setMock] = useState(false);
  const [phase, setPhase] = useState<Phase>("intro");
  const [audioUrl, setAudioUrl] = useState<string>("");
  const [result, setResult] = useState<SpeakingResult | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);

  // Detect ?mockSpeaking=1 on mount.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("mockSpeaking") === "1") {
      setMock(true);
      setPhase("mock");
    }
  }, []);

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cleanupStream = useCallback(() => {
    if (stopTimerRef.current) {
      clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  // Upload the recorded blob and finish. Any failure = cheerful skip.
  const transcribe = useCallback(
    async (blob: Blob, localUrl: string) => {
      setPhase("processing");
      try {
        const form = new FormData();
        form.append("audio", blob, "speech.webm");
        form.append("targetText", targetText);
        form.append("language", language);

        const res = await fetch("/api/transcribe", {
          method: "POST",
          body: form,
        });
        const data = await res.json().catch(() => ({ speaking: null }));

        if (data && data.speaking) {
          // Keep the local playback URL for the "listen to yourself" step.
          const speaking: SpeakingResult = {
            ...data.speaking,
            audioUrl: localUrl,
          };
          setResult(speaking);
          setPhase("playback");
        } else {
          // Soft skip — no error screen.
          console.warn("[speaking] transcribe returned null — skipping");
          onDone(undefined);
        }
      } catch (err) {
        console.warn("[speaking] transcribe failed — skipping", err);
        onDone(undefined);
      }
    },
    [language, onDone, targetText]
  );

  // First mic tap: request permission in-context, start recording.
  const startRecording = useCallback(async () => {
    // Feature check.
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      console.warn("[speaking] MediaRecorder unavailable — skipping");
      onDone(undefined);
      return;
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      // Denied or unavailable — cheerful skip, never an error screen.
      console.warn("[speaking] mic denied/unavailable — skipping", err);
      onDone(undefined);
      return;
    }

    streamRef.current = stream;
    chunksRef.current = [];

    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "";

    let recorder: MediaRecorder;
    try {
      recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
    } catch (err) {
      console.warn("[speaking] MediaRecorder init failed — skipping", err);
      cleanupStream();
      onDone(undefined);
      return;
    }

    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      cleanupStream();
      const blob = new Blob(chunksRef.current, {
        type: recorder.mimeType || "audio/webm",
      });
      const localUrl = URL.createObjectURL(blob);
      setAudioUrl(localUrl);
      void transcribe(blob, localUrl);
    };

    recorder.start();
    setPhase("recording");

    // 10 s hard cap.
    stopTimerRef.current = setTimeout(() => {
      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stop();
      }
    }, MAX_RECORD_MS);
  }, [cleanupStream, onDone, transcribe]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const playRecording = useCallback(() => {
    // Gesture-triggered playback (mobile autoplay policy). Never autoplay on mount.
    // SWAP: if P1 exports a shared AudioContext/unlock helper, route through it.
    audioElRef.current?.play().catch((err) => {
      console.warn("[speaking] playback failed", err);
    });
  }, []);

  // ---- Mock flow (demo default) ------------------------------------------
  const runMock = useCallback(() => {
    const res = mockResult(targetText);
    setResult(res);
    // Short friendly beat, then straight to the celebration handoff.
    setTimeout(() => onDone(res), 900);
  }, [onDone, targetText]);

  // ---- Render -------------------------------------------------------------

  const container =
    "rise-in flex min-h-dvh flex-col items-center justify-center gap-5 px-6 py-8 text-center";

  const heading = (
    <>
      <Agi pose="reading" size={102} />
      <div>
        <p className="font-display text-[26px] font-bold leading-tight text-[#126E82]">
          Ngayon, ikaw naman ang magbasa!
        </p>
        <p className="mt-1 text-sm font-bold text-[#3E93A5]">Now you read to me!</p>
      </div>
      <div className="rounded-3xl border-[3px] border-[#FFB703]/40 bg-white px-6 py-5 shadow-[0_8px_20px_rgba(180,140,60,.14)]">
        <p className="font-display text-[32px] font-extrabold leading-tight text-[#126E82]">
          {targetText}
        </p>
      </div>
    </>
  );

  if (mock || phase === "mock") {
    return (
      <section className={container} aria-label="Speaking (demo)">
        {heading}
        <button
          type="button"
          onClick={runMock}
          className="flex h-[118px] w-[118px] items-center justify-center rounded-full bg-[#FB8500] text-5xl shadow-[0_10px_0_#D96F00,0_18px_30px_rgba(251,133,0,.28)] transition active:translate-y-1 active:shadow-[0_5px_0_#D96F00]"
          aria-label="Tap the microphone to read"
        >
          🎤
        </button>
        <p className="text-sm font-bold text-[#3E93A5]">Pindutin ang mikropono kapag handa ka na.</p>
      </section>
    );
  }

  if (phase === "processing") {
    return (
      <section className={container} aria-label="Listening">
        <Agi pose="listening" size={132} />
        <p className="font-display text-3xl font-bold text-[#126E82]">Pinapakinggan ka ni Agi…</p>
        <p className="text-base font-bold text-[#3E93A5]">Ang husay mong magbasa!</p>
      </section>
    );
  }

  if (phase === "playback" && result) {
    return (
      <section className={container} aria-label="Listen to yourself">
        <Agi pose="encouraging" size={112} />
        <p className="font-display text-[26px] font-bold text-[#126E82]">Pakinggan ang iyong pagbasa! 🎧</p>
        <div className="rounded-3xl border-[3px] border-[#FFB703]/40 bg-white px-6 py-5 shadow-[0_8px_20px_rgba(180,140,60,.14)]">
          <p className="font-display text-3xl font-extrabold leading-snug text-[#126E82]">{targetText}</p>
        </div>
        <audio ref={audioElRef} src={audioUrl} preload="auto" />
        <button
          type="button"
          onClick={playRecording}
          className="flex h-[112px] w-[112px] items-center justify-center rounded-full bg-[#126E82] text-5xl text-white shadow-[0_9px_0_#0F5A6B] transition active:translate-y-1 active:shadow-[0_4px_0_#0F5A6B]"
          aria-label="Play your recording"
        >
          ▶️
        </button>
        <button
          type="button"
          onClick={() => onDone(result)}
          className="mt-2 min-h-16 rounded-3xl bg-[#6BBF59] px-10 font-display text-xl font-bold text-white shadow-[0_7px_0_#4B9D3E] transition active:translate-y-1 active:shadow-[0_3px_0_#4B9D3E]"
        >
          Tapos na! 🎉
        </button>
      </section>
    );
  }

  // intro + recording share the target text + big mic button.
  const recording = phase === "recording";
  return (
    <section className={container} aria-label="Read out loud">
      {heading}
      <div className="relative grid h-[126px] w-[126px] place-items-center">
        {recording ? (
          <>
            <span className="listening-ring absolute inset-2 rounded-full bg-[#FB8500]" />
            <span className="listening-ring absolute inset-2 rounded-full bg-[#FB8500] [animation-delay:.65s]" />
          </>
        ) : null}
        <button
          type="button"
          onClick={recording ? stopRecording : startRecording}
          className="relative flex h-[118px] w-[118px] items-center justify-center rounded-full bg-[#FB8500] text-5xl shadow-[0_10px_0_#D96F00,0_18px_30px_rgba(251,133,0,.28)] transition active:translate-y-1 active:shadow-[0_5px_0_#D96F00]"
          aria-label={recording ? "Stop recording" : "Tap the microphone to read"}
        >
          {recording ? "⏹️" : "🎤"}
        </button>
      </div>

      {recording ? (
        <div className="flex h-9 items-center gap-1" aria-hidden="true">
          {[14, 24, 18, 30, 20, 32, 16, 26, 15].map((height, index) => (
            <span key={index} className="waveform-bar w-1.5 rounded-full bg-[#126E82]" style={{ height, animationDelay: `${index * 70}ms` }} />
          ))}
        </div>
      ) : null}
      <p className="text-sm font-bold text-[#3E93A5]">
        {recording ? "Nakikinig si Agi… pindutin para huminto." : "Pindutin ang mikropono kapag handa ka na."}
      </p>
    </section>
  );
}
