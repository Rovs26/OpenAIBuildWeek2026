import type { SessionResult, LevelBand, ItemResponse } from "@/lib/types";
import { listResults } from "@/lib/store";
import ClipPlayer from "./ClipPlayer";

// Parent result card. Filipino-first, English subtitles. Warm, mobile-width,
// screenshot-worthy. No theta / raw numbers except the speaking %.
//
// Reads the newest in-process result. When no assessment has arrived yet, the
// seeded fallback keeps the page always renderable for the demo.

export const dynamic = "force-dynamic";

// ---- Seeded fallback (demo-safe) ------------------------------------------
const SEED: SessionResult = {
  studentName: "Maria Santos",
  theta: -0.4,
  standardError: 0.3,
  responses: [
    { itemId: "m01", choiceId: "a", correct: true, ms: 2200 },
    { itemId: "m02", choiceId: "b", correct: true, ms: 2600 },
    { itemId: "m03", choiceId: "c", correct: true, ms: 3100 },
    { itemId: "m04", choiceId: "a", correct: true, ms: 3400 },
    { itemId: "m05", choiceId: "c", correct: true, ms: 2900 },
    { itemId: "m06", choiceId: "b", correct: false, ms: 4200 },
    { itemId: "m08", choiceId: "c", correct: false, ms: 5100 },
    { itemId: "m10", choiceId: "a", correct: false, ms: 4800 },
  ],
  speaking: {
    targetText: "The dog runs.",
    transcript: "the dog runs",
    wordMatchPct: 92,
    audioUrl: "",
  },
  levelBand: "Beginning",
};

// ---- Band display copy (Filipino first · English subtitle) ----------------
const BAND_COPY: Record<LevelBand, { fil: string; en: string; emoji: string }> = {
  Emerging: {
    fil: "Nagsisimula pa lang",
    en: "Just getting started",
    emoji: "🌱",
  },
  Beginning: {
    fil: "Nagsisimulang bumasa",
    en: "Beginning reader",
    emoji: "📖",
  },
  Developing: {
    fil: "Paunlad na bumabasa",
    en: "Developing reader",
    emoji: "🌟",
  },
  "On Track": {
    fil: "Nasa tamang antas",
    en: "On track",
    emoji: "🚀",
  },
};

// The three item formats map to friendly "skills".
type Format = "hear-word" | "hear-sentence" | "see-word";

// Lookup: band × weakest format → 2 strengths + 2 home tips (Filipino · English).
// Hardcoded, no LLM call.
type Tip = { fil: string; en: string };
type Advice = { strengths: [Tip, Tip]; tips: [Tip, Tip] };

