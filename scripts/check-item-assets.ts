import { readdir, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { itemBank } from "../src/lib/itemBank";

type AssetIssue = { severity: "error" | "warning"; message: string };
const issues: AssetIssue[] = [];
const audioRoot = resolve(process.cwd(), "public/audio");

function report(severity: AssetIssue["severity"], message: string): void {
  issues.push({ severity, message });
}

async function listFiles(directory: string): Promise<string[]> {
  try {
    const entries = await readdir(directory, { withFileTypes: true });
    const nested = await Promise.all(
      entries.map(async (entry) => {
        const fullPath = resolve(directory, entry.name);
        return entry.isDirectory() ? listFiles(fullPath) : [fullPath];
      }),
    );
    return nested.flat();
  } catch {
    return [];
  }
}

async function main(): Promise<void> {
  const targets = new Map<string, string>();
  for (const item of itemBank) {
    const audioLed = item.format === "hear-word" || item.format === "hear-sentence";
    if (!audioLed) continue;
    if (!item.audioUrl || !/^\/audio\/[a-z0-9-]+\.mp3$/.test(item.audioUrl)) {
      report("error", `[${item.id}] malformed or missing audioUrl`);
      continue;
    }
    const expected = `/audio/${item.id}.mp3`;
    if (item.audioUrl !== expected) report("error", `[${item.id}] expected ${expected}, received ${item.audioUrl}`);
    if (!item.id.startsWith(`${item.language}-`)) {
      report("error", `[${item.id}] id does not match language ${item.language}`);
    }
    if (targets.has(item.audioUrl)) {
      report("error", `[${item.id}] duplicate target path also used by ${targets.get(item.audioUrl)}`);
    }
    targets.set(item.audioUrl, item.id);

    const path = resolve(process.cwd(), "public", item.audioUrl.replace(/^\//, ""));
    try {
      const detail = await stat(path);
      if (detail.size === 0) report("error", `[${item.id}] empty audio file ${item.audioUrl}`);
      else if (detail.size < 500) report("warning", `[${item.id}] suspiciously small audio file ${item.audioUrl} (${detail.size} bytes)`);
    } catch {
      report("error", `[${item.id}] missing audio file ${item.audioUrl}`);
    }
  }

  const referenced = new Set([...targets.keys()].map((url) => resolve(process.cwd(), "public", url.replace(/^\//, ""))));
  for (const file of await listFiles(audioRoot)) {
    if (!referenced.has(file)) report("warning", `orphaned audio file ${file}`);
  }

  if (issues.length === 0) {
    console.log(`Asset check passed: ${targets.size} referenced audio files.`);
    return;
  }
  for (const issue of issues) console[issue.severity === "error" ? "error" : "warn"](`${issue.severity}: ${issue.message}`);
  const errorCount = issues.filter((issue) => issue.severity === "error").length;
  const warningCount = issues.length - errorCount;
  console.log(`Asset check complete: ${errorCount} error(s), ${warningCount} warning(s).`);
  if (errorCount > 0) process.exitCode = 1;
}

main().catch((failure: unknown) => {
  console.error(failure instanceof Error ? failure.message : failure);
  process.exitCode = 1;
});
