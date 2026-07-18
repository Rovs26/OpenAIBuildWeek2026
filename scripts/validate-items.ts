import { access } from "node:fs/promises";
import { constants } from "node:fs";
import { resolve } from "node:path";
import { itemBank } from "../src/lib/itemBank";
import type { Item } from "../src/lib/types";

const SKIP_ASSETS = process.argv.includes("--skip-assets");
const FORMATS = new Set<Item["format"]>(["hear-word", "hear-sentence", "see-word"]);
const LANGUAGES = new Set<Item["language"]>(["en", "fil"]);
const errors: string[] = [];

function error(itemId: string, message: string): void {
  errors.push(`[${itemId}] ${message}`);
}

function expectedAudioUrl(item: Item): string {
  return `/audio/${item.id}.mp3`;
}

async function exists(publicUrl: string): Promise<boolean> {
  try {
    await access(resolve(process.cwd(), "public", publicUrl.replace(/^\//, "")), constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function main(): Promise<void> {
  if (!Array.isArray(itemBank)) {
    errors.push("itemBank must be an array");
  }

  const ids = new Set<string>();
  const languages = new Set<string>();
  const formats = new Set<string>();
  const bands = new Set<string>();

  for (const item of itemBank) {
    if (!item.id || typeof item.id !== "string") error("unknown", "id must be a nonempty string");
    if (ids.has(item.id)) error(item.id, "duplicate item id");
    ids.add(item.id);

    if (!FORMATS.has(item.format)) error(item.id, `invalid format ${String(item.format)}`);
    if (!LANGUAGES.has(item.language)) error(item.id, `invalid language ${String(item.language)}`);
    languages.add(item.language);
    formats.add(item.format);
    if (!item.prompt.trim()) error(item.id, "prompt must be nonempty");

    if (item.choices.length < 3 || item.choices.length > 4) {
      error(item.id, "must have three or four choices");
    }
    const choiceIds = new Set<string>();
    for (const choice of item.choices) {
      if (!choice.id) error(item.id, "choice id must be nonempty");
      if (choiceIds.has(choice.id)) error(item.id, `duplicate choice id ${choice.id}`);
      choiceIds.add(choice.id);
    }
    if (!choiceIds.has(item.correctChoiceId)) {
      error(item.id, `correctChoiceId ${item.correctChoiceId} is not a choice`);
    }

    if (!Number.isFinite(item.difficulty) || item.difficulty < -3 || item.difficulty > 3) {
      error(item.id, "difficulty must be finite and between -3 and 3");
    }
    if (!Number.isFinite(item.discrimination) || item.discrimination <= 0) {
      error(item.id, "discrimination must be finite and positive");
    }

    if (item.difficulty < -1.5) bands.add("very-easy");
    else if (item.difficulty < -0.5) bands.add("easy");
    else if (item.difficulty < 0.5) bands.add("moderate");
    else if (item.difficulty < 1.5) bands.add("challenging");
    else bands.add("difficult");

    const isAudioLed = item.format === "hear-word" || item.format === "hear-sentence";
    if (isAudioLed) {
      if (!item.audioUrl) {
        error(item.id, "audio-led item is missing audioUrl");
      } else if (item.audioUrl !== expectedAudioUrl(item)) {
        error(item.id, `audioUrl must be ${expectedAudioUrl(item)}`);
      } else if (!SKIP_ASSETS && !(await exists(item.audioUrl))) {
        error(item.id, `referenced audio file is missing: public${item.audioUrl}`);
      }
    } else if (item.audioUrl) {
      error(item.id, "see-word item must not declare audioUrl");
    }
  }

  if (!languages.has("en") || !languages.has("fil")) errors.push("bank must represent English and Filipino");
  for (const format of FORMATS) {
    if (!formats.has(format)) errors.push(`bank must represent ${format}`);
  }
  if (bands.size < 5) errors.push("difficulty coverage is concentrated; all five broad bands are required");

  if (errors.length > 0) {
    console.error(`Item validation failed with ${errors.length} issue(s):`);
    for (const message of errors) console.error(`- ${message}`);
    process.exitCode = 1;
    return;
  }

  console.log(`Item validation passed: ${itemBank.length} items${SKIP_ASSETS ? " (asset check skipped)" : ""}.`);
}

main().catch((failure: unknown) => {
  console.error(failure instanceof Error ? failure.message : failure);
  process.exitCode = 1;
});
