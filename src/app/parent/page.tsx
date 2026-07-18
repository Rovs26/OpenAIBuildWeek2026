import type { SessionResult, LevelBand, ItemResponse } from "@/lib/types";
import ClipPlayer from "./ClipPlayer";
import Link from "next/link";
import Agi from "@/components/child/Agi";
import { listResults } from "@/lib/store";

// Parent result card. Filipino-first, English subtitles. Warm, mobile-width,
// screenshot-worthy. No theta / raw numbers except the speaking %.
//
// Reads the newest result from GET /api/results (that route is P3's and may not
// exist yet). On ANY fetch failure we fall back to a seeded result so the page
// ALWAYS renders for the demo.

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
const BAND_COPY: Record<
  LevelBand,
  { fil: string; en: string; emoji: string; explain: string }
> = {
  Emerging: {
    fil: "Nagsisimula pa lang",
    en: "Just getting started",
    emoji: "🌱",
    explain:
      "Bago pa lang ang paglalakbay sa pagbasa. Ang bawat kwentong ibinabahagi ninyo ay tumutulong. Every story you share helps.",
  },
  Beginning: {
    fil: "Nagsisimulang bumasa",
    en: "Beginning reader",
    emoji: "📖",
    explain:
      "Nakikilala na ang mga salita at tunog. Handa na para sa maiikling libro nang sama-sama. Ready for short books together.",
  },
  Developing: {
    fil: "Paunlad na bumabasa",
    en: "Developing reader",
    emoji: "🌟",
    explain:
      "Kaya nang bumasa ng pangungusap nang mag-isa. Palakasin pa ang bokabularyo. Growing steadily—keep building words.",
  },
  "On Track": {
    fil: "Nasa tamang antas",
    en: "On track",
    emoji: "🚀",
    explain:
      "Malinaw at may tiwalang bumasa. Panahon na para sa mas makukulay na kwento! Ready for richer stories.",
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

async function fetchNewest(): Promise<SessionResult> {
  const localResult = listResults()[0];
  if (localResult) return localResult;

  try {
    // SWAP: P3's GET /api/results returns the session list (newest first).
    const base = process.env.NEXT_PUBLIC_BASE_URL ?? "";
    const res = await fetch(`${base}/api/results`, { cache: "no-store" });
    if (!res.ok) throw new Error(`results ${res.status}`);
    const data = await res.json();
    const list: SessionResult[] = Array.isArray(data)
      ? data
      : (data.results ?? data.sessions ?? []);
    if (!list || list.length === 0) throw new Error("no results");
    return list[0];
  } catch {
    // Fallback keeps the page always renderable for the demo.
    return SEED;
  }
}

export default async function ParentPage() {
  const result = await fetchNewest();
  const band = BAND_COPY[result.levelBand] ?? BAND_COPY.Beginning;
  const weak = weakestFormat(result.responses);
  const advice =
    ADVICE[result.levelBand]?.[weak] ?? ADVICE.Beginning["see-word"];
  const speaking = result.speaking;
  const dateLabel = new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
  }).format(new Date());

  return (
    <main className="min-h-dvh bg-[#FFF8EB] px-4 py-6 text-[#126E82]">
      <div className="rise-in mx-auto flex w-full max-w-[430px] flex-col gap-4">
        <header className="flex items-center justify-between">
          <Link href="/" className="grid h-11 w-11 place-items-center rounded-full border-2 border-[#126E82]/10 bg-white text-xl font-bold" aria-label="Back to home">←</Link>
          <p className="font-display text-sm font-bold text-[#3E93A5]">Ulat para sa magulang · Parent report</p>
          <span className="h-11 w-11" aria-hidden="true" />
        </header>

        <section className="flex items-center gap-4 rounded-[26px] bg-[#FFB703] px-5 py-4 text-[#5A3D00] shadow-[0_10px_24px_rgba(255,183,3,.24)]">
          <Agi pose="celebrating" size={72} />
          <div>
            <p className="text-xs font-extrabold opacity-75">Pinakabagong paglalakbay · {dateLabel}</p>
            <h1 className="font-display mt-0.5 text-[28px] font-extrabold leading-none">{result.studentName}</h1>
          </div>
        </section>

        <section className="rounded-3xl bg-white p-5 text-center shadow-[0_6px_16px_rgba(180,140,60,.11)]">
          <div className="text-5xl" aria-hidden="true">{band.emoji}</div>
          <p className="font-display mt-2 text-2xl font-extrabold">{band.fil}</p>
          <p className="text-sm font-bold text-[#3E93A5]">{band.en}</p>
          <p className="mt-3 text-[15px] font-semibold leading-relaxed">{band.explain}</p>
        </section>

        <section className="rounded-3xl bg-white p-5 shadow-[0_6px_16px_rgba(180,140,60,.11)]">
          <h2 className="font-display text-lg font-bold">Mga kalakasan <span className="text-sm font-semibold text-[#3E93A5]">· Strengths</span></h2>
          <ul className="mt-3 flex flex-col gap-3">
            {advice.strengths.map((strength, index) => (
              <li key={strength.fil} className="flex items-center gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#6BBF59]/15 text-xl" aria-hidden="true">{index === 0 ? "🎧" : "💛"}</span>
                <span>
                  <span className="block font-extrabold">{strength.fil}</span>
                  <span className="block text-sm font-semibold text-[#3E93A5]">{strength.en}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-3xl bg-white p-5 shadow-[0_6px_16px_rgba(180,140,60,.11)]">
          <h2 className="font-display text-lg font-bold">Gawin sa bahay <span className="text-sm font-semibold text-[#3E93A5]">· Practice at home</span></h2>
          <ul className="mt-3 flex flex-col gap-3">
            {advice.tips.map((tip, index) => (
              <li key={tip.fil} className="flex items-center gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#FFB703]/20 text-xl" aria-hidden="true">{index === 0 ? "📚" : "🏠"}</span>
                <span>
                  <span className="block font-extrabold">{tip.fil}</span>
                  <span className="block text-sm font-semibold text-[#3E93A5]">{tip.en}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        {speaking ? (
          <section className="rounded-3xl bg-white p-5 shadow-[0_6px_16px_rgba(180,140,60,.11)]">
            <h2 className="font-display text-lg font-bold">Pagbasa nang malakas <span className="text-sm font-semibold text-[#3E93A5]">· Reading aloud</span></h2>
            <p className="font-display mt-2 text-[22px] font-extrabold">&ldquo;{speaking.targetText}&rdquo;</p>
            <div className="mt-3 flex items-center gap-3">
              <div className="h-3 flex-1 overflow-hidden rounded-full bg-[#F0E4C8]">
                <div className="h-full rounded-full bg-[#6BBF59]" style={{ width: `${speaking.wordMatchPct}%` }} />
              </div>
              <span className="font-display text-xl font-extrabold text-[#4B9D3E]">{speaking.wordMatchPct}%</span>
            </div>
            <p className="mt-1 text-xs font-semibold text-[#3E93A5]">Bahagi ng mga salitang malinaw na nabasa · Share of words read clearly</p>
            <ClipPlayer audioUrl={speaking.audioUrl} />
          </section>
        ) : null}

        <p className="py-1 text-center text-sm font-extrabold text-[#FB8500]">Maliit na hakbang araw-araw, mas matatag na mambabasa. 🌱</p>
        <Link href="/" className="flex min-h-14 items-center justify-center rounded-[22px] border-[3px] border-[#126E82]/15 bg-white font-display text-base font-bold">← Back to home</Link>
      </div>
    </main>
  );
}
