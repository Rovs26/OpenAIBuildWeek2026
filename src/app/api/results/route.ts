import { listResults, upsertResult } from "@/lib/store";
import { estimate, levelBand } from "@/lib/cat";
import { itemBank } from "@/lib/itemBank";
import type { SessionResult } from "@/lib/types";

export const dynamic = "force-dynamic";

const LEVEL_BANDS = ["Emerging", "Beginning", "Developing", "On Track"] as const;
const itemIds = new Set(itemBank.map((item) => item.id));

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

function unknownItemIds(result: SessionResult): string[] {
  return [...new Set(
    result.responses
      .map((response) => response.itemId)
      .filter((itemId) => !itemIds.has(itemId)),
  )];
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

  const unknownIds = unknownItemIds(submitted);
  if (unknownIds.length > 0) {
    return Response.json(
      { error: "Unknown assessment item IDs.", itemIds: unknownIds },
      { status: 400 },
    );
  }

  const ability = estimate(itemBank, submitted.responses);
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
