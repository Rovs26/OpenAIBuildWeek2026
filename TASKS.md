# Hackathon Plan — 2 hours, 4 people

## What we demo (and nothing else)

One phone-sized web app: child taps avatar → mascot voice guides an adaptive
assessment (picture-choice items, difficulty visibly adapting) → short read-aloud
with playback → celebration → switch to parent result card → switch to teacher
class table. Judges see the full three-audience story in ~3 minutes.

## Ruthless cuts (do not build these today)

- No PWA / offline / service workers — normal web app, good Wi-Fi assumed on stage
- No auth, consent flows, magic links — a `/child`, `/parent`, `/teacher` URL each
- No database — in-memory store in Next.js API routes + one seed file
- No FastAPI — **single Next.js repo**, API routes only. One deploy, zero integration hell
- No real images — emoji / icon set for picture choices (big, colorful, instant)
- No Filipino TTS risk on stage — items in English + Filipino, but pick the 20 demo
  items from whatever the TTS renders well
- Speaking "score" = Whisper transcript vs target word match %. No forced alignment

## Ground rules (first 10 minutes, whole team)

1. One person (P3) creates the repo: `create-next-app` (TypeScript, App Router,
   Tailwind), pushes immediately. Everyone branches; merge to main early and often —
   at this timescale, merge conflicts hurt more than broken main.
2. **Agree the two contracts before splitting** — commit `src/lib/types.ts` first:

```ts
// Contract 1: an item
type Item = {
  id: string;
  format: "hear-word" | "hear-sentence" | "see-word";
  language: "en" | "fil";
  prompt: string;            // text shown (see-word) or spoken (hear-*)
  audioUrl?: string;         // /audio/<id>.mp3, pre-rendered
  choices: { id: string; emoji?: string; label?: string }[];
  correctChoiceId: string;
  difficulty: number;        // b, roughly -3..+3
  discrimination: number;    // a, ~1.0
};

// Contract 2: a finished session
type SessionResult = {
  studentName: string;
  theta: number; standardError: number;
  responses: { itemId: string; choiceId: string; correct: boolean; ms: number }[];
  speaking?: { targetText: string; transcript: string; wordMatchPct: number; audioUrl: string };
  levelBand: "Emerging" | "Beginning" | "Developing" | "On Track";
};
```

3. Mock data lives in `src/lib/mockItems.ts` from minute 10 so nobody waits on anyone.

## The four workstreams

### P1 — Child experience (the demo IS this)

**Owns:** `/child` route. Avatar tap-in → item screens for all 3 formats → warm
encouragement + journey progress bar → celebration screen.
- Big touch targets, one action per screen, audio autoplays per item, replay button
- A visible (subtle) difficulty indicator so judges can SEE it adapting —
  e.g. tiny level dots that shift; normally we'd hide this, for demo it's the pitch
- Consumes `Item[]` from mocks first, swaps to P2's real bank + CAT hook when ready
- **Claude Code:** drives the whole build. **Codex:** in parallel, generate the
  celebration/mascot screen and journey-bar component from a one-paragraph spec
  while Claude builds the item renderer.

### P2 — CAT engine + item bank (the brain + the content)

**Owns:** `src/lib/cat.ts` + the real item bank + audio assets.
- 2PL EAP ability update + max-information item selection (~100 lines).
  Exposes exactly: `nextItem(pool, responses): Item` and
  `estimate(responses): { theta, standardError }` — P1 needs nothing else
- Script: GPT generates ~40 items across difficulty bands (both languages,
  emoji-choice friendly) → hand-skim them → script renders audio via OpenAI TTS
  into `public/audio/`. Commit the JSON + mp3s directly
- Console-test the adaptivity: all-correct answers must climb, all-wrong must fall
- **Claude Code:** the CAT engine + a tiny test. **Codex:** the item-generation +
  TTS-render script simultaneously — the two halves don't touch

### P3 — Repo, results flow, teacher view

**Owns:** repo setup (minute 0–10), then `/api/results` (POST/GET, in-memory) +
`/teacher` route.
- Teacher table: seeded class of ~12 fake students with plausible θ spread +
  1–2 red intervention flags, so the live demo child appears in a full classroom
- Class distribution strip chart if time; table alone is fine
- Owns Vercel: deploy main from minute 30, redeploy often — never demo localhost
- **Claude Code:** scaffold + API + teacher page. **Codex:** generate the seed
  dataset and the table/chart component in parallel

### P4 — Speaking + parent card + demo glue

**Owns:** speaking section component, `/api/transcribe`, `/parent` route, demo script.
- Mic capture (MediaRecorder) → play back to child ("listen to yourself!") →
  POST to Whisper API → word-match % vs target
- **Speaking must be skippable and mocked-by-default** — a `?mockSpeaking=1` flag
  returning a canned transcript. Live mic on stage is the riskiest moment we have
- Parent card: level band in words (Filipino + English), 2 strengths, 2 home tips,
  the audio clip. Reads the same `SessionResult`
- Writes the 3-minute demo script + runs the full flow on a real phone at T+90
- **Claude Code:** speaking component + transcribe route. **Codex:** parent card
  page from the `SessionResult` type + a first-draft demo script

## Timeline

| Time | Milestone |
|---|---|
| 0:00–0:10 | Repo up, contracts committed, mocks in, everyone building |
| 0:30 | First deploy (broken is fine). P1 renders mock items; P2's CAT passes console test |
| 0:60 | **Integration point:** P1 wires CAT + real items. P3's results POST works. Speaking records + plays back |
| 1:15 | Full child flow end-to-end on the deployed URL |
| 1:30 | **Feature freeze.** Parent card + teacher table fed by a real session |
| 1:30–2:00 | P4 runs demo on a phone twice; everyone fixes only what the run-through breaks; pre-record a backup screen video on the second clean run |

## Agent usage rules (2-hour edition)

- Pattern per person: **Claude Code on your main artifact, Codex fired in parallel
  on your secondary artifact** — every person is two workstreams
- Give agents the `types.ts` contracts in every prompt; that's what keeps four
  parallel builds compatible
- Accept the first working version of everything. Iterate only on the child flow —
  it's the only screen judges stare at
- If an agent flounders for 10 minutes on anything, hand-code the dumb version.
  In-memory, hardcoded, and ugly all demo fine

## Known demo risks

1. **Autoplay policy:** mobile browsers block audio before a user gesture — the
   avatar tap is our unlock; P1 must init the AudioContext in that tap handler
2. **Live mic:** default to `?mockSpeaking=1` in the demo; go live only if the
   T+90 phone run-through was clean twice
3. **TTS Filipino quality:** pick demo items by listening; drop any item whose
   audio sounds off
4. **Backup:** the screen recording from the clean run-through is the disaster plan
