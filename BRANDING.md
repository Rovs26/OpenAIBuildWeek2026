# Basa Buddy — Brand Guide

Paste this whole file into any Claude design session. It is the single source of
truth for how Basa Buddy looks, sounds, and feels. When a design decision isn't
covered here, ask: *"Would a patient ate/kuya on a fiesta morning do this?"*

## 1. Brand essence

Basa Buddy is a warm big sister/brother (ate/kuya) who helps a 6–8 year old
Filipino child discover they can read — never a teacher grading them. The world
feels like a **fiesta morning**: sunny, cream-and-mango warm, gently festive,
proudly Filipino. Every screen should feel huggable.

Three words to test everything against: **warm · proud · patient.**
If a design feels sleek, corporate, cool-toned, or urgent — it's off-brand.

## 2. Name

**Basa Buddy** ("basa" = read). Always two words, both capitalized. The wordmark
is set in the display font (see §5), letters slightly rounded, mango on cream or
teal on cream. Never all-caps, never italic.

## 3. Mascot — Agi, the Philippine eagle chick

The mascot IS the brand: the voice, the guide, and the celebration.

- **Who:** a baby Philippine eagle (national bird) named **Agi** (from *agila*).
  A chick, not an adult raptor — round, fluffy, flightless, learning too.
- **Build:** one big soft oval body (no separate head), tiny wings that gesture,
  huge friendly eyes (40% of face height), the Philippine eagle's shaggy crest
  reduced to 3–4 soft cream tufts, small coral beak, stubby feet.
- **Colors:** warm brown-cream feathers (use palette: cream body, mango chest,
  coral beak/feet, deep-teal eyes). Never grayscale, never realistic plumage.
- **Personality:** ate/kuya energy — cheers you on, sits beside you, never
  points at you. Agi is *with* the child, not above them.
- **Core poses (the only 6 needed):** wave hello · listening (wing to ear) ·
  encouraging (wings up) · thinking (looking up) · celebrating (confetti jump) ·
  reading-along (wing following text).
- **Never:** sharp talons, fierce eyes, adult-eagle proportions, sad or
  disappointed expressions (Agi has no "wrong answer" face — see §7).

## 4. Color

### Palette

| Role | Name | Hex | Use |
|---|---|---|---|
| Background | Cream | `#FFF8EB` | every page background; the brand's "air" |
| Primary / joy | Mango | `#FFB703` | brand moments, journey bar, badges, wordmark |
| Action | Coral | `#FB8500` | the one tappable thing on screen, mic button |
| Text / anchor | Deep teal | `#126E82` | all body text and headings |
| Success / growth | Leaf | `#6BBF59` | progress, correct-streak sparkles, "on track" |

Tints: any color may be used at 15–25% opacity over cream for cards and fills
(e.g. mango 20% card with teal text).

### Rules

- Cream dominates (~70% of any screen). Mango ~15%, coral ~5% (actions only),
  teal ~10% (text). If a screen is mostly mango/coral, it's shouting.
- Text is ALWAYS deep teal on cream/white — never coral or mango text (fails
  contrast), never pure black (too harsh).
- White (`#FFFFFF`) only for cards floating on cream.
- **Teacher dashboard** uses the calm end: cream background, white cards, teal
  text, leaf/coral only as data colors (band chips, flags). No mascot, no
  oversized type — same family, adult register.
- **Parent card** sits between: cream + white cards, one mango header moment,
  Agi appears once (small, celebrating).

## 5. Typography

Two Google fonts, loaded via `next/font` (no new deps):

- **Display — "Baloo 2"** (SemiBold/Bold): wordmark, child-screen headings,
  celebration text, Agi's speech. Round, chubby, friendly.
- **Body — "Nunito"** (Regular/SemiBold): everything else — item labels, parent
  card body, the entire teacher dashboard.

Child screens: minimum 20px body, headings 32–48px, `see-word` prompts 56–64px.
Never more than two type sizes on one child screen. Never thin weights,
never all-caps sentences, never letter-spacing tricks.

## 6. Shape, layout, texture

- **Radius:** 24px minimum on everything (cards, buttons, chips). Choice cards
  and the mic button are `rounded-3xl` or full circles. Nothing sharp.
- **Blobs, not boxes:** decorative shapes are soft blobs/clouds/suns in mango or
  leaf tints — never geometric grids or lines.
- **Space:** generous — one idea per screen, ≥ 24px between choice cards,
  touch targets ≥ 64px (child screens ≥ 80px preferred).
