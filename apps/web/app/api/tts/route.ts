import { NextRequest, NextResponse } from "next/server";

// Google Cloud Text-to-Speech has native Hebrew (he-IL) WaveNet voices, which
// (unlike the Gemini prebuilt voices) read Hebrew correctly and do NOT verbalize
// punctuation in English. Endpoint + key are SEPARATE from the Gemini API:
// this needs a Google Cloud Console API key with the Cloud Text-to-Speech API
// enabled and billing linked — see GOOGLE_CLOUD_TTS_KEY.
const TTS_ENDPOINT = "https://texttospeech.googleapis.com/v1/text:synthesize";

// he-IL WaveNet voices. A = female, B = male, C = neutral fallback (also used
// for non-binary / prefer-not-to-say).
function voiceForGender(gender: string): string {
  const g = gender.toLowerCase().trim();
  if (g === "female" || g === "נקבה" || g === "woman") return "he-IL-Wavenet-A";
  if (g === "male" || g === "זכר" || g === "man") return "he-IL-Wavenet-B";
  return "he-IL-Wavenet-C";
}

// Escape the five XML entities so the cleaned text is safe to embed inside SSML.
function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function POST(req: NextRequest) {
  try {
    const { text, gender } = await req.json();
    const apiKey = process.env.GOOGLE_CLOUD_TTS_KEY;
    if (!apiKey) return NextResponse.json({ error: "Missing GOOGLE_CLOUD_TTS_KEY" }, { status: 401 });
    if (!text) return NextResponse.json({ error: "Missing text" }, { status: 400 });

    const voice = voiceForGender(String(gender ?? ""));
    console.log("[TTS] gender received:", gender, "→ voice:", voice);
    console.log("TTS TEXT:", text);

    // The narration is 100% Hebrew by design. Google TTS otherwise verbalizes
    // stray characters aloud ("סוגר שמאלי", "נקודה", single letters like "g"),
    // so we aggressively strip everything that is not Hebrew, a digit, a space,
    // or sentence punctuation, then clean up the debris. Order matters: strip
    // first, whitelist as a safety net, then normalise the leftover punctuation.
    const cleanText = String(text)
      .replace(/[A-Za-z]/g, "")             // ALL Latin letters, incl. single ones
      .replace(/[()[\]{}<>]/g, "")          // brackets / parentheses
      .replace(/[*#@~^|\\/_=+]/g, "")       // other symbols that get verbalized
      .replace(/[—–]/g, ",")                // em/en dash → comma
      .replace(/[^֐-׿0-9\s.,?!]/g, "") // whitelist: keep only Hebrew, digits, space, . , ? !
      .replace(/\.{2,}/g, ".")              // collapse .. / ... → .
      .replace(/\s*\.\s*\./g, ".")          // ". ." spacing variants → .
      .replace(/([?!])\s*\./g, "$1")        // drop stray "." after ? or !
      .replace(/([.,?!])[\s.,?!]*([.,?!])/g, "$1") // collapse clustered/orphaned punctuation runs
      .replace(/\s+([.,?!])/g, "$1")        // remove space before punctuation
      .replace(/^[\s.,?!]+/, "")            // drop leading punctuation left after stripping
      .replace(/\s+/g, " ")                 // squeeze whitespace
      .trim();
    console.log("TTS CLEANED:", cleanText);

    // Wrap in SSML with a prosody envelope for a flat, calm, monotone delivery:
    // slightly slower rate and a lowered, narrowed pitch.
    const ssml =
      `<speak><prosody rate="0.9" pitch="-2st">${escapeXml(cleanText)}</prosody></speak>`;
    console.log("TTS SSML SENT:", ssml.substring(0, 180));

    const requestBody = JSON.stringify({
      input: { ssml },
      voice: { languageCode: "he-IL", name: voice },
      audioConfig: { audioEncoding: "MP3" },
    });

    // Cloud TTS can intermittently return 5xx (or a 200 with no audio). Retry up
    // to 3 times with an 800ms wait between attempts before giving up.
    let lastError = "TTS error";
    for (let n = 1; n <= 3; n++) {
      console.log(`TTS attempt ${n}/3`);

      const res = await fetch(TTS_ENDPOINT + "?key=" + apiKey, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: requestBody,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        lastError = (err as { error?: { message?: string } })?.error?.message ?? `TTS error (HTTP ${res.status})`;
      } else {
        const data = await res.json();
        const audioB64 = data.audioContent;
        if (audioB64) {
          // Same response shape as before so result/page.tsx needs no changes:
          // it builds `data:${mimeType};base64,${audio}` and plays it.
          return NextResponse.json({ audio: audioB64, mimeType: "audio/mp3" });
        }
        lastError = "No audio returned";
      }

      // Wait before the next attempt (skip after the final one).
      if (n < 3) await new Promise((r) => setTimeout(r, 800));
    }

    return NextResponse.json({ error: lastError }, { status: 502 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
