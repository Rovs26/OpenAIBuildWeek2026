/**
 * Authoring-only candidate generator. It never overwrites the approved runtime
 * item bank unless the operator explicitly supplies an output path that does so.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import OpenAI from "openai";
import { itemBank } from "../src/lib/itemBank";
import type { Item } from "../src/lib/types";

type CandidateFile = {
  generatedAt: string;
  source: "dry-run" | "openai";
  items: Item[];
};

function option(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function positiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function assertCandidateShape(value: unknown): asserts value is { items: Item[] } {
  if (!value || typeof value !== "object" || !Array.isArray((value as { items?: unknown }).items)) {
    throw new Error("Model response was not an object with an items array.");
  }
}

const dryRun = process.argv.includes("--dry-run");
const count = positiveInteger(option("--count"), 12);
const destination = resolve(
  process.cwd(),
  option("--output") ?? "scripts/item-candidates.json",
);

async function main(): Promise<void> {
  let items: Item[];
  let source: CandidateFile["source"];

  if (dryRun) {
    // A local fixture makes the authoring command testable with no network.
    items = itemBank.slice(0, Math.min(count, itemBank.length));
    source = "dry-run";
  } else {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is required. Use --dry-run for a local fixture.");
    }

    const client = new OpenAI({ apiKey });
    const model = process.env.OPENAI_ITEM_MODEL ?? "gpt-4o-mini";
    const prompt = `Create ${count} candidate assessment items as JSON. Return exactly an object with an \"items\" array.\n\n` +
      `Every item must conform to this TypeScript contract: { id, format, language, prompt, audioUrl?, choices: [{ id, emoji?, label? }], correctChoiceId, difficulty, discrimination }.\n` +
      `Allowed format: hear-word, hear-sentence, see-word. Allowed language: en, fil.\n` +
      `Audience: Philippines Grades 1-3. Use familiar, age-appropriate concrete vocabulary; 3 or 4 emoji-representable choices; exactly one correct choice; English and Filipino mixed; difficulty spread from -2.5 to 2.5; discrimination 1.2.\n` +
      `For hear-word and hear-sentence use audioUrl /audio/<id>.mp3. Omit audioUrl for see-word.\n` +
      `Do not add fields, markdown, commentary, culturally obscure content, trivia, or ambiguous answers.\n\n` +
      `Few-shot examples:\n` +
      `{ \"id\": \"en-hw-example\", \"format\": \"hear-word\", \"language\": \"en\", \"prompt\": \"cat\", \"audioUrl\": \"/audio/en-hw-example.mp3\", \"choices\": [{\"id\":\"a\",\"emoji\":\"🐱\"},{\"id\":\"b\",\"emoji\":\"🐶\"},{\"id\":\"c\",\"emoji\":\"🐟\"}], \"correctChoiceId\": \"a\", \"difficulty\": -1.5, \"discrimination\": 1.2 }\n` +
      `{ \"id\": \"fil-hs-example\", \"format\": \"hear-sentence\", \"language\": \"fil\", \"prompt\": \"Nasa ilalim ng mesa ang bola.\", \"audioUrl\": \"/audio/fil-hs-example.mp3\", \"choices\": [{\"id\":\"a\",\"emoji\":\"⚽⬇️🪑\"},{\"id\":\"b\",\"emoji\":\"⚽🔝🪑\"},{\"id\":\"c\",\"emoji\":\"⚽↔️🪑\"}], \"correctChoiceId\": \"a\", \"difficulty\": 0.4, \"discrimination\": 1.2 }\n` +
      `{ \"id\": \"en-sw-example\", \"format\": \"see-word\", \"language\": \"en\", \"prompt\": \"book\", \"choices\": [{\"id\":\"a\",\"emoji\":\"📖\"},{\"id\":\"b\",\"emoji\":\"⚽\"},{\"id\":\"c\",\"emoji\":\"🪑\"}], \"correctChoiceId\": \"a\", \"difficulty\": -0.5, \"discrimination\": 1.2 }`;

    const completion = await client.chat.completions.create({
      model,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "You are a careful bilingual elementary assessment item author." },
        { role: "user", content: prompt },
      ],
    });
    const content = completion.choices[0]?.message.content;
    if (!content) throw new Error("OpenAI returned no item content.");
    const candidate = JSON.parse(content) as unknown;
    assertCandidateShape(candidate);
    items = candidate.items;
    source = "openai";
  }

  const output: CandidateFile = {
    generatedAt: new Date().toISOString(),
    source,
    items,
  };
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, `${JSON.stringify(output, null, 2)}\n`, "utf8");
  console.log(`Wrote ${items.length} candidate items to ${destination}`);
  console.log("Review candidates manually before copying any item into src/lib/itemBank.ts.");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
