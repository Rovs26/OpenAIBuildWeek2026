// Runtime text-to-speech proxy. Keeps ELEVENLABS_SK server-side (RULES §7 —
// the secret must never reach a client component). The child path fetches
// /api/tts?text=...&lang=... to voice a prompt.
//
// Filipino: `eleven_multilingual_v2` reads Tagalog/Filipino text natively, so a
// single multilingual-capable VOICE_ID handles both en and fil items. Pick that
// kind of voice in .env (VOICE_ID).
//
// Fail-soft contract: anything other than 200+audio is treated by the client as
// "no audio" — the session continues silently, never errors (RULES §6).

const MODEL_ID = "eleven_multilingual_v2";
const TTS_ENDPOINT = "https://api.elevenlabs.io/v1/text-to-speech";

export async function GET(request: Request) {
  const text = (new URL(request.url).searchParams.get("text") ?? "").slice(0, 300);
  const apiKey = process.env.ELEVENLABS_SK;
  const voiceId = process.env.VOICE_ID;

  if (!text || !apiKey || !voiceId) {
    return new Response(null, { status: 204 }); // nothing to say / not configured
  }

  try {
    const res = await fetch(
      `${TTS_ENDPOINT}/${voiceId}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "content-type": "application/json",
          accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text,
          model_id: MODEL_ID,
          voice_settings: { stability: 0.5, similarity_boost: 0.85, style: 0.15 },
        }),
      },
    );

    if (!res.ok || !res.body) {
      console.log("[tts] ElevenLabs responded", res.status);
      return new Response(null, { status: 204 });
    }

    // Same (text, voice, model) → identical audio, so cache hard: the browser
    // and P3's service worker can reuse it, keeping repeats off the network.
    return new Response(res.body, {
      status: 200,
      headers: {
        "content-type": "audio/mpeg",
        "cache-control": "public, max-age=31536000, immutable",
      },
    });
  } catch (e) {
    console.log("[tts] request failed, fail-soft:", e);
    return new Response(null, { status: 204 });
  }
}
