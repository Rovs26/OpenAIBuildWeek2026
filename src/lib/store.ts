import type { SessionResult } from "@/lib/types";

type ResultStoreGlobal = typeof globalThis & {
  __basaBuddyResults?: Map<string, SessionResult>;
};

const globalForResults = globalThis as ResultStoreGlobal;

export const resultStore =
  globalForResults.__basaBuddyResults ?? new Map<string, SessionResult>();

if (process.env.NODE_ENV !== "production") {
  globalForResults.__basaBuddyResults = resultStore;
}

function resultKey(studentName: string) {
  return studentName.trim().toLocaleLowerCase("en");
}

export function listResults(): SessionResult[] {
  return Array.from(resultStore.values()).reverse();
}

export function upsertResult(result: SessionResult): SessionResult {
  resultStore.set(resultKey(result.studentName), result);
  return result;
}
