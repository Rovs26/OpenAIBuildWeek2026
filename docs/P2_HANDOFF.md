# P2 handoff — CAT engine and bilingual item bank

## Status

The CAT engine, local item bank, and authoring scripts live on
`feat/p2-cat-item-bank`.  The engine is client-side only: it has no network,
React, or browser-storage dependency.

**Implementation complete — audio and human-review follow-up required.** The
child and results flows now use the real P2 engine and bank. TTS assets are
intentionally not represented by placeholder audio files.

### Delivered bank

- 36 runtime items: 18 English and 18 Filipino.
- 12 each of `hear-word`, `hear-sentence`, and `see-word`.
- Difficulty range: -2.4 through +2.5; discrimination: 1.2 seed values.
- 24 local audio targets, all following `/audio/<item-id>.mp3`.
- Generated audio: 0 in this checkout (`OPENAI_API_KEY` was not available).
- `public/audio-manifest.json` is generated from the bank and is consumed by
  the service-worker precache strategy.

## P1 integration

```ts
import { estimate, levelBand, nextItem } from "@/lib/cat";
import { itemBank } from "@/lib/itemBank";

const ability = estimate(itemBank, responses);
const currentItem = nextItem(itemBank, responses);
const band = levelBand(ability.theta);
```

`src/components/child/Session.tsx` now imports these real modules directly;
the 15-item cap remains in the P1 session state machine. `responses` may be
the existing `ItemResponse[]`; only `itemId` and `correct` are used.
`nextItem` returns `null` only when every bank item has been administered.

## Behavior contract

- Model: deterministic 2PL, `P(correct) = 1 / (1 + exp(-a * (theta - b)))`.
- Estimation: EAP over `[-4, 4]` with a 0.1 grid and `N(0, 1)` prior.
- Standard error: posterior standard deviation.
- Selection: unused item with greatest Fisher information; deterministic ties.
- Bands: `< -1.5` Emerging, `< -0.5` Beginning, `< 0.5` Developing, otherwise
  On Track. These are provisional demo thresholds, not official cut scores.

## P3 integration

`src/app/api/results/route.ts` now uses `estimate(itemBank, result.responses)`
and the shared `levelBand(theta)`. Unknown item IDs receive a controlled 400
response rather than a misleading score. The parent result card maps formats
from `itemBank`, not the retired mock bank.

The service worker reads `public/audio-manifest.json` at install time and
precache-attempts all final `/audio/<item-id>.mp3` paths while retaining its
cache-first audio behavior. Run `generate-audio-manifest.ts --check` whenever
the approved bank changes.

## Authoring commands

The repository intentionally has no TypeScript runtime dependency. Use the
P2 runner to compile a TypeScript authoring command locally before execution:

```sh
node scripts/run-ts.mjs scripts/test-cat.ts
node scripts/run-ts.mjs scripts/validate-items.ts --skip-assets
node scripts/run-ts.mjs scripts/check-item-assets.ts
node scripts/run-ts.mjs scripts/generate-items.ts --dry-run
node scripts/run-ts.mjs scripts/render-audio.ts
node scripts/run-ts.mjs scripts/generate-audio-manifest.ts --check
node scripts/run-ts.mjs scripts/verify-adaptive-paths.ts
```

The default validators are strict about missing audio. `--skip-assets` is only
for validating the item-data shape before clips are rendered.

## Audio follow-up gate

1. Set `OPENAI_API_KEY` in the shell; never commit it.
2. Run `render-audio.ts` for the approved bank.
3. Run both validators with no asset-skipping flags.
4. Manually review every Filipino clip for pronunciation, phrasing, volume,
   and prompt correspondence.
5. Bump `CACHE_VERSION` after final assets are committed, then load the PWA
   online once and rerun the phone airplane-mode flow.

### Filipino review table

No Filipino clip is marked approved without listening. All entries are blocked
only because no TTS credential was available in this checkout.

| Item ID | File | Status | Notes |
|---|---|---|---|
| fil-hw-01 | /audio/fil-hw-01.mp3 | Blocked | Generate, then human listening review required. |
| fil-hw-02 | /audio/fil-hw-02.mp3 | Blocked | Generate, then human listening review required. |
| fil-hw-03 | /audio/fil-hw-03.mp3 | Blocked | Generate, then human listening review required. |
| fil-hw-04 | /audio/fil-hw-04.mp3 | Blocked | Generate, then human listening review required. |
| fil-hw-05 | /audio/fil-hw-05.mp3 | Blocked | Generate, then human listening review required. |
| fil-hw-06 | /audio/fil-hw-06.mp3 | Blocked | Generate, then human listening review required. |
| fil-hs-01 | /audio/fil-hs-01.mp3 | Blocked | Generate, then human listening review required. |
| fil-hs-02 | /audio/fil-hs-02.mp3 | Blocked | Generate, then human listening review required. |
| fil-hs-03 | /audio/fil-hs-03.mp3 | Blocked | Generate, then human listening review required. |
| fil-hs-04 | /audio/fil-hs-04.mp3 | Blocked | Generate, then human listening review required. |
| fil-hs-05 | /audio/fil-hs-05.mp3 | Blocked | Generate, then human listening review required. |
| fil-hs-06 | /audio/fil-hs-06.mp3 | Blocked | Generate, then human listening review required. |

## Known limitations at this handoff

- No audio was generated in this checkout because `OPENAI_API_KEY` is absent.
- Filipino clips are therefore **not manually reviewed** yet.
- Strict asset validation correctly fails with 24 missing MP3 files until TTS
  is run; this is not weakened or bypassed.
- No physical-device or real airplane-mode test was performed in this checkout.

## Validation recorded in this checkout

- `node scripts/run-ts.mjs scripts/test-cat.ts` — passed; measured 0.138 ms per
  estimate-plus-selection update over 200 local iterations.
- `node scripts/run-ts.mjs scripts/validate-items.ts --skip-assets` — passed,
  36 items.
- `node scripts/run-ts.mjs scripts/generate-audio-manifest.ts --check` — passed,
  24 URLs exactly match the bank.
- `node scripts/run-ts.mjs scripts/verify-adaptive-paths.ts` — passed: mostly
  correct ends at theta 2.45 / On Track; all-wrong ends at theta -3.01 /
  Emerging; mixed ends at theta 0.29 / Developing; no repeats or non-finite values.
- `node scripts/run-ts.mjs scripts/check-item-assets.ts` — correctly reports
  24 missing audio files until TTS is rendered.
- `node scripts/run-ts.mjs scripts/generate-items.ts --dry-run --count 3
  --output /tmp/p2-item-candidates.json` — passed.
- `node scripts/run-ts.mjs scripts/render-audio.ts --dry-run` — passed; lists
  all 24 planned clips.
- `npm run build` — passed.
- `npm test` — passed 10/10. The native test now transpiles the P3 TypeScript
  sync module in memory using the already-installed TypeScript package.
