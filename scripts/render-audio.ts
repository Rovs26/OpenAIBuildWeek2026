/**
 * Authoring-only batch TTS renderer. The child path never performs runtime TTS.
 */
import { access, mkdir, stat, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { dirname, resolve } from "node:path";
import OpenAI from "openai";
import { itemBank } from "../src/lib/itemBank";

function existsWithContent(path: string): Promise<boolean> {
  return access(path, constants.F_OK)
    .then(() => stat(path))
    .then((entry) => entry.size > 500)
    .catch(() => false);
}

function assetPath(audioUrl: string): string {
  return resolve(process.cwd(), "public", audioUrl.replace(/^\//, ""));
}

const force = process.argv.includes("--force");
const dryRun = process.argv.includes("--dry-run");
const model = process.env.OPENAI_TTS_MODEL ?? "gpt-4o-mini-tts";
const voice = process.env.OPENAI_TTS_VOICE ?? "nova";

async function main(): Promise<void> {
  const audioItems = itemBank.filter(
    (item) => item.format === "hear-word" || item.format === "hear-sentence",
  );
  const summary = { generated: 0, skipped: 0, failed: 0 };
  const apiKey = process.env.OPENAI_API_KEY;

  if (!dryRun && !apiKey) {
    throw new Error("OPENAI_API_KEY is required. Use --dry-run to inspect planned output.");
  }
  const client = apiKey ? new OpenAI({ apiKey }) : null;

  for (const item of audioItems) {
    if (!item.audioUrl) {
      console.error(`[${item.id}] missing audioUrl`);
      summary.failed += 1;
      continue;
    }

    const target = assetPath(item.audioUrl);
    if (!force && await existsWithContent(target)) {
      console.log(`[${item.id}] skipped existing ${item.audioUrl}`);
      summary.skipped += 1;
      continue;
    }
    if (dryRun) {
      console.log(`[${item.id}] would generate ${item.audioUrl}`);
      summary.skipped += 1;
      continue;
    }

    try {
      const speech = await client!.audio.speech.create({
        model,
        voice,
        input: item.prompt,
        response_format: "mp3",
        instructions:
          item.language === "fil"
            ? "Speak slowly, clearly, and warmly to a Filipino six-year-old. Use natural Filipino pronunciation and phrasing."
            : "Speak slowly, clearly, and warmly to a six-year-old child.",
      });
      const bytes = Buffer.from(await speech.arrayBuffer());
      if (bytes.length <= 500) throw new Error("TTS response was unexpectedly small");
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, bytes);
      console.log(`[${item.id}] generated ${item.audioUrl}`);
      summary.generated += 1;
    } catch (error) {
      console.error(`[${item.id}] failed: ${error instanceof Error ? error.message : error}`);
      summary.failed += 1;
    }
  }

  console.log(`generated: ${summary.generated}`);
  console.log(`skipped: ${summary.skipped}`);
  console.log(`failed: ${summary.failed}`);
  if (summary.failed > 0) process.exitCode = 1;
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
