import { NextRequest, NextResponse } from "next/server";

const TTS_MODEL = "gemini-2.5-flash-preview-tts";

function voiceForGender(gender: string): string {
  const g = gender.toLowerCase().trim();
  if (g === "female" || g === "נקבה" || g === "woman") return "Kore";
  if (g === "male" || g === "זכר" || g === "man") return "Charon";
  // non-binary / prefer not to say / other / אחר → neutral
  return "Fenrir";
}

export async function POST(req: NextRequest) {
  try {
    const { text, gender } = await req.json();
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "Missing API key" }, { status: 401 });
    if (!text) return NextResponse.json({ error: "Missing text" }, { status: 400 });

    const voice = voiceForGender(String(gender ?? ""));
    console.log("[TTS] gender received:", gender, "→ voice:", voice);
    console.log("TTS TEXT:", text);

    // Gemini TTS verbalizes runs of punctuation ("..", "...") as "dot dot dot".
    // Collapse repeated periods, normalise ". ." spacing, turn dashes into
    // commas, and squeeze whitespace so only clean sentence punctuation remains.
    const cleanText = String(text)
      .replace(/\.{2,}/g, ".")      // collapse .. and ... into single .
      .replace(/\s*\.\s*\./g, ".")  // handle ". ." spacing variants
      .replace(/([?!])\s*\./g, "$1") // drop a stray "." after ? or ! (thought ending in ? then joined with ". ")
      .replace(/[—–]/g, ",")        // em/en dash to comma
      .replace(/\s+/g, " ")
      .trim();
    console.log("TTS CLEANED:", cleanText);

    const res = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/" + TTS_MODEL + ":generateContent?key=" + apiKey,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: cleanText }] }],
          generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              languageCode: "he-IL",
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: voice },
              },
            },
          },
        }),
      }
    );

    if (!res.ok) {
      const err = await res.json();
      return NextResponse.json({ error: err?.error?.message ?? "TTS error" }, { status: 502 });
    }

    const data = await res.json();
    const part = data.candidates?.[0]?.content?.parts?.[0];
    const audioB64 = part?.inlineData?.data;
    const mimeType = part?.inlineData?.mimeType ?? "audio/wav";

    if (!audioB64) {
      return NextResponse.json({ error: "No audio returned" }, { status: 500 });
    }

    return NextResponse.json({ audio: audioB64, mimeType });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
