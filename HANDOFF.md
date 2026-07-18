# HANDOFF — Integration executor agent

You are picking up mid-hackathon work with zero prior context. This file is
self-contained: everything you need is here or in the four files listed below.
You are expected to reason carefully, but the scope is deliberately narrow —
depth goes into correctness of the listed fixes, NOT into finding extra work.

## Ground state (verified true at handoff)

- Repo: Next.js (App Router) + TypeScript + Tailwind, npm. Single app.
- You are on branch **`integration/connect-and-fix`** (tracks origin). Stay on
  it. Never touch `main`. Never force-push.
- `npm run build` is green; `node --test` passes 13/13. Keep both true after
  EVERY commit — a red build outranks any task.
- Merged workstreams: P1 (child assessment UI), P3 (PWA + results API +
  teacher), P4 (speaking + parent card). NOT merged: P2 (real IRT engine +
  item bank, in flight on `feat/p2-cat-item-bank` — not your concern except
  where §C notes say "when P2 lands"; do NOT merge or wait for it).
- The app currently DEMOS as integrated but is not: the child session runs on
  local mocks; results never reach the server; the parent page always renders
  seed data. Your job is to make the real data path true.

## Read order (before any edit)

1. `RULES.md` — hard constraints. §1 frozen contracts, §3 no new deps, §5
   fixed scope, §6 child-path behavior (fail-soft, no error states), §9 done.
2. `tasks/INTEGRATION.md` — your task list. You execute sections **A, B, E**.
   Section C is NOT yours (P2's). Section D only if explicitly instructed.
3. `src/lib/types.ts` — frozen; read, never edit.
4. `DEMO.md` — the demo you must not break.

## Execution order and commit discipline

Execute in exactly this order (dependencies are real):

1. **A3** store ordering fix (`src/lib/store.ts`) + one new test in the P3
   suite proving upsert-same-student-twice lands at index 0.
2. **A1** wire real `SpeakingSection` (DEFAULT export) + real `syncResult`
   into `src/components/child/Session.tsx`; delete the two replaced mock
   blocks in `src/components/child/mocks.tsx` (leave the CAT mocks — P2's).
3. **A2** parent page reads `listResults()[0]` from `@/lib/store` directly
   (server component, same process — delete the broken `fetchNewest` HTTP
   path entirely); add `export const dynamic = "force-dynamic"`.
4. **A4** strip `blob:` audio URL from the synced copy in `Session.finish()`.
5. **B1** `see-word` items must never be spoken (`ItemScreen.tsx`): play the
   language-matched instruction phrase instead of `item.prompt`; replay
   follows. Think hardest here — this is a measurement-validity fix; the
   printed word must NEVER reach any TTS/audio path for `see-word`.
6. **B2** speaking `targetText` from session language mix (small map, no
   system). **B3** `?name=` student name param, default "Demo Child".
7. **E** verification (below), then final report.

One commit per numbered step, message `fix(scope): what — why`, e.g.
`fix(store): re-insert on upsert so GET /api/results is truly newest-first`.
Push the branch after each passing commit.

## Verification (step E — do not skip, do not simulate)

- `npm run build` and `node --test` after every step; all green at the end.
- Data-path proof, run against a local prod server (`npm run build && npm run
  start`), using curl + a crafted POST to `/api/results`:
  a fresh POST for student X then GET must return X first; a second POST for X
  with different responses must return the SECOND session first.
- Confirm `/parent` HTML (curl) reflects a POSTed result, not the seed
  (seed student name must not appear when a real result exists).
- Report honestly: anything not verified is listed as unverified, not implied
  green.

## Hard boundaries (a capable model will be tempted; do not)

- Do NOT edit `src/lib/types.ts`, `public/sw.js`, anything under
  `src/app/teacher/`, or the CAT mock functions (`estimate`, `nextItem`,
  `levelBand`, `itemPool`) — P2 replaces those.
- Do NOT add dependencies, tests frameworks, abstractions, or refactors beyond
  the listed edits. No renames. No "while I'm here" cleanups.
- Do NOT implement section C, real audio upload, auth, or a database.
- Child path may never gain an error state, spinner, or thrown exception —
  every new failure path resolves soft (RULES §6).
- If a listed fix conflicts with what you find in the code (the code moved
  since audit), STOP that step, note the discrepancy in your report, continue
  with the other steps. Do not improvise a different architecture.

## Final report format

1. Per step: done/blocked, files touched, commit hash.
2. Verification transcript: the actual commands and observed outputs.
3. Discrepancies found vs. this handoff (if any).
4. Anything left for humans (should be: section C trigger, section D if not
   instructed, phone run-through — a device you don't have).
