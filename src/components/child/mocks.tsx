"use client";

// P1 mock foundation — every cross-worker dependency stubbed behind the REAL
// signature so integration is a one-line import swap. See tasks/P1.md §A1.
// Nothing here lives in another worker's file (RULES §4). Delete a block and
// flip the matching import at the // SWAP: site when the real module lands.

import type {
  Item,
  ItemResponse,
  LevelBand,
  SessionResult,
  SpeakingResult,
} from "@/lib/types";
import { mockItems } from "@/lib/mockItems";

// ── Adaptive engine (P2 → src/lib/cat.ts) ───────────────────────────────────
// Mock intent: adaptation must be VISIBLE before P2 lands. Net correct answers
// push θ up (harder items), wrong answers pull it down (easier items).
function provisionalTheta(responses: ItemResponse[]): number {
  let theta = 0;
  for (const r of responses) theta += r.correct ? 0.5 : -0.5;
  return Math.max(-3, Math.min(3, theta));
}

// SWAP: import { estimate, nextItem, levelBand } from "@/lib/cat"  (P2, ~0:40)
export function estimate(
  _pool: Item[],
  responses: ItemResponse[],
): { theta: number; standardError: number } {
  return {
    theta: provisionalTheta(responses),
    standardError: Math.max(0.3, 1 / Math.sqrt(responses.length + 1)),
  };
}

export function nextItem(pool: Item[], responses: ItemResponse[]): Item | null {
  const answered = new Set(responses.map((r) => r.itemId));
  const remaining = pool.filter((it) => !answered.has(it.id));
  if (remaining.length === 0) return null;
  const theta = provisionalTheta(responses);
  // Pick the unanswered item whose difficulty is closest to current θ.
  return remaining.reduce((best, it) =>
    Math.abs(it.difficulty - theta) < Math.abs(best.difficulty - theta)
      ? it
      : best,
  );
}

export function levelBand(theta: number): LevelBand {
  if (theta < -1.5) return "Emerging";
  if (theta < -0.5) return "Beginning";
  if (theta < 0.5) return "Developing";
  return "On Track";
}

// ── Item pool (P2 → src/lib/itemBank.ts) ────────────────────────────────────
// SWAP: import { itemBank as itemPool } from "@/lib/itemBank"  (P2, ~1:10)
export const itemPool: Item[] = mockItems;

// ── Results sync (P3 → src/lib/resultSync.ts) ───────────────────────────────
// SWAP: import { syncResult } from "@/lib/resultSync"  (P3, ~1:00)
export async function syncResult(result: SessionResult): Promise<void> {
  // Fire-and-forget on the child path — MUST never throw (RULES §6).
  try {
    console.log("[syncResult mock] SessionResult:", result);
  } catch {
    /* fail soft */
  }
}

// ── Speaking section (P4 → src/components/speaking/SpeakingSection) ──────────
const CANNED_SPEAKING: SpeakingResult = {
  targetText: "The sun is up.",
  transcript: "the sun is up",
  wordMatchPct: 92,
  audioUrl: "",
};

// SWAP: import { SpeakingSection } from "@/components/speaking/SpeakingSection" (P4)
// Contract: onDone(result) on completion, onDone(undefined) on skip/failure.
export function MockSpeakingSection({
  onDone,
}: {
  onDone: (speaking: SpeakingResult | undefined) => void;
}) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-8 bg-violet-100 p-6 text-center text-slate-800">
      <div className="text-8xl">🦉</div>
      <p className="text-2xl font-bold">Now YOU read to me!</p>
      <p className="rounded-3xl bg-white px-6 py-4 text-4xl font-extrabold shadow">
        {CANNED_SPEAKING.targetText}
      </p>
      <button
        onClick={() => onDone(CANNED_SPEAKING)}
        className="flex min-h-[96px] min-w-[96px] items-center justify-center rounded-full bg-rose-500 p-6 text-6xl text-white shadow-lg active:scale-95"
        aria-label="Read aloud"
      >
        🎤
      </button>
      <button
        onClick={() => onDone(undefined)}
        className="min-h-[64px] rounded-2xl px-6 py-3 text-lg font-semibold text-slate-500 active:scale-95"
      >
        Skip for now →
      </button>
    </div>
  );
}