- **Depth:** at most one soft shadow level (`shadow-md`, warm-tinted). No
  glassmorphism, no borders thinner than 2px; prefer thick 3–4px playful
  borders in the element's own color at 30%.
- **Illustration style:** flat with soft rounded shapes, emoji-compatible (our
  choice cards ARE emoji — surround them with brand-colored card fills so they
  feel designed, not defaulted).

## 7. Voice & tone — the warm ate/kuya

Filipino first, English beside it, everywhere a parent or child reads.

- Celebrate **effort**, never grade: "Galing! Tara, isa pa!" (*Great! Let's do
  one more!*) — never "Correct!" / "Wrong."
- There is no failure vocabulary in this product. Banned words: wrong, mali,
  failed, bagsak, score, level (in child/parent copy), test, exam. The
  assessment is a "reading adventure" (*paglalakbay sa pagbasa*).
- Short sentences a 6-year-old can hear once and get. One instruction at a time.
- Parent card tone: proud tita sharing good news, not a report card.
  "Ang galing niyang makinig ng mga kwento!" over "Comprehension: Developing."
- Sample shell lines (recorded/TTS, the brand's actual voice):
  - Welcome: "Tara na! Maglaro tayo!" — *Let's go! Let's play!*
  - Between items: "Kaya mo 'yan!" · "Isa pa!" · "Ang husay mo!"
  - Speaking intro: "Ngayon, IKAW naman ang magbasa sa akin!"
  - Celebration: "Nagawa mo! Ang galing-galing mo!"

## 8. Motion

- Personality: **gentle bounce** — spring easing, 300–500ms, small overshoot.
  Nothing snaps, nothing is instant, nothing takes > 800ms.
- Agi idles with a slow 2s breathing scale (1.00→1.03). Alive, not busy.
- During items: motion is CALM — cards fade+rise in 300ms, chosen card pulses
  once. Save the big energy for the celebration (confetti, Agi's jump).
- Journey bar advances with a satisfying 400ms slide + tiny star pop.
- Respect `prefers-reduced-motion`: swap bounces for fades.

## 9. Sound

- One voice across TTS and recordings: warm, unhurried, slightly exaggerated
  child-directed speech — the ate/kuya reading to a younger sibling. TTS
  instruction: "speak slowly and warmly to a 6-year-old, like a loving big
  sister."
- UI sounds (if any): soft, woody, marimba-like taps. No buzzers, no error
  sounds ever, no ding-per-answer (neutral encouragement — §7).

## 10. Per-surface summary

| Surface | Register | Agi | Type | Palette weight |
|---|---|---|---|---|
| `/child` | full fiesta-morning warmth | everywhere, guides everything | Baloo 2 + Nunito | mango/coral active |
| `/parent` | proud, warm, trustworthy | once, small, celebrating | Nunito + one Baloo 2 header | cream + white, mango accent |
| `/teacher` | calm, clear, professional | none | Nunito only | cream + white, colors as data |

## 11. Never do (anti-slop list)

- Purple/blue SaaS gradients, dark mode, glassmorphism, neumorphism
- Corporate Memphis people, stock illustration mashups, clip-art owls
- More than 2 fonts, thin/light weights, gray text (`#6b7280`-style)
- Red for anything child-facing (coral is the hottest we go)
- Progress percentages, scores, or numbers anywhere a child looks
- Crowded screens: if a child screen has 3+ competing elements, cut

## 12. Paste-ready prompt block for Claude design sessions

> Design for **Basa Buddy**, a literacy app for Filipino children aged 6–8.
> Brand: warm, proud, patient — "fiesta morning with a patient big sister."
> Mascot: Agi, a round fluffy Philippine eagle chick (cream/mango body, coral
> beak, huge teal eyes, soft crest tufts) — always kind, never fierce.
> Colors: cream `#FFF8EB` backgrounds (~70%), mango `#FFB703` joy, coral
> `#FB8500` for the single action, deep teal `#126E82` all text, leaf `#6BBF59`
> success. Fonts: Baloo 2 (display) + Nunito (body). Shapes: ≥24px radius,
> blobs not boxes, ≥64px touch targets, one idea per screen. Motion: gentle
> 300–500ms spring bounces. Copy: Filipino first with English, celebrates
> effort, no failure words, no numbers shown to children. Never: gradients,
> glassmorphism, gray text, red, thin fonts, crowded layouts.
