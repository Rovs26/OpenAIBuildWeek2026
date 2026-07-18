# Hackathon Plan — 2 hours, 4 people

**Read order for every teammate: this file → `RULES.md` → your `tasks/P*.md`.**
Paste `RULES.md` + `src/lib/types.ts` into every Claude Code and Codex prompt.

## What we demo

One phone-installable **PWA**: child taps avatar → mascot-voiced adaptive
assessment (difficulty visibly adapting) → **airplane mode flipped mid-session,
nothing breaks** → read-aloud with playback + Whisper scoring → celebration →
parent result card in Filipino → teacher class table with the live result.
Three audiences, one assessment, ~3 minutes.

## Scope

**IN:** PWA (manifest + handwritten service worker + offline session + install),
3 item formats, client-side 2PL CAT, ~30 real items with TTS audio (en+fil),
speaking via Whisper word-match, parent card, teacher table, Vercel deploy.

**OUT (do not build today):** auth/consent/magic links, database (in-memory +
seed), FastAPI (single Next.js repo), real images (emoji), forced alignment,
practice loop, regional languages. See `RULES.md` §5.

## Workstreams

| Worker | Mission | Claude Code (main) | Codex (parallel) | Spec |
|---|---|---|---|---|
| P1 | Child experience `/child` | Audio unlock, item renderer, adaptive loop | Journey bar, celebration screen | `tasks/P1.md` |
| P2 | CAT engine + item bank | 2PL EAP engine + tests | Item-gen + TTS scripts | `tasks/P2.md` |
| P3 | Repo, **PWA**, results API, teacher, deploy | Scaffold, SW, API, store | Teacher table + seed class | `tasks/P3.md` |
| P4 | Speaking, parent card, demo | Mic capture + transcribe route | Parent card + demo script | `tasks/P4.md` |

## Contracts (P3 commits these to `src/lib/types.ts` at minute 10 — then FROZEN)

```ts
type Item = {
  id: string;
  format: "hear-word" | "hear-sentence" | "see-word";
  language: "en" | "fil";
  prompt: string;            // text shown (see-word) or spoken (hear-*)
  audioUrl?: string;         // /audio/<id>.mp3, pre-rendered
  choices: { id: string; emoji?: string; label?: string }[];
  correctChoiceId: string;
  difficulty: number;        // b, roughly -3..+3
  discrimination: number;    // a, ~1.2
};

type SessionResult = {
  studentName: string;
  theta: number; standardError: number;
  responses: { itemId: string; choiceId: string; correct: boolean; ms: number }[];
  speaking?: { targetText: string; transcript: string; wordMatchPct: number; audioUrl: string };
  levelBand: "Emerging" | "Beginning" | "Developing" | "On Track";
};
```

## Timeline

| Time | Milestone |
|---|---|
| 0:00–0:10 | P3 scaffolds + commits contracts/mocks; P1/P2/P4 fire Codex on their parallel artifacts and prep Claude prompts |
| 0:30 | First deploy live. P1 renders mock items with audio unlock; P2 engine passes console test; P3 starts the airplane-mode test; P4 mic records + plays back |
| 0:40 | **PWA acceptance:** load once → airplane mode → child flow still works (P3) |
| 1:00 | **Integration:** P1 wires real CAT + item bank; results POST works; transcribe route live |
| 1:15 | Full child flow end-to-end on deployed URL, offline-capable |
| 1:30 | **Feature freeze.** Parent card + teacher table fed by a real session |
| 1:30–2:00 | P4 runs phone demo twice; backup video recorded; everyone fixes ONLY what run-throughs break |

## Cross-team ping points (post in team chat)

- P3 "repo up" (≈0:10) — unblocks everyone
- P2 "engine green" (≈0:40) — P1 swaps mock CAT
- P2 "bank + audio final" (≈1:10) — P1 swaps items; P3 verifies SW caches audio
- P3 "results API live" (≈1:00) — P1 wires syncResult; P4 wires parent card
- P4 "go/no-go live mic" (≈1:45) — demo decision

## Known demo risks

1. **Autoplay policy:** all audio flows through the AudioContext P1 unlocks in
   the avatar-tap handler — nothing plays before that gesture
2. **Live mic on stage:** `?mockSpeaking=1` is the default; live only after two
   clean phone run-throughs
3. **TTS Filipino quality:** P2 listens to every clip; bad audio = item deleted
4. **Offline demo:** the airplane-mode moment is rehearsed at 0:40, not invented
   on stage; backup screen recording is the disaster plan
