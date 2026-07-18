"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { SessionResult } from "@/lib/types";

type TeacherStudent = {
  result: SessionResult;
  vocabulary: number;
  comprehension: number;
  needsSupport: boolean;
  isLive?: boolean;
};

const BAND_STYLES: Record<SessionResult["levelBand"], string> = {
  Emerging: "bg-[#FB8500]/15 text-[#B95600]",
  Beginning: "bg-[#FFB703]/20 text-[#8A6100]",
  Developing: "bg-[#126E82]/10 text-[#0F5A6B]",
  "On Track": "bg-[#6BBF59]/20 text-[#397F2C]",
};

function levelBand(theta: number): SessionResult["levelBand"] {
  if (theta < -1.5) return "Emerging";
  if (theta < -0.5) return "Beginning";
  if (theta < 0.5) return "Developing";
  return "On Track";
}

function seededStudent(
  studentName: string,
  theta: number,
  vocabulary: number,
  comprehension: number,
): TeacherStudent {
  const band = levelBand(theta);
  return {
    result: {
      studentName,
      theta,
      standardError: 0.48,
      responses: [],
      levelBand: band,
    },
    vocabulary,
    comprehension,
    needsSupport: band === "Emerging" || band === "Beginning",
  };
}

const SEED_STUDENTS: TeacherStudent[] = [
  seededStudent("Mika Santos", -2.1, 24, 19),
  seededStudent("Paolo Reyes", -0.9, 41, 35),
  seededStudent("Lia Mendoza", -0.45, 48, 45),
  seededStudent("Noah Garcia", -0.2, 54, 49),
  seededStudent("Sofia Ramos", 0.05, 58, 56),
  seededStudent("Gab Cruz", 0.18, 62, 57),
  seededStudent("Aya Bautista", 0.35, 64, 61),
  seededStudent("Luis Flores", 0.55, 68, 66),
  seededStudent("Bea Navarro", 0.8, 74, 70),
  seededStudent("Enzo Lim", 1.1, 79, 76),
  seededStudent("Nica Aquino", 1.4, 85, 81),
  seededStudent("Theo Villanueva", 1.9, 91, 88),
];

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function liveStudent(result: SessionResult): TeacherStudent {
  const overall = clampPercent(((result.theta + 3) / 6) * 100);
  const responseLift = Math.min(8, Math.round(result.responses.length / 3));
  return {
    result,
    vocabulary: clampPercent(overall + responseLift),
    comprehension: clampPercent(overall - responseLift),
    needsSupport: result.levelBand === "Emerging" || result.levelBand === "Beginning",
    isLive: true,
  };
}

function abilityLabel(theta: number) {
  if (theta < -1.5) return "Just starting";
  if (theta < -0.5) return "Beginning";
  if (theta < 0.5) return "Developing";
  return "On track";
}

function AbilityBar({ theta, needsSupport }: { theta: number; needsSupport: boolean }) {
  const position = clampPercent(((theta + 3) / 6) * 100);
  return (
    <div className="mt-4">
      <div className="mb-1 flex justify-between text-[11px] font-bold text-[#3E93A5]">
        <span>Reading ability</span>
        <span>{abilityLabel(theta)}</span>
      </div>
      <div className="relative h-2 rounded-full bg-[#EEF2F0]">
        <span className="absolute inset-y-[-3px] left-1/2 w-0.5 bg-[#CBD5D2]" />
        <span
          className={`absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white shadow ${needsSupport ? "bg-[#FB8500]" : "bg-[#126E82]"}`}
          style={{ left: `${position}%` }}
        />
      </div>
    </div>
  );
}

function SkillBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="grid grid-cols-[5.5rem_1fr_2rem] items-center gap-2 text-[11px] font-bold text-[#3E93A5]">
      <span>{label}</span>
      <div className="h-1.5 overflow-hidden rounded-full bg-[#EEF2F0]">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${value}%` }} />
      </div>
      <span className="text-right text-[#126E82]">{value}</span>
    </div>
  );
}

export default function TeacherPage() {
  const [liveResults, setLiveResults] = useState<SessionResult[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    let active = true;
    const loadResults = async () => {
      try {
        const response = await fetch("/api/results", { cache: "no-store" });
        if (!response.ok) return;
        const results = (await response.json()) as SessionResult[];
        if (active && Array.isArray(results)) {
          setLiveResults(results);
          setLastUpdated(new Date());
        }
      } catch (error) {
        console.warn("Teacher results refresh failed.", error);
      }
    };
    void loadResults();
    const interval = window.setInterval(loadResults, 5_000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  const students = useMemo(() => {
    const live = liveResults.map(liveStudent);
    const liveNames = new Set(live.map((student) => student.result.studentName.toLocaleLowerCase("en")));
    return [
      ...live,
      ...SEED_STUDENTS.filter(
        (student) => !liveNames.has(student.result.studentName.toLocaleLowerCase("en")),
      ),
    ];
  }, [liveResults]);

  const metrics = useMemo(() => {
    const needsSupport = students.filter((student) => student.needsSupport).length;
    const developing = students.filter((student) => student.result.levelBand === "Developing").length;
    const onTrack = students.filter((student) => student.result.levelBand === "On Track").length;
    return [
      { value: students.length, label: "Learners assessed", detail: "this session", color: "text-[#126E82]", border: "border-[#126E82]/15" },
      { value: needsSupport, label: "Need support", detail: "Emerging + Beginning", color: "text-[#FB8500]", border: "border-[#FB8500]/30" },
      { value: developing, label: "Developing", detail: "steadily growing", color: "text-[#C98B00]", border: "border-[#FFB703]/35" },
      { value: onTrack, label: "On track", detail: "grade-band ready", color: "text-[#4B9D3E]", border: "border-[#6BBF59]/35" },
    ];
  }, [students]);

  return (
    <main className="min-h-dvh bg-[#FFF8EB] px-4 py-6 text-[#126E82] sm:px-7 lg:px-10">
      <div className="rise-in mx-auto w-full max-w-[1180px]">
        <header className="flex flex-col gap-5 rounded-[26px] border-2 border-[#126E82]/10 bg-white px-5 py-5 shadow-[0_10px_26px_rgba(180,140,60,.1)] sm:flex-row sm:items-center sm:justify-between sm:px-7">
          <div className="flex items-center gap-4">
            <Link href="/" className="font-display text-[25px] font-extrabold tracking-[-.02em]" aria-label="Basa Buddy home">
              <span>Basa</span><span className="text-[#FFB703]">Buddy</span>
            </Link>
            <span className="h-9 w-px bg-[#126E82]/15" />
            <div>
              <h1 className="font-display text-xl font-bold">Grade 2 · Sampaguita</h1>
              <p className="text-sm font-extrabold">Class literacy snapshot</p>
              <p className="mt-0.5 flex items-center gap-1.5 text-xs font-bold text-[#3E93A5]">
                <span className="h-2 w-2 rounded-full bg-[#6BBF59]" />
                Live sync{lastUpdated ? ` · updated ${lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : ""}
              </p>
            </div>
          </div>
          <Link href="/child" className="flex min-h-14 items-center justify-center rounded-[18px] bg-[#FB8500] px-6 font-display text-base font-bold text-white shadow-[0_6px_0_#D96F00] active:translate-y-1 active:shadow-[0_3px_0_#D96F00]">
            Open child assessment →
          </Link>
        </header>

        <section className="mt-4 grid grid-cols-2 gap-3.5 lg:grid-cols-4" aria-label="Class summary">
          {metrics.map((metric) => (
            <div key={metric.label} className={`rounded-[22px] border-2 bg-white p-4 shadow-[0_6px_16px_rgba(180,140,60,.09)] sm:p-5 ${metric.border}`}>
              <p className={`font-display text-4xl font-extrabold leading-none ${metric.color}`}>{metric.value}</p>
              <p className="mt-2 text-sm font-extrabold">{metric.label}</p>
              <p className="text-xs font-semibold text-[#3E93A5]">{metric.detail}</p>
            </div>
          ))}
        </section>

        <div className="mt-6 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="font-display text-xl font-bold">Learner results</h2>
          <p className="text-xs font-semibold text-[#3E93A5]">Name first · educational reading second · technical estimate last</p>
        </div>

        <section className="mt-3 grid grid-cols-1 gap-3.5 md:grid-cols-2 xl:grid-cols-3" aria-label="Learner results">
          {students.map((student) => {
            const { result } = student;
            return (
              <article
                key={result.studentName}
                className={`relative rounded-[22px] border-2 bg-white p-4 shadow-[0_6px_16px_rgba(180,140,60,.09)] ${student.needsSupport ? "border-[#FB8500]/30" : "border-[#126E82]/10"}`}
              >
                {student.isLive ? (
                  <span className="absolute right-4 top-4 flex items-center gap-1 text-[11px] font-extrabold text-[#4B9D3E]"><span className="h-2 w-2 rounded-full bg-[#6BBF59]" />Just synced</span>
                ) : null}
                <div className="flex items-center gap-3">
                  <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl font-display text-xl font-extrabold ${student.needsSupport ? "bg-[#FB8500]/15 text-[#B95600]" : "bg-[#126E82]/10"}`}>
                    {result.studentName.charAt(0)}
                  </span>
                  <div>
                    <h3 className="font-display text-lg font-bold">{result.studentName}</h3>
                    <span className={`mt-0.5 inline-flex rounded-full px-3 py-1 text-xs font-extrabold ${BAND_STYLES[result.levelBand]}`}>{result.levelBand}</span>
                  </div>
                </div>

                <AbilityBar theta={result.theta} needsSupport={student.needsSupport} />
                <div className="mt-3 flex flex-col gap-2">
                  <SkillBar label="Vocabulary" value={student.vocabulary} color="bg-[#126E82]" />
                  <SkillBar label="Comprehension" value={student.comprehension} color="bg-[#FFB703]" />
                </div>

                <div className="mt-3 flex items-center justify-between border-t-2 border-[#126E82]/6 pt-3">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-extrabold ${student.needsSupport ? "bg-[#FB8500]/12 text-[#B95600]" : "bg-[#6BBF59]/15 text-[#397F2C]"}`}>
                    {student.needsSupport ? "🤝 Needs focused support" : "✓ On track"}
                  </span>
                  <span className="font-mono text-[11px] font-bold text-[#8AA5A2]">θ {result.theta > 0 ? "+" : ""}{result.theta.toFixed(2)}</span>
                </div>
              </article>
            );
          })}
        </section>

        <Link href="/" className="mt-6 inline-flex min-h-12 items-center rounded-[18px] border-2 border-[#126E82]/15 bg-white px-5 font-display text-sm font-bold">← Back to home</Link>
      </div>
    </main>
  );
}
