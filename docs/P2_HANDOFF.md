# P2 handoff — CAT engine and bilingual item bank

## Status

The CAT engine, local item bank, and authoring scripts live on
`feat/p2-cat-item-bank`.  The engine is client-side only: it has no network,
React, or browser-storage dependency.

TTS assets are intentionally **not** represented by placeholder audio files.
They must be generated with `OPENAI_API_KEY` and manually listened to before
the offline-audio acceptance claim is made.

### Delivered bank

- 36 runtime items: 18 English and 18 Filipino.
- 12 each of `hear-word`, `hear-sentence`, and `see-word`.
- Difficulty range: -2.4 through +2.5; discrimination: 1.2 seed values.
- 24 local audio targets, all following `/audio/<item-id>.mp3`.
- Generated audio: 0 in this checkout (`OPENAI_API_KEY` was not available).

## P1 integration

```ts
import { estimate, levelBand, nextItem } from "@/lib/cat";
import { itemBank } from "@/lib/itemBank";

const ability = estimate(itemBank, responses);
const currentItem = nextItem(itemBank, responses);
const band = levelBand(ability.theta);
```

`responses` may be the existing `ItemResponse[]`; only `itemId` and `correct`
are used. `nextItem` returns `null` only when every bank item has been
administered. P1 should retain its predictable 15-item session cap.

## Behavior contract

- Model: deterministic 2PL, `P(correct) = 1 / (1 + exp(-a * (theta - b)))`.
- Estimation: EAP over `[-4, 4]` with a 0.1 grid and `N(0, 1)` prior.
- Standard error: posterior standard deviation.
- Selection: unused item with greatest Fisher information; deterministic ties.
- Bands: `< -1.5` Emerging, `< -0.5` Beginning, `< 0.5` Developing, otherwise
  On Track. These are provisional demo thresholds, not official cut scores.

## P3 integration

Use `estimate(itemBank, result.responses)` and `levelBand(theta)` in the
server-side result recomputation once P3 is ready to replace its temporary
fallback. The final audio convention is `/audio/<item-id>.mp3`; P3's service
worker should precache the generated files (not merely cache them on first
request) before the airplane-mode demo.

## Authoring commands

The repository intentionally has no TypeScript runtime dependency. Use the
P2 runner to compile a TypeScript authoring command locally before execution:

```sh
node scripts/run-ts.mjs scripts/test-cat.ts
node scripts/run-ts.mjs scripts/validate-items.ts --skip-assets
node scripts/run-ts.mjs scripts/check-item-assets.ts
node scripts/run-ts.mjs scripts/generate-items.ts --dry-run
node scripts/run-ts.mjs scripts/render-audio.ts
```

The default validators are strict about missing audio. `--skip-assets` is only
for validating the item-data shape before clips are rendered.

## Audio release gate

1. Set `OPENAI_API_KEY` in the shell; never commit it.
2. Run `render-audio.ts` for the approved bank.
3. Run both validators with no asset-skipping flags.
4. Manually review every Filipino clip for pronunciation, phrasing, volume,
   and prompt correspondence.
5. Give P3 the final `/audio/*.mp3` list for precaching and rerun the phone
   airplane-mode flow.

## Known limitations at this handoff

- No audio was generated in this checkout because `OPENAI_API_KEY` is absent.
- Filipino clips are therefore **not manually reviewed** yet.
- P1/P3/P4 swap points remain owned by their respective workers and have not
  been edited by P2.

## Validation recorded in this checkout

- `node scripts/run-ts.mjs scripts/test-cat.ts` — passed; measured 0.186 ms per
  estimate-plus-selection update over 200 local iterations.
- `node scripts/run-ts.mjs scripts/validate-items.ts --skip-assets` — passed,
  36 items.
- `node scripts/run-ts.mjs scripts/check-item-assets.ts` — correctly reports
  24 missing audio files until TTS is rendered.
- `node scripts/run-ts.mjs scripts/generate-items.ts --dry-run --count 3
  --output /tmp/p2-item-candidates.json` — passed.
- `node scripts/run-ts.mjs scripts/render-audio.ts --dry-run` — passed; lists
  all 24 planned clips.
- `npm run build` — passed.
- `npm test` — P2 does not own the four failing P3 `resultSync.ts` loader tests;
  the other four P3 integration tests passed.
