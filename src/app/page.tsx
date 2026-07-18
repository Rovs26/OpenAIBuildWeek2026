import Link from "next/link";
import Agi from "@/components/child/Agi";

const FLOW = [
  { icon: "🧒", title: "Child", detail: "plays & reads" },
  { icon: "👨‍👩‍👧", title: "Parent", detail: "gets a report" },
  { icon: "👩‍🏫", title: "Teacher", detail: "sees the class" },
];

export default function Home() {
  return (
    <main className="relative min-h-dvh overflow-hidden bg-[#FFF8EB] px-4 py-7 text-[#126E82] sm:py-10">
      <div className="pointer-events-none absolute -left-24 top-16 h-56 w-56 rounded-full bg-[#FFB703]/12" />
      <div className="pointer-events-none absolute -right-24 bottom-10 h-72 w-72 rounded-full bg-[#6BBF59]/10" />

      <div className="relative mx-auto flex w-full max-w-[460px] flex-col items-center">
        <nav className="flex items-center gap-1 rounded-full border-2 border-[#126E82]/10 bg-white/80 p-1.5 shadow-[0_6px_20px_rgba(180,140,60,.13)]" aria-label="Basa Buddy views">
          <span className="rounded-full bg-[#126E82] px-4 py-2 text-sm font-extrabold text-white">Home</span>
          <Link className="rounded-full px-4 py-2 text-sm font-extrabold hover:bg-[#126E82]/8" href="/child">Child</Link>
          <Link className="rounded-full px-4 py-2 text-sm font-extrabold hover:bg-[#126E82]/8" href="/parent">Parent</Link>
          <Link className="rounded-full px-4 py-2 text-sm font-extrabold hover:bg-[#126E82]/8" href="/teacher">Teacher</Link>
        </nav>

        <section className="rise-in mt-6 flex w-full flex-col items-center text-center">
          <Agi pose="wave" size={132} />
          <h1 className="font-display -mt-1 text-[44px] font-extrabold leading-none tracking-[-.03em]">
            <span className="text-[#126E82]">Basa</span>{" "}
            <span className="text-[#FFB703]">Buddy</span>
          </h1>
          <p className="font-display mt-4 max-w-sm text-xl font-bold leading-snug">
            Alamin kung paano natututo ang bawat batang mambabasa.
          </p>
          <p className="mt-1 max-w-xs text-sm font-bold leading-relaxed text-[#3E93A5]">
            A friendly adaptive literacy check for every young learner.
          </p>

          <div className="mt-7 flex w-full flex-col gap-4">
            <Link
              href="/child"
              className="flex min-h-20 items-center gap-4 rounded-[26px] bg-[#FB8500] px-5 py-4 text-left text-white shadow-[0_8px_0_#D96F00,0_16px_26px_rgba(251,133,0,.22)] transition hover:-translate-y-0.5 focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-[#126E82] active:translate-y-1 active:shadow-[0_4px_0_#D96F00]"
            >
              <span className="text-4xl" aria-hidden="true">🎈</span>
              <span className="min-w-0 flex-1">
                <span className="font-display block text-[21px] font-bold">Start assessment</span>
                <span className="block text-sm font-bold text-white/90">Simulan ang paglalakbay sa pagbasa</span>
              </span>
              <span className="text-2xl" aria-hidden="true">→</span>
            </Link>

            <div className="grid grid-cols-2 gap-3.5">
              <Link href="/parent" className="rounded-3xl border-[3px] border-[#126E82]/15 bg-white p-4 text-left shadow-[0_6px_16px_rgba(180,140,60,.1)] transition hover:-translate-y-0.5 focus-visible:outline-4 focus-visible:outline-[#FB8500]">
                <span className="text-3xl" aria-hidden="true">👨‍👩‍👧</span>
                <span className="font-display mt-2 block text-base font-bold">Parent report</span>
                <span className="block text-xs font-bold text-[#3E93A5]">Ulat para sa magulang</span>
              </Link>
              <Link href="/teacher" className="rounded-3xl border-[3px] border-[#126E82]/15 bg-white p-4 text-left shadow-[0_6px_16px_rgba(180,140,60,.1)] transition hover:-translate-y-0.5 focus-visible:outline-4 focus-visible:outline-[#FB8500]">
                <span className="text-3xl" aria-hidden="true">📊</span>
                <span className="font-display mt-2 block text-base font-bold">Teacher view</span>
                <span className="block text-xs font-bold text-[#3E93A5]">Class literacy dashboard</span>
              </Link>
            </div>
          </div>

          <p className="mt-6 flex items-center gap-2 text-xs font-extrabold text-[#4B9D3E]">
            <span className="h-2.5 w-2.5 rounded-full bg-[#6BBF59] shadow-[0_0_0_4px_rgba(107,191,89,.18)]" />
            Installable · works offline · gawa para sa mahinang koneksyon
          </p>

          <div className="mt-5 flex w-full rounded-[22px] border-2 border-[#126E82]/10 bg-white/60 px-3 py-3.5">
            {FLOW.map((step, index) => (
              <div key={step.title} className="relative flex-1 text-center">
                <span className="text-2xl" aria-hidden="true">{step.icon}</span>
                <p className="font-display mt-0.5 text-sm font-bold">{step.title}</p>
                <p className="text-[11px] font-bold text-[#3E93A5]">{step.detail}</p>
                {index < FLOW.length - 1 ? <span className="absolute -right-1 top-4 text-[#FFB703]" aria-hidden="true">→</span> : null}
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