const ADVICE: Record<LevelBand, Record<Format, Advice>> = {
  Emerging: {
    "hear-word": {
      strengths: [
        { fil: "Nakikinig nang mabuti", en: "Listens carefully" },
        { fil: "Gustong-gusto ang mga kwento", en: "Loves stories" },
      ],
      tips: [
        { fil: "Magbasa nang malakas araw-araw", en: "Read aloud together daily" },
        { fil: "Pangalanan ang mga bagay sa bahay", en: "Name objects around the house" },
      ],
    },
    "hear-sentence": {
      strengths: [
        { fil: "Naiintindihan ang mga salita", en: "Understands single words" },
        { fil: "Masigasig matuto", en: "Eager to learn" },
      ],
      tips: [
        { fil: "Magkwento gamit ang buong pangungusap", en: "Tell stories in full sentences" },
        { fil: "Magtanong tungkol sa kwento", en: "Ask about the story" },
      ],
    },
    "see-word": {
      strengths: [
        { fil: "Nakikilala ang mga tunog", en: "Recognizes sounds" },
        { fil: "Mausisa sa mga letra", en: "Curious about letters" },
      ],
      tips: [
        { fil: "Ituro ang mga letra sa karatula", en: "Point out letters on signs" },
        { fil: "Maglaro ng tugma-tunog", en: "Play rhyming games" },
      ],
    },
  },
  Beginning: {
    "hear-word": {
      strengths: [
        { fil: "Mabilis kumilala ng salita", en: "Quick to recognize words" },
        { fil: "Tiwala sa sarili sa pakikinig", en: "Confident when listening" },
      ],
      tips: [
        { fil: "Magbasa ng maiikling libro sa gabi", en: "Read short books at bedtime" },
        { fil: "Hanapin ang mga salita sa larawan", en: "Match words to pictures" },
      ],
    },
    "hear-sentence": {
      strengths: [
        { fil: "Mahusay kumilala ng salita", en: "Strong word recognition" },
        { fil: "Nakatutok habang nagbabasa", en: "Stays focused while reading" },
      ],
      tips: [
        { fil: "Basahin ang buong pangungusap nang dahan-dahan", en: "Read whole sentences slowly" },
        { fil: "Itanong 'ano ang nangyari?'", en: "Ask 'what happened?'" },
      ],
    },
    "see-word": {
      strengths: [
        { fil: "Nauunawaan ang mga pangungusap", en: "Understands sentences" },
        { fil: "Malikhaing mag-isip", en: "Thinks creatively" },
      ],
      tips: [
        { fil: "Magsanay bumasa ng mga bagong salita", en: "Practice reading new words" },
        { fil: "Sumulat ng maiikling salita", en: "Write short words together" },
      ],
    },
  },
  Developing: {
    "hear-word": {
      strengths: [
        { fil: "Bumabasa ng pangungusap nang mag-isa", en: "Reads sentences independently" },
        { fil: "Malakas ang pag-unawa", en: "Strong comprehension" },
      ],
      tips: [
        { fil: "Basahin ang mga bagong salita nang malakas", en: "Sound out new words aloud" },
        { fil: "Maglaro ng bokabularyo", en: "Play vocabulary games" },
      ],
    },
    "hear-sentence": {
      strengths: [
        { fil: "Mabilis at tumpak bumasa", en: "Reads quickly and accurately" },
        { fil: "Mahusay sa bokabularyo", en: "Good vocabulary" },
      ],
      tips: [
        { fil: "Magbasa ng mahahabang kwento", en: "Read longer stories" },
        { fil: "Pag-usapan ang kahulugan ng kwento", en: "Discuss what the story means" },
      ],
    },
    "see-word": {
      strengths: [
        { fil: "Mahusay makinig at umunawa", en: "Listens and understands well" },
        { fil: "Determinadong matuto", en: "Determined learner" },
      ],
      tips: [
        { fil: "Magsanay bumasa ng bagong salita araw-araw", en: "Practice new words daily" },
        { fil: "Gumawa ng listahan ng salita", en: "Build a word wall at home" },
      ],
    },
  },
  "On Track": {
    "hear-word": {
      strengths: [
        { fil: "Bumabasa nang malinaw at tiwala", en: "Reads clearly and confidently" },
        { fil: "Mayaman ang bokabularyo", en: "Rich vocabulary" },
      ],
      tips: [
        { fil: "Hikayatin sa mas mahihirap na libro", en: "Encourage harder books" },
        { fil: "Magbasa magkasama para sa saya", en: "Read together for fun" },
      ],
    },
    "hear-sentence": {
      strengths: [
        { fil: "Mahusay na mambabasa", en: "Skilled reader" },
        { fil: "Malawak ang pang-unawa", en: "Broad understanding" },
      ],
      tips: [
        { fil: "Tuklasin ang iba't ibang uri ng kwento", en: "Explore different kinds of stories" },
        { fil: "Ipabuod ang binasa", en: "Have her summarize what she read" },
      ],
    },
    "see-word": {
      strengths: [
        { fil: "Mabilis kilalanin ang mga salita", en: "Fast word recognition" },
        { fil: "Malikhain at mausisa", en: "Creative and curious" },
      ],
      tips: [
        { fil: "Magsulat ng sariling kwento", en: "Write her own short stories" },
        { fil: "Magbasa ng bagong paksa", en: "Read about new topics" },
      ],
    },
  },
};

