/** Keeps the service-worker precache manifest derived from the approved bank. */
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { itemBank } from "../src/lib/itemBank";

const manifestPath = resolve(process.cwd(), "public/audio-manifest.json");
const audioUrls = itemBank
  .filter((item) => item.format === "hear-word" || item.format === "hear-sentence")
  .map((item) => item.audioUrl)
  .filter((url): url is string => Boolean(url));
const contents = `${JSON.stringify(audioUrls, null, 2)}\n`;

async function main(): Promise<void> {
  if (process.argv.includes("--check")) {
    const current = await readFile(manifestPath, "utf8");
    if (current !== contents) {
      throw new Error("public/audio-manifest.json is stale; run this command without --check.");
    }
    console.log(`Audio manifest is current: ${audioUrls.length} files.`);
    return;
  }

  await writeFile(manifestPath, contents, "utf8");
  console.log(`Wrote ${audioUrls.length} audio URLs to public/audio-manifest.json.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
