import { NextRequest, NextResponse } from "next/server";

const GEMINI_MODEL = "gemini-2.5-flash";

const SYSTEM_PROMPT = `You are a precise simulation engine that recreates the internal experience of an autistic person in a given situation.

Your output is grounded in peer-reviewed autism research, first-person autistic accounts, and sensory processing theory.

Return ONLY valid JSON with no markdown, no explanation, no code fences.`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, age, gender, situation } = body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) return NextResponse.json({ error: "Missing API key" }, { status: 401 });

    const prompt = `Simulate the internal autistic experience for:
Name: ${name}, Age: ${age}, Gender: ${gender}
Situation: "${situation}"

Return this exact JSON:
{
  "sensory_scores": { "auditory": 0, "visual": 0, "tactile": 0, "social": 0 },
  "overall_load": 0,
  "visual_effect": "glitch_heavy",
  "scene_caption": "first person caption",
  "monologue": ["thought1","thought2","thought3","thought4","thought5","thought6","thought7","thought8"],
  "sensory_channels": { "auditory": "description", "visual": "description", "tactile": "description", "interoception": "description" },
  "emotions": ["emotion1","emotion2","emotion3"],
  "coping_actions": ["action1","action2","action3"],
  "masking_cost": "description",
  "research_tags": ["tag1","tag2"]
}`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          
          contents: [{ role: "user", parts: [{ text: SYSTEM_PROMPT + "\n\n" + prompt }] }],
          generationConfig: { temperature: 0.8, maxOutputTokens: 2048, responseMimeType: "application/json" }
        })
      }
    );

    if (!res.ok) {
      const err = await res.json();
      return NextResponse.json({ error: err?.error?.message ?? "Gemini error" }, { status: 502 });
    }

    const data = await res.json();
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
    return NextResponse.json(JSON.parse(cleaned));
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