// Map an itemId to its format via the mock item bank (best-effort).
import { mockItems } from "@/lib/mockItems";

function weakestFormat(responses: ItemResponse[]): Format {
  const byFormat: Record<Format, { wrong: number; total: number }> = {
    "hear-word": { wrong: 0, total: 0 },
    "hear-sentence": { wrong: 0, total: 0 },
    "see-word": { wrong: 0, total: 0 },
  };
  for (const r of responses) {
    const item = mockItems.find((i) => i.id === r.itemId);
    if (!item) continue;
    const f = item.format as Format;
    byFormat[f].total += 1;
    if (!r.correct) byFormat[f].wrong += 1;
  }
  let worst: Format = "see-word";
  let worstRate = -1;
  (Object.keys(byFormat) as Format[]).forEach((f) => {
    const { wrong, total } = byFormat[f];
    if (total === 0) return;
    const rate = wrong / total;
    if (rate > worstRate) {
      worstRate = rate;
      worst = f;
    }
  });
  return worst;
}

export default async function ParentPage() {
  const result = listResults()[0] ?? SEED;
  const band = BAND_COPY[result.levelBand] ?? BAND_COPY.Beginning;
  const weak = weakestFormat(result.responses);
  const advice =
    ADVICE[result.levelBand]?.[weak] ?? ADVICE.Beginning["see-word"];
  const speaking = result.speaking;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-5 bg-amber-50 px-5 py-8">
      {/* Greeting */}
      <header className="text-center">
        <p className="text-sm font-medium text-amber-700">
          Ulat para sa magulang · Parent report
        </p>
        <h1 className="mt-1 text-2xl font-extrabold text-slate-800">
          {result.studentName}
        </h1>
      </header>

      {/* Level band card */}
      <section className="rounded-3xl bg-white p-6 text-center shadow-sm ring-1 ring-amber-100">
        <div className="text-5xl">{band.emoji}</div>
        <p className="mt-3 text-2xl font-extrabold text-violet-600">
          {band.fil}
        </p>
        <p className="text-base text-slate-500">{band.en}</p>
      </section>

      {/* Strengths */}
      <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-amber-100">
        <h2 className="text-base font-bold text-slate-800">
          Mga kalakasan{" "}
          <span className="font-normal text-slate-400">· Strengths</span>
        </h2>
        <ul className="mt-3 flex flex-col gap-3">
          {advice.strengths.map((s, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="text-xl">✅</span>
              <span>
                <span className="block font-semibold text-slate-800">
                  {s.fil}
                </span>
                <span className="block text-sm text-slate-500">{s.en}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* Home tips */}
      <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-amber-100">
        <h2 className="text-base font-bold text-slate-800">
          Gawin sa bahay{" "}
          <span className="font-normal text-slate-400">· Practice at home</span>
        </h2>
        <ul className="mt-3 flex flex-col gap-3">
          {advice.tips.map((t, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="text-xl">🏠</span>
              <span>
                <span className="block font-semibold text-slate-800">
                  {t.fil}
                </span>
                <span className="block text-sm text-slate-500">{t.en}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* Speaking clip */}
      {speaking && (
        <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-amber-100">
          <h2 className="text-base font-bold text-slate-800">
            Pagbasa nang malakas{" "}
            <span className="font-normal text-slate-400">· Reading aloud</span>
          </h2>
          <p className="mt-2 text-2xl font-extrabold text-slate-800">
            &ldquo;{speaking.targetText}&rdquo;
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Nabasa nang tama ang{" "}
            <span className="font-bold text-emerald-600">
              {speaking.wordMatchPct}%
            </span>{" "}
            ng mga salita
          </p>
          <p className="text-sm text-slate-400">
            Read {speaking.wordMatchPct}% of the words correctly
          </p>
          <ClipPlayer audioUrl={speaking.audioUrl} />
        </section>
      )}

      <footer className="pb-4 pt-2 text-center text-xs text-amber-700/70">
        Isang pagsusulit · tatlong tagapakinig · walang oras ng guro
      </footer>
    </main>
  );
}
