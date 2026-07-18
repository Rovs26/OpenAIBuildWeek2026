"use client";

// The adaptive session state machine:
//   items (×MAX) → speaking → celebration
// Every answer is persisted so a killed tab resumes at the same stop
// (ARCHITECTURE §3). ZERO network fetches inside the item loop — that is what
// makes the airplane-mode demo survive. CAT and the item bank are local,
// deterministic P2 modules; sync and speaking fail softly when unavailable.

import { useEffect, useRef, useState } from "react";
import type { Item, ItemResponse, SessionResult, SpeakingResult } from "@/lib/types";
import { estimate, levelBand, nextItem } from "@/lib/cat";
import { itemBank as itemPool } from "@/lib/itemBank";
import ItemScreen from "./ItemScreen";
import JourneyBar from "./JourneyBar";
import CelebrationScreen from "./CelebrationScreen";
import { useAudio } from "./useAudio";
import SpeakingSection from "@/components/speaking/SpeakingSection";
import { syncResult } from "@/lib/resultSync";

const MAX_ITEMS = 15;
const TOTAL_STOPS = 18; // 15 tap items + speaking + finish framing
const STORAGE_KEY = "session-in-progress";
const SPEAKING_TARGETS = {
  en: "The dog runs.",
  fil: "Tumakbo ang aso.",
} as const;

type Phase = "items" | "speaking" | "celebration";

type Saved = { v: 1; startedAt: number; responses: ItemResponse[] };

function loadSaved(): Saved | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Saved;
    if (parsed?.v === 1 && Array.isArray(parsed.responses)) return parsed;
  } catch {
    /* fail soft */
  }
  return null;
}

function levelFromDifficulty(item: Item | null): 0 | 1 | 2 | 3 | 4 {
  if (!item) return 2;
  const l = Math.round((item.difficulty + 3) / 1.5);
  return Math.max(0, Math.min(4, l)) as 0 | 1 | 2 | 3 | 4;
}

function sessionLanguage(responses: ItemResponse[]): "en" | "fil" {
  const lastResponse = responses[responses.length - 1];
  return itemPool.find((item) => item.id === lastResponse?.itemId)?.language ?? "en";
}

export default function Session() {
  const { preload } = useAudio();
  const [responses, setResponses] = useState<ItemResponse[]>([]);
  const [current, setCurrent] = useState<Item | null>(null);
  const [phase, setPhase] = useState<Phase>("items");
  const [studentName, setStudentName] = useState("Demo Child");
  const startedAtRef = useRef<number>(Date.now());

  // Persist + decide the next screen from a fresh responses list.
  function advance(next: ItemResponse[]) {
    try {
      const saved: Saved = {
        v: 1,
        startedAt: startedAtRef.current,
        responses: next,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    } catch {
      /* fail soft */
    }

    if (next.length >= MAX_ITEMS) {
      setPhase("speaking");
      return;
    }
    const item = nextItem(itemPool, next); // no fetch — local pool
    if (!item) {
      setPhase("speaking"); // local item bank exhausted → graceful finish
      return;
    }
    setCurrent(item);
    setPhase("items");
    preload(item.audioUrl); // decode ahead so tap → next prompt < 300 ms
  }

  // Mount: resume prior session if one exists, else start fresh.
  useEffect(() => {
    const name = new URLSearchParams(window.location.search).get("name")?.trim();
    if (name) setStudentName(name);

    const saved = loadSaved();
    if (saved) {
      startedAtRef.current = saved.startedAt;
      setResponses(saved.responses);
      advance(saved.responses);
    } else {
      advance([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleAnswer(choiceId: string, ms: number) {
    if (!current) return;
    const next: ItemResponse[] = [
      ...responses,
      { itemId: current.id, choiceId, correct: choiceId === current.correctChoiceId, ms },
    ];
    setResponses(next);
    advance(next);
  }

  function finish(speaking: SpeakingResult | undefined) {
    const { theta, standardError } = estimate(itemPool, responses);
    const result: SessionResult = {
      studentName,
      theta,
      standardError,
      responses,
      speaking,
      levelBand: levelBand(theta),
    };
    void syncResult({
      ...result,
      speaking: speaking ? { ...speaking, audioUrl: "" } : undefined,
    }); // fire-and-forget; never blocks the child
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* fail soft */
    }
    setPhase("celebration");
  }

  if (phase === "speaking") {
    const language = sessionLanguage(responses);
    return (
      <SpeakingSection
        onDone={finish}
        targetText={SPEAKING_TARGETS[language]}
        language={language}
      />
    );
  }

  if (phase === "celebration") {
    return (
      <CelebrationScreen
        avatarEmoji="🦉"
        onDone={() => window.location.reload()}
      />
    );
  }

  // phase === "items"
  return (
    <div className="flex min-h-dvh flex-col">
      <JourneyBar
        currentStop={responses.length}
        totalStops={TOTAL_STOPS}
        level={levelFromDifficulty(current)}
      />
      <div className="flex-1">
        {current && (
          <ItemScreen key={current.id} item={current} onAnswer={handleAnswer} />
        )}
      </div>
    </div>
  );
}
