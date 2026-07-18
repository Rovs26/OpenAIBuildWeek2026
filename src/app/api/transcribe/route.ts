import { NextRequest, NextResponse } from "next/server";
import OpenAI, { toFile } from "openai";
import type { SpeakingResult } from "@/lib/types";

// POST /api/transcribe — multipart form: { audio: Blob, targetText: string, language?: "en" | "fil" }
// Transcribes via OpenAI whisper-1, computes wordMatchPct (in-order greedy match),
// and returns { speaking: SpeakingResult }. On ANY failure returns 200 { speaking: null }
// so the child path never sees a 500 (RULES §6).

export const runtime = "nodejs";
export const maxDuration = 30;

const TIMEOUT_MS = 15_000;

// Lowercase, strip punctuation, collapse whitespace, split into words.
function normalizeWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

// % of target words found in the transcript, in order (greedy two-pointer).
function computeWordMatchPct(targetText: string, transcript: string): number {
  const target = normalizeWords(targetText);
  const said = normalizeWords(transcript);
  if (target.length === 0) return 0;

  let matched = 0;
  let j = 0;
  for (let i = 0; i < target.length; i++) {
    while (j < said.length && said[j] !== target[i]) j++;
    if (j < said.length) {
      matched++;
      j++;
    }
  }
  return Math.round((matched / target.length) * 100);
}

function nullResponse() {
  // Frozen contract has no null speaking, but the child path expects a soft skip.
  return NextResponse.json({ speaking: null }, { status: 200 });
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.warn("[transcribe] OPENAI_API_KEY missing — returning null shape");
      return nullResponse();
    }

    const form = await req.formData();
    const audio = form.get("audio");
    const targetText = String(form.get("targetText") ?? "");
    const language = String(form.get("language") ?? "en");

    if (!(audio instanceof Blob) || audio.size === 0 || !targetText) {
      console.warn("[transcribe] missing audio or targetText — returning null shape");
      return nullResponse();
    }

    const openai = new OpenAI({ apiKey });

    const bytes = Buffer.from(await audio.arrayBuffer());
    const file = await toFile(bytes, "speech.webm", { type: "audio/webm" });

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    let transcript = "";
    try {
      const result = await openai.audio.transcriptions.create(
        {
          file,
          model: "whisper-1",
          // whisper-1 language expects ISO-639-1; map fil → tl (Tagalog).
          language: language === "fil" ? "tl" : "en",
          response_format: "text",
        },
        { signal: controller.signal }
      );
      transcript = typeof result === "string" ? result : String(result ?? "");
    } finally {
      clearTimeout(timer);
    }

    const wordMatchPct = computeWordMatchPct(targetText, transcript);

    const speaking: SpeakingResult = {
      targetText,
      transcript: transcript.trim(),
      wordMatchPct,
      audioUrl: "",
    };

    return NextResponse.json({ speaking }, { status: 200 });
  } catch (err) {
    console.error("[transcribe] failed — returning null shape", err);
    return nullResponse();
  }
}
