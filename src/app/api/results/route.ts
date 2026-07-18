import { listResults, upsertResult } from "@/lib/store";
import type { SessionResult } from "@/lib/types";

export const dynamic = "force-dynamic";

const LEVEL_BANDS = ["Emerging", "Beginning", "Developing", "On Track"] as const;

function levelBand(theta: number): SessionResult["levelBand"] {
  if (theta < -1.5) return "Emerging";
  if (theta < -0.5) return "Beginning";
  if (theta < 0.5) return "Developing";
  return "On Track";
}

function isSessionResult(value: unknown): value is SessionResult {
  if (!value || typeof value !== "object") return false;
  const result = value as Partial<SessionResult>;

  return (
    typeof result.studentName === "string" &&
    result.studentName.trim().length > 0 &&
    typeof result.theta === "number" &&
    typeof result.standardError === "number" &&
    Array.isArray(result.responses) &&
    result.responses.every(
      (response) =>
        response &&
        typeof response.itemId === "string" &&
        typeof response.choiceId === "string" &&
        typeof response.correct === "boolean" &&
        typeof response.ms === "number",
    ) &&
    typeof result.levelBand === "string" &&
    LEVEL_BANDS.includes(result.levelBand as SessionResult["levelBand"])
  );
}

function recomputeAbility(result: SessionResult) {
  // SWAP: use P2's estimate(itemBank, result.responses) when cat.ts lands.
  if (result.responses.length === 0) {
    return { theta: 0, standardError: 1 };
  }

  const correct = result.responses.filter((response) => response.correct).length;
  const proportionCorrect = correct / result.responses.length;
  const theta = Math.max(-3, Math.min(3, (proportionCorrect - 0.5) * 4));
  const standardError = Math.max(0.35, 1 / Math.sqrt(result.responses.length));
  return { theta, standardError };
}

export async function GET() {
  return Response.json(listResults(), {
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(request: Request) {
  let submitted: unknown;

  try {
    submitted = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!isSessionResult(submitted)) {
    return Response.json({ error: "Invalid session result." }, { status: 400 });
  }

  const ability = recomputeAbility(submitted);
  const result: SessionResult = {
    ...submitted,
    studentName: submitted.studentName.trim(),
    theta: ability.theta,
    standardError: ability.standardError,
    levelBand: levelBand(ability.theta),
  };

  upsertResult(result);
  return Response.json(result, { status: 201 });
}
