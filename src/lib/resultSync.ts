import type { SessionResult } from "@/lib/types";

const PENDING_RESULTS_KEY = "pending-results";

function readPendingResults(): SessionResult[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(PENDING_RESULTS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SessionResult[]) : [];
  } catch (error) {
    console.warn("Could not read pending assessment results.", error);
    return [];
  }
}

function writePendingResults(results: SessionResult[]) {
  if (typeof window === "undefined") return;

  try {
    if (results.length === 0) {
      window.localStorage.removeItem(PENDING_RESULTS_KEY);
      return;
    }

    window.localStorage.setItem(PENDING_RESULTS_KEY, JSON.stringify(results));
  } catch (error) {
    console.warn("Could not save the result for a later retry.", error);
  }
}

function queueResult(result: SessionResult) {
  const key = result.studentName.trim().toLocaleLowerCase("en");
  const pending = readPendingResults().filter(
    (entry) => entry.studentName.trim().toLocaleLowerCase("en") !== key,
  );
  pending.push(result);
  writePendingResults(pending);
}

async function postResult(result: SessionResult) {
  const response = await fetch("/api/results", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(result),
  });

  if (!response.ok) {
    throw new Error(`Results sync failed with status ${response.status}`);
  }
}

export async function syncResult(result: SessionResult): Promise<void> {
  try {
    await postResult(result);
  } catch (error) {
    queueResult(result);
    console.warn("Assessment result queued until the device is online.", error);
  }
}

export async function retryPendingResults(): Promise<void> {
  const pending = readPendingResults();
  if (pending.length === 0) return;

  const remaining: SessionResult[] = [];
  for (const result of pending) {
    try {
      await postResult(result);
    } catch (error) {
      remaining.push(result);
      console.warn("A pending assessment result still cannot sync.", error);
    }
  }

  writePendingResults(remaining);
}
