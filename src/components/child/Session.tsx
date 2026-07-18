"use client";

import { useEffect, useRef, useState } from "react";
import type { Item, ItemResponse, SessionResult, SpeakingResult } from "@/lib/types";
import { syncResult } from "@/lib/resultSync";
import SpeakingSection from "@/components/speaking/SpeakingSection";
import { estimate, itemPool, levelBand, nextItem } from "./mocks";
import ItemScreen from "./ItemScreen";
import JourneyBar from "./JourneyBar";
import CelebrationScreen from "./CelebrationScreen";
import Agi from "./Agi";
import { useAudio } from "./useAudio";

const MAX_ITEMS = 15;
const TOTAL_STOPS = Math.min(MAX_ITEMS, itemPool.length) + 2;
const STORAGE_KEY = "session-in-progress";

type Phase = "items" | "speaking" | "celebration";
type Saved = { v: 1; startedAt: number; responses: ItemResponse[] };

function loadSaved(): Saved | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Saved;
    return parsed?.v === 1 && Array.isArray(parsed.responses) ? parsed : null;
  } catch {
    return null;
  }
}

function challengeFromDifficulty(item: Item | null): 0 | 1 | 2 | 3 | 4 {
  if (!item) return 2;
  const value = Math.round((item.difficulty + 3) / 1.5);
  return Math.max(0, Math.min(4, value)) as 0 | 1 | 2 | 3 | 4;
}

export default function Session({
  avatarEmoji,
  studentName,
  onRestart,
}: {
  avatarEmoji: string;
  studentName: string;
  onRestart: () => void;
}) {
  const { preload } = useAudio();
  const [responses, setResponses] = useState<ItemResponse[]>([]);
  const [current, setCurrent] = useState<Item | null>(null);
  const [phase, setPhase] = useState<Phase>("items");
  const [online, setOnline] = useState(true);
  const startedAtRef = useRef(Date.now());

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  function advance(next: ItemResponse[]) {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ v: 1, startedAt: startedAtRef.current, responses: next } satisfies Saved),
      );
    } catch {
      /* The child flow continues even when storage is unavailable. */
    }

    if (next.length >= MAX_ITEMS) {
      setPhase("speaking");
      return;
    }
    const item = nextItem(itemPool, next);
    if (!item) {
      setPhase("speaking");
      return;
    }
    setCurrent(item);
    setPhase("items");
    preload(item.audioUrl);
  }

  useEffect(() => {
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
    void syncResult(result);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* fail soft */
    }
    setPhase("celebration");
  }

  if (phase === "speaking") {
    return (
      <main className="min-h-dvh bg-[#FFF8EB] text-[#126E82]">
        <div className="mx-auto min-h-dvh w-full max-w-[430px]">
          <SpeakingSection
            language="fil"
            targetText="Ang araw ay maganda."
            onDone={finish}
          />
        </div>
      </main>
    );
  }

  if (phase === "celebration") {
    return (
      <CelebrationScreen
        avatarEmoji={avatarEmoji}
        childName={studentName}
        onDone={onRestart}
      />
    );
  }

  return (
    <main className="min-h-dvh bg-[#FFF8EB] text-[#126E82]">
      <div className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col px-4 py-4">
        <div className="flex items-center justify-between gap-2">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-extrabold ${
            current?.language === "fil" ? "bg-[#FFB703]/20 text-[#936500]" : "bg-[#126E82]/10"
          }`}>
            {current?.language === "fil" ? "🇵🇭 Filipino" : "🔤 English"}
          </span>
          <button
            type="button"
            onClick={() => setOnline((value) => !value)}
            className={`inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-xs font-extrabold ${
              online ? "bg-[#6BBF59]/15 text-[#438A35]" : "bg-[#FFB703]/20 text-[#936500]"
            }`}
            aria-label="Toggle offline demo status"
          >
            <span className={`h-2 w-2 rounded-full ${online ? "bg-[#6BBF59]" : "bg-[#FFB703]"}`} />
            {online ? "Ready anywhere" : "Offline · Tuloy pa rin!"}
          </button>
        </div>

        <JourneyBar
          currentStop={responses.length}
          totalStops={TOTAL_STOPS}
          level={challengeFromDifficulty(current)}
        />

        <div className="flex min-h-0 flex-1 flex-col">
          {current ? (
            <ItemScreen key={current.id} item={current} onAnswer={handleAnswer} />
          ) : (
            <div className="flex flex-1 items-center justify-center">
              <Agi pose="thinking" size={110} />
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
