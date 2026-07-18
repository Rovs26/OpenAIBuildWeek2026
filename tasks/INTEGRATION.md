# Integration Audit — branch `integration/connect-and-fix`

Audit of merged `main` (P1 + P3 + P4 landed; P2 in flight on
`feat/p2-cat-item-bank`). Build green, 13/13 tests pass — but the workstreams
are NOT yet talking to each other: the child session still runs 100% on mocks.

**What's already healthy (don't re-fix):** audio unlock + fail-soft chain,
kill-tab resume, SW cache strategy + retry queue wiring, results validation +
idempotent upsert, speaking soft-skip, teacher seeds. RULES ownership held — no
file collisions anywhere.

---

## A — Connect the seams (do first, ~20 min total)

### A1. Session → real SpeakingSection + real syncResult  (owner: P1, files: `src/components/child/Session.tsx`, `mocks.tsx`)
`Session.tsx` imports `MockSpeakingSection` and mock `syncResult` from `./mocks`
even though both real modules are on main.
- In `Session.tsx`: drop `MockSpeakingSection` + `syncResult` from the `./mocks`
  import; add
  `import SpeakingSection from "@/components/speaking/SpeakingSection";`
  (NOTE: **default** export, not named) and
  `import { syncResult } from "@/lib/resultSync";`
- Render `<SpeakingSection onDone={finish} targetText="The dog runs." language="en" />`.
- Delete the `syncResult` and `MockSpeakingSection` blocks from `mocks.tsx`.
- Contract check (already compatible): `onDone(undefined)` = skipped; real
  `syncResult` never throws (it queues to `pending-results` on failure).

### A2. Parent card never sees live results — relative fetch bug  (owner: P4, file: `src/app/parent/page.tsx`)
`fetchNewest()` does `fetch(\`${base}/api/results\`)` with `base = ""` unless
`NEXT_PUBLIC_BASE_URL` is set. In a **server component** Node's fetch requires
an absolute URL → this throws every time → the page silently always renders the
SEED fallback. The demo's "parent sees the real result" beat is currently fake.
- Fix: don't fetch at all. The server component runs in the same process as the
  store: `import { listResults } from "@/lib/store";` and take
  `listResults()[0]` (after A3 lands). Keep the SEED fallback for empty list.
- Add `export const dynamic = "force-dynamic";` so the page isn't statically
  cached with the seed.

### A3. Store "newest" ordering is wrong after re-assessment  (owner: P3, file: `src/lib/store.ts`)
`Map.set()` on an existing key keeps the ORIGINAL insertion position, so a
re-assessed student never moves to the front; `listResults().reverse()` then
lies about "newest". Parent card takes `list[0]` → shows a stale session
whenever the same child (e.g. "Demo Child") assesses twice — which is exactly
what happens in rehearsal + live demo.
- Fix in `upsertResult`: `resultStore.delete(key)` before `set(key, result)`
  (re-insert at the end). Ordering contract "GET returns newest first" then
  actually holds. Add one test case to the P3 suite: upsert same student twice,
  assert index 0.

### A4. Blob audio URL leaks into the synced result  (owner: P1, file: `Session.tsx` `finish()`)
`SpeakingSection` puts the child's local recording `blob:` URL into
`speaking.audioUrl`. That URL is only valid inside the child's page context —
synced to the server, the parent card's ClipPlayer gets a dead link (broken
play button instead of the "no clip" hint).
- Fix in `finish()`: sync a stripped copy —
  `speaking: speaking ? { ...speaking, audioUrl: "" } : undefined` — the child
  already had their playback moment; the parent card then correctly shows the
  transcript + % without a dead player. (Real clip upload = post-hackathon,
  needs object storage.)

---

## B — Real bugs on the child path

### B1. `see-word` items are read ALOUD — invalidates the decoding measure  (owner: P1, file: `ItemScreen.tsx`)
`playPrompt` fires for every format, and for `see-word` the TTS fallback speaks
`item.prompt` — i.e. the app reads the word to the child. The entire point of
`see-word` is that the CHILD decodes the printed word; right now it's a
listening item with text on screen, and P2's calibration for that format is
garbage. This is the most important bug in the audit.
- Fix: for `format === "see-word"` play an instruction phrase instead of the
  prompt: en "Tap the picture that matches the word!" / fil
  "Pindutin ang larawang tugma sa salita!" (pick by `item.language`). Replay
  (🔊) replays the instruction, never the word. `hear-*` formats unchanged.
- P2 note: when rendering TTS assets, generate NO audio for `see-word` items
  (they must stay silent apart from the instruction).

### B2. Speaking target is hardcoded English  (owner: P1, small)
With A1 done, `targetText` is fixed. Pick it from the session's language mix —
e.g. last answered item's language: fil → "Tumakbo ang aso." / en →
"The dog runs." Keep it one sentence; wire as a small map, not a system.

### B3. Student name is "Demo Child" for everyone  (owner: P1, small)
Teacher-table demo reads better with a real name and breaks A3's upsert story
if two demo runs collide. Read `?name=` from the URL
(`new URLSearchParams(location.search).get("name")`), default "Demo Child".
Demo runs as `/child?name=Amara&mockSpeaking=1`.

---

## C — P2 landing checklist (owner: P2, when `feat/p2-cat-item-bank` merges)

1. `Session`/`mocks.tsx`: swap `estimate`/`nextItem`/`levelBand` imports to
   `@/lib/cat`, `itemPool` to the real bank; delete the remaining mock blocks;
   `mocks.tsx` should end up EMPTY → delete the file.
2. `src/app/api/results/route.ts` `recomputeAbility()`: replace the
   proportion-correct placeholder with P2's `estimate(itemBank, responses)`
   (the `// SWAP:` is already there). Until this lands, client and server
   compute θ on DIFFERENT scales — teacher/parent numbers come from the server
   placeholder, so don't debug "mismatched theta" as a bug before this swap.
3. Confirm `see-word` items ship without `audioUrl` (see B1).
4. SW check: play one full session online, then airplane mode → item audio must
   come from cache (`/audio/**` is already cache-first; just verify).
5. Phone verification: deliberately answer all-wrong → level dots must fall;
   all-right → climb. This is the "watch it adapt" demo beat.

---

## D — Brand pass (owner: P4 or whoever is free; BRANDING.md is the spec)

Current UI is placeholder-flavored (sky/violet/rose, Geist, 🦉). Apply §12 of
BRANDING.md minimally:
1. `layout.tsx`: swap Geist → Baloo 2 (display) + Nunito (body) via `next/font`.
2. Global palette sweep on the three surfaces: cream `#FFF8EB` backgrounds,
   deep teal `#126E82` text, mango/coral accents (child), calm register for
   teacher, warm register for parent — class swaps only, no layout changes.
3. Mascot emoji: keep one consistent choice everywhere (🦅 chick isn't an
   emoji; 🐤 reads "chick", 🦉 reads "learning" — pick ONE, all surfaces).
4. `viewport.themeColor` → `#FFB703`; manifest name/colors to match.
Timebox: 30 min. Do NOT redesign components.

---

## E — Final verification (owner: P4, after A+B merge)

- `npm run build` + `node --test` green (13+ tests).
- Phone run-through per `DEMO.md`: child (`?name=…&mockSpeaking=1`) →
  celebration → `/parent` shows THAT session (not seed — proves A2/A3) →
  `/teacher` shows the row. Then the airplane-mode beat mid-items.
- Re-record the backup video only after A+B land (the current one shows the
  mock speaking screen).

**Merge order: A3 → A1/A2/A4 (parallel) → B → D → E. C whenever P2 lands.**
