# Architecture — v1: Child-Driven Adaptive Onboarding Assessment

UX-first architecture for the v1 centerpiece. Every technical decision below is derived
from the experience decisions, which are locked as:

| Decision | Choice |
|---|---|
| Centerpiece | Student onboarding adaptive assessment |
| Learner | Grades 1–3 (pre-readers / early readers) |
| Device | Family Android phones, web app (PWA) |
| Languages | English + Filipino (UI audio and items) |
| Session driver | Fully child-driven — zero reading, zero typing, voice guides everything |
| Speaking | Short section: 2–3 read-aloud items at the end |
| Session shape | One 10–12 min sitting, ~15–20 items, framed as a mascot journey |
| Item formats | Hear word → tap picture · Hear sentence → tap picture · See word → tap picture |
| Voice | Hybrid: human-recorded shell phrases + TTS-rendered item audio |
| Child entry | Parent magic link → child taps their avatar; no passwords on child path |
| Item feedback | Warm neutral encouragement regardless of correctness; visible journey progress |
| Finish | Child celebration (no numbers) + parent summary card + teacher dashboard sync |

## 0. The one governing constraint

**The child's session must never wait on the network.** The learner is 6–8, alone,
on a low-end Android phone over spotty mobile data. Any mid-session spinner, stalled
audio, or failed round trip ends the session — a young child cannot troubleshoot.

Therefore: **the entire assessment is downloaded up front and runs client-side.**
The network is used exactly twice on the happy path — once to load the session bundle
before the child starts, and once (opportunistically, retried) to sync results after.
This single decision shapes most of what follows.

## 1. Experience walkthrough → what each moment demands of the system

### 1.1 Parent setup (once, ~2 minutes)

School sends parents a link via SMS/Messenger. The link contains a signed, single-family
token minted by the school roster.

1. Parent opens link → sees child's name pre-filled from the roster, in Filipino/English.
2. Consent screen: plain-language, checkbox consent covering assessment data + voice
   recording (RA 10173). Recorded server-side with timestamp against the token.
