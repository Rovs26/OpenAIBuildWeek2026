"use client";

import { useEffect, useMemo, useState } from "react";
import type { SessionResult } from "@/lib/types";

type TeacherStudent = {
  result: SessionResult;
  vocabulary: number;
  comprehension: number;
  needsSupport: boolean;
  isLive?: boolean;
};

const bandStyles: Record<SessionResult["levelBand"], string> = {
  Emerging: "bg-rose-100 text-rose-800 ring-rose-200",
  Beginning: "bg-amber-100 text-amber-800 ring-amber-200",
  Developing: "bg-sky-100 text-sky-800 ring-sky-200",
  "On Track": "bg-emerald-100 text-emerald-800 ring-emerald-200",
};

function seededStudent(
  studentName: string,
  theta: number,
  vocabulary: number,
  comprehension: number,
  needsSupport = false,
): TeacherStudent {
  const levelBand: SessionResult["levelBand"] =
    theta < -1.5
      ? "Emerging"
      : theta < -0.5
        ? "Beginning"
        : theta < 0.5
          ? "Developing"
          : "On Track";

  return {
    result: {
      studentName,
      theta,
      standardError: 0.48,
      responses: [],
      levelBand,
    },
    vocabulary,
    comprehension,
    needsSupport,
  };
}

const seedStudents: TeacherStudent[] = [
  seededStudent("Mika Santos", -2.1, 24, 19, true),
  seededStudent("Paolo Reyes", -0.9, 41, 35, true),
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

function ThetaBar({ theta }: { theta: number }) {
  const position = clampPercent(((theta + 3) / 6) * 100);

  return (
    <div className="min-w-36">
      <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
        <span>-3</span>
        <span className="font-mono font-semibold text-slate-700">
          {theta > 0 ? "+" : ""}
          {theta.toFixed(2)}
        </span>
        <span>+3</span>
      </div>
      <div className="relative h-2 rounded-full bg-slate-200">
        <div className="absolute inset-y-0 left-1/2 w-px bg-slate-400" />
        <div
          className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-indigo-600 shadow"
          style={{ left: `${position}%` }}
        />
      </div>
    </div>
  );
}

function SkillBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="grid grid-cols-[5.5rem_1fr_2rem] items-center gap-2 text-xs">
      <span className="text-slate-500">{label}</span>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-indigo-500"
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="text-right font-mono text-slate-600">{value}</span>
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
    const liveNames = new Set(
      live.map((student) => student.result.studentName.toLocaleLowerCase("en")),
    );
    return [
      ...live,
      ...seedStudents.filter(
        (student) =>
          !liveNames.has(student.result.studentName.toLocaleLowerCase("en")),
      ),
    ];
  }, [liveResults]);

  const flaggedCount = students.filter((student) => student.needsSupport).length;

  return (
    <main className="min-h-screen bg-[#f7f8fc] px-4 py-6 text-slate-900 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 rounded-3xl bg-indigo-950 px-6 py-6 text-white shadow-xl shadow-indigo-950/10 sm:px-8 sm:py-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="mb-3 flex items-center gap-3 text-sm font-medium text-indigo-200">
                <span className="grid size-9 place-items-center rounded-xl bg-amber-400 text-xl text-indigo-950">
                  🦉
                </span>
                Basa Buddy · Teacher View
              </div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-300">
                Grade 2 · Sampaguita
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
                Class literacy snapshot
              </h1>
            </div>
            <div className="flex gap-3">
              <div className="rounded-2xl bg-white/10 px-4 py-3 ring-1 ring-white/15">
                <p className="text-2xl font-semibold">{students.length}</p>
                <p className="text-xs text-indigo-200">Learners assessed</p>
              </div>
              <div className="rounded-2xl bg-rose-400/15 px-4 py-3 ring-1 ring-rose-300/25">
                <p className="text-2xl font-semibold text-rose-200">{flaggedCount}</p>
                <p className="text-xs text-rose-100">Need support</p>
              </div>
            </div>
          </div>
        </header>

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-2 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
            <div>
              <h2 className="text-lg font-semibold">Learner results</h2>
              <p className="text-sm text-slate-500">
                Ability, confidence band, and where to focus next.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="size-2 rounded-full bg-emerald-500" />
              Auto-refreshing every 5 seconds
              {lastUpdated && (
                <span className="hidden sm:inline">
                  · {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] border-collapse text-left">
              <thead>
                <tr className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <th className="px-6 py-4">Learner</th>
                  <th className="px-4 py-4">Level band</th>
                  <th className="px-4 py-4">Ability estimate</th>
                  <th className="px-4 py-4">Domain split</th>
                  <th className="px-6 py-4">Intervention</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map((student) => (
                  <tr
                    key={student.result.studentName}
                    className={student.isLive ? "bg-indigo-50/60" : "hover:bg-slate-50/70"}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <span className="grid size-10 place-items-center rounded-full bg-slate-100 font-semibold text-slate-700">
                          {student.result.studentName.charAt(0)}
                        </span>
                        <div>
                          <p className="font-semibold text-slate-900">
                            {student.result.studentName}
                          </p>
                          <p className="text-xs text-slate-500">
                            {student.isLive ? "Just synced" : "Latest assessment"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${bandStyles[student.result.levelBand]}`}
                      >
                        {student.result.levelBand}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <ThetaBar theta={student.result.theta} />
                    </td>
                    <td className="px-4 py-4">
                      <div className="space-y-2">
                        <SkillBar label="Vocabulary" value={student.vocabulary} />
                        <SkillBar label="Comprehension" value={student.comprehension} />
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {student.needsSupport ? (
                        <span className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 ring-1 ring-inset ring-rose-200">
                          <span className="size-1.5 rounded-full bg-rose-500" />
                          Needs support
                        </span>
                      ) : (
                        <span className="text-sm font-medium text-emerald-700">On track</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
