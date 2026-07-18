# RULES.md — paste this + `src/lib/types.ts` into EVERY agent prompt

You are one of eight AI agents (4 humans × Claude Code + Codex) building one app
in 2 hours. These rules exist so parallel work never collides. Violating them
costs the team more than whatever you were trying to improve.

## 1. Contracts are law

- `src/lib/types.ts` is FROZEN. Never edit it. If a task seems to require a type
  change, STOP and tell your human — P3 is the only person who may change it,
  after a team ping.
- Build against the types exactly. Do not add fields, rename fields, or "improve"
  the schema locally.

## 2. File ownership — edit ONLY your worker's paths

| Worker | Owns |
|---|---|
| P1 | `src/app/child/**`, `src/components/child/**` |
| P2 | `src/lib/cat.ts`, `src/lib/cat.test.ts`, `src/lib/itemBank.ts`, `scripts/**`, `public/audio/**` |
| P3 | `src/app/api/results/**`, `src/app/teacher/**`, `src/lib/store.ts`, `src/lib/resultSync.ts`, `src/app/layout.tsx`, `src/app/manifest.ts`, `public/sw.js`, `public/icons/**`, `src/components/SWRegister.tsx`, Vercel config |
| P4 | `src/app/api/transcribe/**`, `src/components/speaking/**`, `src/app/parent/**`, `DEMO.md` |
| Shared, frozen after minute 10 | `src/lib/types.ts`, `src/lib/mockItems.ts` |

- Never edit, refactor, reformat, or "clean up" another worker's files — even if
  you see a bug. Report it to your human instead.
- Importing from another worker's files is fine and expected. Editing them is not.

## 3. No new dependencies

Approved: `next`, `react`, `tailwindcss`, `openai` (server/scripts only).
Nothing else — no state libraries, no UI kits, no audio libraries, no PWA
plugins (the service worker is handwritten), no test frameworks. If a task seems
to need a package, write it by hand or tell your human.

## 4. Mock-first, never block

If something you consume isn't ready (CAT engine, real items, API route), build
against `src/lib/mockItems.ts` or a hardcoded stub behind the same signature,
and leave a `// SWAP:` comment at the integration point. Never wait, never stub
INSIDE someone else's file.

## 5. Scope is fixed

Do not add: auth, database, i18n framework, routing beyond `/child` `/parent`
`/teacher`, settings screens, analytics, error tracking, extra item formats,
animations beyond what the task specifies. Do not gold-plate. The dumb version
that works demos better than the elegant version that's 80% done.

## 6. Child-path behavior rules

- Mobile-first: build and test at 390 px wide viewport.
- Tailwind classes only — no CSS files, no styled-components.
- Touch targets ≥ 64 px on every child-facing tappable element.
- The child path NEVER shows an error state, spinner > 1 s, or dead end. Every
  failure fails soft: skip the step, keep the mascot cheerful, log to console.
- All audio playback must be triggered through the shared AudioContext that P1
  unlocks in the avatar-tap handler (mobile autoplay policy). Never `new Audio()`
  autoplay on mount.

## 7. Git discipline

- Small commits to your own paths, merge `main` into your branch (or commit to
  main directly if green) every ~15 minutes. Pull before push. NEVER force-push.
- Never commit: `.env.local`, API keys, `node_modules`, files outside your paths.
- `OPENAI_API_KEY` comes from `process.env` only, used only in API routes and
  `scripts/**` — never in client components.

## 8. Timeboxes

If an approach hasn't worked after ~10 minutes, ship the hardcoded/ugly version
and move to the next checklist item. Flag it with `// TODO(demo):`.

## 9. Definition of done (every task)

Done = renders/runs on the deployed Vercel URL on a phone, not just localhost.
If your change breaks `npm run build`, fixing that outranks everything else.
