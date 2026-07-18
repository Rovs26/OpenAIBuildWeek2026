# DEMO.md — ~3 minute run-through

**Presenter:** one person drives the phone, one narrates (or the same person does
both). Everything below is the exact script. **Default to the mock speaking path**
(`?mockSpeaking=1`) unless BOTH live run-throughs were clean (see Go/No-Go).

**Before you start (off-camera):**
- Phone on the deployed Vercel URL, screen mirrored to the projector.
- Child link opened to `/child?mockSpeaking=1` (mock is the safe default).
- A second device or tab open on `/teacher` and `/parent`.
- Volume up. Airplane-mode toggle reachable. Backup screen-recording ready to play
  if the network dies.

---

## 1. Problem (30 s)

**Say:**
> "In the Philippines, **91% of ten-year-olds** can't read a simple sentence —
> that's called learning poverty. The catch: a teacher with **40 kids** can't sit
> down one-on-one to find out where each child actually is. So no one gets the
> right help."

> "We built one 5-minute assessment that speaks to three audiences at once — the
> child, the parent, and the teacher — with zero extra teacher hours."

---

## 2. Child (90 s)

**Do:** Hand-hold the phone so the room can see. Tap the avatar to start.

**Say:**
> "The child just taps the friendly avatar — no login, no reading instructions."

**Do:** Answer the first item correctly. Then **answer 2 items WRONG on purpose.**
Point at the level dots / progress indicator.

**Say (pointing):**
> "Watch the level indicator drop as she misses these — the test is **adapting in
> real time**, hunting for her true reading level. It's not a fixed quiz; every
> answer changes the next question."

**Do:** Now **turn ON airplane mode.** Answer 2 more items.

**Say:**
> "I just killed the Wi-Fi — this is a rural classroom, the connection died
> mid-test. Notice **she didn't notice.** It keeps running, saving every answer
> locally."

**Do:** Turn airplane mode **OFF.** Continue to the speaking step.

**Say:**
> "Now the moment kids love — she reads a sentence out loud."

**Do:** On the speaking screen the target sentence shows big. In mock mode, tap the
big mic once — it plays the short friendly flow and returns a 92% match. (Live
mode: tap mic, read *"The dog runs."*, tap to stop, then tap play to hear herself,
then "I'm done!")

**Say:**
> "She hears herself read it back, and behind the scenes Whisper scored it — she
> read **92% of the words** correctly. Then: celebration."

**Do:** Let the celebration screen play.

---

## 3. Parent (30 s)

**Do:** Switch to the `/parent` tab.

**Say:**
> "Same session, now for mom — **in Filipino first**, English underneath. No
> jargon, no scores, no theta. Just: *'Nagsisimulang bumasa — Beginning reader.'*"

**Do:** Point at strengths and home tips.

**Say:**
> "Two things her child is good at, two things to practice at home tonight — and
> she can replay the exact clip of her kid reading."

**Do:** Tap the speaking clip line / play button.

---

## 4. Teacher (30 s)

**Do:** Switch to the `/teacher` tab. Find the just-finished student's row among the
classmates.

**Say:**
> "And here's the teacher's view — that same child is now a **live row** next to her
> 12 classmates. The red flags show her exactly who needs help first, sorted for
> her."

**Do:** Point at the flagged rows.

**Say (close):**
> "One assessment. Three audiences — child, parent, teacher. **Zero teacher hours.**
> That's how you find 40 kids' reading levels before lunch."

---

## Go / No-Go on live mic

- Live mic **only if** both full run-throughs on the real phone (deployed URL) were
  clean. Otherwise run `?mockSpeaking=1` — it never touches the mic and always
  returns 92%.
- If anything stalls on stage: the child path fails soft (skips speaking, keeps the
  mascot cheerful) and the parent/teacher screens fall back to a seeded session, so
  the demo continues regardless.

## Backup

- Screen-recording of the second clean run is the disaster backup — play it if the
  venue network dies.

---

### TODO(demo) — confirm before stage
- [ ] TODO(demo): confirm P1's `/child` route mounts `<SpeakingSection>` and passes
      the real target text (default in-component is *"The dog runs."*).
- [ ] TODO(demo): confirm P3's `/teacher` shows the live row and `/api/results`
      returns newest-first (else `/parent` uses its seeded fallback).
- [ ] TODO(demo): set `OPENAI_API_KEY` in Vercel env for the live-mic path (mock
      path needs no key).
- [ ] TODO(demo): decide final target sentence(s) — en *"The dog runs."* /
      fil *"Tumakbo ang aso."*
