import { NextRequest, NextResponse } from "next/server";

const TTS_MODEL = "gemini-2.5-flash-preview-tts";

function voiceForGender(gender: string): string {
  const g = gender.toLowerCase();
  if (g === "female") return "Kore";
  if (g === "male") return "Charon";
  return "Fenrir";
}

export async function POST(req: NextRequest) {
  try {
    const { text, gender } = await req.json();
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "Missing API key" }, { status: 401 });
    if (!text) return NextResponse.json({ error: "Missing text" }, { status: 400 });

    const voice = voiceForGender(String(gender ?? ""));

    const res = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/" + TTS_MODEL + ":generateContent?key=" + apiKey,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text }] }],
          generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: {
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