3. Child picks an avatar (this is the child's identity from now on).
4. Sound check: "Can you hear the bird? Tap it!" — verifies volume/speaker before the
   child ever starts, while an adult is still present.
5. Prompt to add to home screen (PWA install), so the child can reopen it alone.

**System demands:** magic-link token service; roster import (CSV from school is enough
for v1); consent log table; PWA manifest + service worker registered on first visit so
the shell is cached from day one.

### 1.2 Child opens the app (every time)

Child taps the home-screen icon → sees their own avatar, big, centered → taps it →
the mascot greets them by name (recorded shell audio + TTS name, or name omitted in v1).
No password, no menu, no text.

**System demands:** device-bound session (long-lived token in localStorage keyed to the
family link); app shell fully cached by the service worker so this screen opens even
offline; a single primary action per screen (the child path never shows two competing
choices except answer options).

### 1.3 Session start: the bundle download

While the mascot does its greeting animation (~10–15 s of recorded audio + animation),
the app downloads the **session bundle** in the background:

- A slice of the item pool: **~60–80 items spanning the full difficulty range** for the
  child's grade band and assigned language mix — enough for the adaptive engine to route
  anywhere, though only ~15–20 will be served.
- All audio for those items (pre-rendered TTS, Opus ~24 kbps mono) and all images
  (WebP, ≤30 KB each). Budget: **≤ 8 MB total**, tested on 3G.
- The 2PL item parameters for those items (difficulty *b*, discrimination *a*).

If the download can't finish, the mascot says (recorded phrase) "Let's try again in a
little while!" — the child never starts a session that could strand them halfway.
If a bundle was previously cached and is still fresh, start instantly with no network.

**System demands:** a `GET /session-bundle` endpoint that selects the pool slice
server-side (so the server still controls content assignment); content-addressed asset
URLs cached by the service worker; a bundle manifest with a hash so partially-cached
bundles resume rather than restart.

### 1.4 The adaptive loop (items 1 → ~17)

Each item: mascot audio plays the prompt → 3–4 big picture (or word) cards fade in →
child taps → warm neutral response (recorded, rotated from a pool of ~8 phrases) →
journey marker advances → next item.

- **Item selection and ability estimation run on-device.** The 2PL EAP/MLE update and
  maximum-information selection are a few dozen lines of arithmetic — no server needed.
  The grade level from the roster sets the prior θ; each tap updates θ and its standard
  error; the next item is chosen from the local pool to maximize information at current θ.
- **Fixed length (~17 tap items + 2–3 speaking), not stop-on-confidence** — the journey
  map has a fixed number of stops, which is what makes the session legible as a game.
  The θ standard error is still recorded, so reports carry confidence.
- **Zero-latency transitions:** the next item's audio is preloaded while the current one
  plays (it's already in cache — "preload" means decoded and ready). Target < 300 ms
  between tap and next prompt starting.
- **Replay affordance:** one persistent button (speaker icon) replays the current prompt.
  Replays are logged as telemetry — they're a signal (attention, audio trouble, difficulty).
- **No timers visible to the child.** Response time is recorded silently for telemetry
  but never pressures a 6-year-old.
- Every response is appended to a local event log (IndexedDB) the moment it happens —
  a killed browser tab loses nothing already answered.

**System demands:** client-side CAT module (TypeScript, unit-tested against a Python
reference implementation to keep parity with server-side recalibration); IndexedDB
event log with monotonic sequence numbers; an item renderer with exactly three layout
templates (one per item format) — new items are data, never new code.

### 1.5 Speaking section (items ~18 → 20)

Framed as the journey's summit: "Now YOU read to ME!" (recorded phrase). The child sees
a large word or short sentence, taps the big microphone button, reads aloud, taps again
(or auto-stop on 2 s silence).

- Mic permission is requested **here**, not at app start — in context, right after the
  mascot explains it, when the child understands why. If permission is denied or the mic
  fails, the mascot cheerfully skips the section ("We'll read together next time!") and
  the assessment completes without it. **Speaking failure must never fail the session.**
- Audio is captured via MediaRecorder (Opus), stored locally, uploaded in the background
  after the session with retry. **Scoring is asynchronous and server-side** (Whisper
  transcription + forced alignment → words-correct, per-word accuracy). The child never
  waits for a score — consistent with neutral-encouragement feedback anyway.
- Immediate playback of their own recording ("Listen to yourself read!") is the reward —
  it needs zero scoring and children love it.

**System demands:** upload queue in the service worker (background sync w/ retry);
scoring worker (GPU or API-based Whisper) that writes speaking scores onto the session
record when done; parent/teacher reports render with tap-item results immediately and
speaking results appended when scoring lands.

### 1.6 Finish: three audiences, three renders, one data object

1. **Child (immediately):** full-screen celebration — mascot dance, badge, confetti,
   recorded "You did it!". No numbers, no levels, no charts. A single exit action.
2. **Parent (same link, minutes later):** the magic link now shows a result card in
   Filipino/English: level band (words, not scores — e.g. "Nagsisimulang bumasa /
   Beginning reader"), 2–3 strengths, 2–3 "practice at home" suggestions, and the
   speaking clip. Sent as an SMS/Messenger nudge when scoring completes.
3. **Teacher (dashboard):** θ per domain with confidence, competency tags, intervention
   flag if θ sits below the grade-band benchmark. v1 dashboard can be a simple table +
   class distribution chart — the analytics architecture from the project brief (§4.8)
   consumes the same event log later.

**System demands:** results sync endpoint (idempotent, accepts the full local event log;
server recomputes θ from raw responses as the source of truth — the client estimate is
for UX flow only); one `session_result` object with three renderers; SMS/Messenger
notification hook (can be manual/stubbed at build week).

## 2. System components

```
 Family phone (PWA)                        Backend (FastAPI, ap-southeast-1)
┌───────────────────────────┐             ┌──────────────────────────────────┐
│ App shell (cached)        │   bundle    │ Session bundle service           │
│ Item renderer (3 formats) │◄────────────│  pool-slice selection            │
│ CAT engine (client 2PL)   │             │ Results ingest (idempotent)      │
│ IndexedDB event log       │────────────►│  server-side θ recompute         │
│ Audio preloader           │   results   │ Token/consent service            │
│ Mic capture + upload queue│────────────►│ Speaking scoring worker (async)  │
│ Service worker (sync)     │   audio     │  Whisper + forced alignment      │
└───────────────────────────┘             │ Postgres (+ object storage)      │
                                          └──────────────┬───────────────────┘
 Parent link (same PWA, adult mode)                      │
 Teacher dashboard (table + charts)◄─────────────────────┘

 Authoring pipeline (offline, never on child path):
 LLM item generation → teacher review queue → TTS render (batch) →
 image pairing → parameter seeding → item bank → bundle slices
```

### Content/authoring pipeline (batch, offline)

1. LLM generates items per format/language/difficulty band, tagged to DepEd MELCs
   (structured JSON output).
2. Teacher review queue — nothing reaches the item bank unapproved.
3. **TTS renders item audio at authoring time**, stored as files. Runtime TTS never
   happens on the child path (latency, cost, consistency).
4. Recorded shell phrases are a fixed asset pack (~30 phrases × 2 languages), shipped
   with the app shell.
5. Item difficulty seeded from graded word lists / readability; recalibrated from the
   accumulating response log (server-side, matching the client CAT implementation).

### Data model (core tables)

`institutions` · `classes` · `students` (roster) · `family_links` (token, consent,
timestamps) · `items` (format, language, MELC tag, asset refs, a/b params, review
status) · `sessions` · `response_events` (append-only, the raw truth) ·
`speaking_recordings` (object-store ref, scores, retention clock) · `session_results`
(computed; one row, three renderers).

## 3. UX guardrails (testable requirements, not vibes)

- **Tap → next prompt < 300 ms**, measured on a low-end Android device, throttled 3G,
  after bundle load.
- **Zero mid-session network dependencies** — the session must complete in airplane
  mode once the bundle is loaded. This is a CI-testable property.
- **Zero required reading on the child path.** Every screen the child sees must pass a
  "no text needed" audit (text may appear, but never as the only carrier of meaning).
- **One primary action per screen** on the child path; answer cards are the only
  multi-choice moment.
- **Touch targets ≥ 64 px**, generous spacing — early-grade fine motor control.
- **Interruption-proof:** killing the tab mid-session and reopening resumes at the same
  journey stop with nothing lost.
- **Speaking is always skippable** without failing the session.
- **Audio is mandatory, so audio failure is a handled state:** if playback fails, the
  mascot screen shows a parent-facing prompt — never a broken silent item.

## 4. Build order (build-week slice)

1. **Item renderer + 3 formats + shell audio** with a hardcoded 20-item bundle —
   the child experience, demoable on a phone, day 1–2.
2. **Client CAT engine** (2PL, ~100 lines + tests) wired to the local pool — the
   "watch it adapt" demo moment.
3. **Bundle service + results ingest + Postgres** — real end-to-end data flow.
4. **Speaking capture + async Whisper scoring** — capture and playback first (already
   demoable); scoring lands when it lands.
5. **Parent result card + minimal teacher table** — closes the three-audience story.
6. Authoring pipeline (LLM → review → TTS) — can be a script + spreadsheet at build
   week; productize after.

Deferred beyond v1: practice loop, regional languages, offline-first *bundle refresh*
strategy at scale, ClickHouse analytics, SSO/rostering integrations, item recalibration
automation.
