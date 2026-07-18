"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SpeakingResult } from "@/lib/types";

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
    "flex flex-col items-center justify-center gap-6 px-6 py-10 text-center";

  if (mock || phase === "mock") {
    return (
      <section className={container} aria-label="Speaking (demo)">
        <p className="text-lg font-semibold text-violet-600">Read it out loud!</p>
        <p className="text-4xl font-extrabold leading-snug text-slate-800">
          {targetText}
        </p>
        <button
          type="button"
          onClick={runMock}
          className="flex h-40 w-40 items-center justify-center rounded-full bg-gradient-to-b from-rose-400 to-rose-500 text-6xl shadow-lg shadow-rose-200 transition active:scale-95"
          aria-label="Tap the microphone to read"
        >
          🎤
        </button>
        <p className="text-base text-slate-500">Tap the mic and read!</p>
      </section>
    );
  }

  if (phase === "processing") {
    return (
      <section className={container} aria-label="Listening">
        <div className="text-6xl">👂</div>
        <p className="text-2xl font-bold text-slate-700">Listening…</p>
        <p className="text-base text-slate-500">Great reading!</p>
      </section>
    );
  }

  if (phase === "playback" && result) {
    return (
      <section className={container} aria-label="Listen to yourself">
        <p className="text-2xl font-bold text-violet-600">
          Listen to yourself read! 🎧
        </p>
        <p className="text-3xl font-extrabold leading-snug text-slate-800">
          {targetText}
        </p>
        <audio ref={audioElRef} src={audioUrl} preload="auto" />
        <button
          type="button"
          onClick={playRecording}
          className="flex h-40 w-40 items-center justify-center rounded-full bg-gradient-to-b from-sky-400 to-sky-500 text-6xl shadow-lg shadow-sky-200 transition active:scale-95"
          aria-label="Play your recording"
        >
          ▶️
        </button>
        <button
          type="button"
          onClick={() => onDone(result)}
          className="mt-2 min-h-16 rounded-full bg-emerald-500 px-10 text-2xl font-bold text-white shadow-md shadow-emerald-200 transition active:scale-95"
        >
          I&apos;m done! 🎉
        </button>
      </section>
    );
  }

  // intro + recording share the target text + big mic button.
  const recording = phase === "recording";
  return (
    <section className={container} aria-label="Read out loud">
      <p className="text-lg font-semibold text-violet-600">Read it out loud!</p>
      <p className="text-4xl font-extrabold leading-snug text-slate-800">
        {targetText}
      </p>
      <button
        type="button"
        onClick={recording ? stopRecording : startRecording}
        className={[
          "flex h-40 w-40 items-center justify-center rounded-full text-6xl shadow-lg transition active:scale-95",
          recording
            ? "animate-pulse bg-gradient-to-b from-red-500 to-red-600 shadow-red-300 ring-8 ring-red-200"
            : "bg-gradient-to-b from-rose-400 to-rose-500 shadow-rose-200",
        ].join(" ")}
        aria-label={recording ? "Stop recording" : "Tap the microphone to read"}
      >
        {recording ? "⏹️" : "🎤"}
      </button>
      <p className="text-base text-slate-500">
        {recording ? "Recording… tap to stop" : "Tap the mic and read!"}
      </p>
    </section>
  );
}
