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

    // Hebrew style instruction: tells the model to read in a flat, monotone,
    // unemotional voice AND — the key fix — not to read punctuation marks aloud
    // (the English-first prebuilt voices otherwise verbalize "question mark").
    const STYLE = "קרא את הטקסט הבא בעברית בנימה שטוחה ומונוטונית, ללא רגש וללא הדגשות. דבר לאט וברוגע. אל תקרא סימני פיסוק בקול. ";
    const promptText = STYLE + cleanText;
    // This is what actually goes into the request body (contents[0].parts[0].text).
    // Note: the "TTS CLEANED" log above prints cleanText BEFORE the STYLE prefix,
    // so seeing the monologue there is expected — it is not the sent value.
    console.log("TTS FINAL SENT:", promptText.substring(0, 150));

    // Gemini TTS intermittently returns 500s (or a 200 with no audio). Retry up
    // to 3 times with an 800ms wait between attempts before giving up.
    const requestBody = JSON.stringify({
      contents: [{ role: "user", parts: [{ text: promptText }] }],
      generationConfig: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          languageCode: "he-IL",
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice },
          },
        },
      },
    });

    let lastError = "TTS error";
    for (let n = 1; n <= 3; n++) {
      console.log(`TTS attempt ${n}/3`);

      const res = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/" + TTS_MODEL + ":generateContent?key=" + apiKey,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: requestBody,
        }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        lastError = (err as { error?: { message?: string } })?.error?.message ?? `TTS error (HTTP ${res.status})`;
      } else {
        const data = await res.json();
        const part = data.candidates?.[0]?.content?.parts?.[0];
        const audioB64 = part?.inlineData?.data;
        const mimeType = part?.inlineData?.mimeType ?? "audio/wav";
        if (audioB64) {
          return NextResponse.json({ audio: audioB64, mimeType });
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
